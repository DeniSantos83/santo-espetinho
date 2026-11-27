import { supabase } from "./supabase"

/** O banco antigo admite só uma comanda aberta por mesa. */
export function funcaoDeComandaNaoInstalada(error) {
  return error?.code === "PGRST202"
}

/**
 * Usa a operação transacional quando instalada.
 * No banco legado, abre SOMENTE a primeira comanda da mesa pelo fluxo anterior.
 * A restrição única da produção continua garantindo isso mesmo com dois garçons.
 */
export async function abrirComandaCompat({
  mesaId, cliente, observacoes, reservaId = null, usuarioId,
}) {
  const { data, error } = await supabase.rpc("abrir_comanda_na_mesa", {
    p_mesa_id: mesaId,
    p_cliente: cliente || null,
    p_observacoes: observacoes || null,
    p_reserva_id: reservaId,
  })
  if (!error) return { comanda: data, modoLegado: false }
  if (!funcaoDeComandaNaoInstalada(error)) throw error

  const { data: mesa, error: erroMesa } = await supabase
    .from("mesas")
    .select("id, ativa, mesa_principal_id, grupo_mesas_id")
    .eq("id", mesaId)
    .single()
  if (erroMesa) throw erroMesa
  if (!mesa?.ativa || mesa.mesa_principal_id || mesa.grupo_mesas_id) {
    throw new Error("Mesa indisponível ou agrupada. Escolha uma mesa ativa sem agrupamento.")
  }

  const { data: existentes, error: erroExistentes } = await supabase
    .from("comandas")
    .select("id")
    .eq("mesa_id", mesaId)
    .eq("status", "aberta")
    .limit(1)
  if (erroExistentes) throw erroExistentes
  if (existentes?.length) {
    throw new Error("Esta mesa já possui uma comanda. Para abrir outra, é necessária a migração do banco.")
  }

  const { data: reservas, error: erroReservas } = await supabase
    .from("reservas_mesas")
    .select("id")
    .eq("mesa_id", mesaId)
    .eq("status", "ativa")
    .limit(1)
  if (erroReservas) throw erroReservas
  if (reservas?.length && (!reservaId || !reservas.some(r => r.id === reservaId))) {
    throw new Error("Mesa reservada. Inicie o atendimento da reserva pela gestão.")
  }

  const { data: comanda, error: erroCriacao } = await supabase
    .from("comandas")
    .insert({
      mesa_id: mesaId,
      usuario_id: usuarioId,
      cliente: cliente || null,
      observacoes: observacoes || null,
      status: "aberta",
      total: 0,
      subtotal_consumo: 0,
      total_acrescimos: 0,
      total_descontos: 0,
      total_final: 0,
      quantidade_pessoas: 1,
      valor_por_pessoa: 0,
      aberta_em: new Date().toISOString(),
    })
    .select()
    .single()
  if (erroCriacao?.code === "23505") {
    throw new Error("Esta mesa já possui uma comanda aberta.")
  }
  if (erroCriacao) throw erroCriacao

  const { error: erroAtualizacao } = await supabase
    .from("mesas").update({ status: "ocupada" }).eq("id", mesaId)
  if (erroAtualizacao) {
    // Já existe uma comanda registrada: não solicitar nova abertura.
    console.error("Comanda criada, mas status da mesa não atualizado:", erroAtualizacao)
  }

  if (reservaId) {
    const { error: erroAtendimento } = await supabase
      .from("reservas_mesas")
      .update({ status: "atendida", atendida_em: new Date().toISOString() })
      .eq("id", reservaId).eq("mesa_id", mesaId).eq("status", "ativa")
    if (erroAtendimento) {
      console.error("Comanda criada, mas reserva não finalizada:", erroAtendimento)
    }
  }

  return { comanda, modoLegado: true }
}
