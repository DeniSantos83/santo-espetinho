import { useEffect, useMemo, useState } from "react"
import {
  Armchair,
  CirclePlus,
  Clock3,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import GerenciarComandaModal from "../../components/comandas/GerenciarComandaModal"

const FORMULARIO_INICIAL = {
  mesa_id: "",
  cliente: "",
  observacoes: "",
}

export default function ComandasPage() {
  const [comandas, setComandas] = useState([])
  const [mesas, setMesas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [itens, setItens] = useState([])

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [modalAberto, setModalAberto] = useState(false)
  const [comandaGerenciada, setComandaGerenciada] = useState(null)
  const [comandaPreConta, setComandaPreConta] = useState(null)

  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState("todas")
  const [agora, setAgora] = useState(Date.now())

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarDados()

    const atualizacao = window.setInterval(() => {
      carregarDados(false)
    }, 30000)

    const relogio = window.setInterval(() => {
      setAgora(Date.now())
    }, 60000)

    return () => {
      window.clearInterval(atualizacao)
      window.clearInterval(relogio)
    }
  }, [])

  async function carregarDados(mostrarCarregamento = true) {
    if (mostrarCarregamento) setCarregando(true)
    setErro("")

    try {
      const [
        resultadoComandas,
        resultadoMesas,
        resultadoUsuarios,
        resultadoItens,
      ] = await Promise.all([
        supabase
          .from("comandas")
          .select("*")
          .eq("status", "aberta")
          .order("aberta_em", { ascending: true }),

        supabase
          .from("mesas")
          .select("*")
          .eq("ativa", true)
          .order("numero", { ascending: true }),

        supabase
          .from("usuarios")
          .select("id, nome"),

        supabase
          .from("comanda_itens")
          .select(`
            id,
            comanda_id,
            produto_id,
            quantidade,
            preco_unitario,
            subtotal,
            observacao,
            criado_em,
            produtos (
              id,
              nome
            )
          `)
          .order("criado_em", { ascending: true }),
      ])

      if (resultadoComandas.error) throw resultadoComandas.error
      if (resultadoMesas.error) throw resultadoMesas.error
      if (resultadoUsuarios.error) throw resultadoUsuarios.error
      if (resultadoItens.error) throw resultadoItens.error

      setComandas(resultadoComandas.data ?? [])
      setMesas(resultadoMesas.data ?? [])
      setUsuarios(resultadoUsuarios.data ?? [])
      setItens(resultadoItens.data ?? [])
    } catch (erroCarregamento) {
      console.error("Erro ao carregar painel do garçom:", erroCarregamento)
      setErro("Não foi possível carregar as mesas e comandas.")
    } finally {
      setCarregando(false)
    }
  }

  async function obterUsuarioAtual() {
    const {
      data: { user },
      error: erroAuth,
    } = await supabase.auth.getUser()

    if (erroAuth || !user) {
      throw new Error("Não foi possível identificar o usuário conectado.")
    }

    const { data: usuario, error: erroUsuario } = await supabase
      .from("usuarios")
      .select("id, nome, perfil, ativo")
      .eq("auth_id", user.id)
      .single()

    if (erroUsuario || !usuario) {
      throw new Error("Perfil do garçom não encontrado.")
    }

    if (usuario.ativo === false) {
      throw new Error("Este usuário está desativado.")
    }

    return usuario
  }

  function abrirNovaComanda(mesaId = "") {
    const primeiraMesa = mesasLivres[0]

    setFormulario({
      ...FORMULARIO_INICIAL,
      mesa_id: mesaId || primeiraMesa?.id || "",
    })
    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return
    setModalAberto(false)
    setFormulario(FORMULARIO_INICIAL)
    setErro("")
  }

  function atualizarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  async function criarComanda(evento) {
    evento.preventDefault()
    setErro("")
    setMensagem("")

    if (!formulario.mesa_id) {
      setErro("Selecione uma mesa.")
      return
    }

    setSalvando(true)

    try {
      const usuario = await obterUsuarioAtual()

      const { data: existente, error: erroConsulta } = await supabase
        .from("comandas")
        .select("id")
        .eq("mesa_id", formulario.mesa_id)
        .eq("status", "aberta")
        .maybeSingle()

      if (erroConsulta) throw erroConsulta

      if (existente) {
        throw new Error("Esta mesa já possui uma comanda aberta.")
      }

      const { data: novaComanda, error: erroComanda } = await supabase
        .from("comandas")
        .insert({
          mesa_id: formulario.mesa_id,
          usuario_id: usuario.id,
          cliente: formulario.cliente.trim() || null,
          observacoes: formulario.observacoes.trim() || null,
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

      if (erroComanda) throw erroComanda

      const { error: erroMesa } = await supabase
        .from("mesas")
        .update({ status: "ocupada" })
        .eq("id", formulario.mesa_id)

      if (erroMesa) {
        console.error("Comanda criada, mas a mesa não foi atualizada:", erroMesa)
      }

      setModalAberto(false)
      setFormulario(FORMULARIO_INICIAL)
      setMensagem("Comanda aberta. Agora lance os pedidos.")
      await carregarDados()

      if (novaComanda) setComandaGerenciada(novaComanda)
    } catch (erroCriacao) {
      console.error("Erro ao abrir comanda:", erroCriacao)
      setErro(
        erroCriacao instanceof Error
          ? erroCriacao.message
          : "Não foi possível abrir a comanda."
      )
    } finally {
      setSalvando(false)
    }
  }

  function obterComandaDaMesa(mesaId) {
    return comandas.find(
      (comanda) =>
        comanda.mesa_id === mesaId && comanda.status === "aberta"
    )
  }

  function obterItens(comandaId) {
    return itens.filter((item) => item.comanda_id === comandaId)
  }

  function quantidadeItens(comandaId) {
    return obterItens(comandaId).reduce(
      (total, item) => total + Number(item.quantidade ?? 0),
      0
    )
  }

  function totalComanda(comandaId) {
    return obterItens(comandaId).reduce((total, item) => {
      const subtotal =
        item.subtotal ??
        Number(item.quantidade ?? 0) *
          Number(item.preco_unitario ?? 0)

      return total + Number(subtotal)
    }, 0)
  }

  function nomeMesa(mesaId) {
    const mesa = mesas.find((item) => item.id === mesaId)
    if (!mesa) return "Mesa"
    return `Mesa ${mesa.numero}${mesa.nome ? ` — ${mesa.nome}` : ""}`
  }

  function nomeGarcom(usuarioId) {
    return usuarios.find((usuario) => usuario.id === usuarioId)?.nome ??
      "Não identificado"
  }

  const idsOcupadas = useMemo(
    () => comandas.map((comanda) => comanda.mesa_id),
    [comandas]
  )

  const mesasLivres = useMemo(
    () =>
      mesas.filter(
        (mesa) =>
          !idsOcupadas.includes(mesa.id) &&
          !mesa.mesa_principal_id &&
          !mesa.grupo_mesas_id &&
          mesa.status !== "reservada"
      ),
    [mesas, idsOcupadas]
  )

  const mesasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return mesas.filter((mesa) => {
      const comanda = obterComandaDaMesa(mesa.id)
      const ocupada = Boolean(comanda || mesa.mesa_principal_id)
      const texto =
        `mesa ${mesa.numero} ${mesa.nome ?? ""} ${comanda?.cliente ?? ""}`.toLowerCase()

      const correspondeBusca = !termo || texto.includes(termo)
      const correspondeFiltro =
        filtro === "todas" ||
        (filtro === "livres" && !ocupada) ||
        (filtro === "ocupadas" && ocupada)

      return correspondeBusca && correspondeFiltro
    })
  }, [mesas, comandas, busca, filtro])

  const valorEmAberto = comandas.reduce(
    (total, comanda) => total + totalComanda(comanda.id),
    0
  )

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
            Atendimento
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Mesas e pedidos
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Toque em uma mesa para abrir a comanda ou lançar produtos.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => carregarDados()}
            disabled={carregando}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-200 disabled:opacity-50 sm:flex-none"
          >
            <RefreshCw
              size={18}
              className={carregando ? "animate-spin" : ""}
            />
            Atualizar
          </button>

          <button
            type="button"
            onClick={() => abrirNovaComanda()}
            disabled={mesasLivres.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-50 sm:flex-none"
          >
            <CirclePlus size={19} />
            Abrir
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
        <Resumo titulo="Livres" valor={mesasLivres.length} />
        <Resumo titulo="Ocupadas" valor={comandas.length} />
        <Resumo titulo="Em aberto" valor={formatarMoeda(valorEmAberto)} compacto />
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:grid-cols-[1fr_190px] sm:p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar mesa ou cliente..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none focus:border-orange-500"
          />
        </div>

        <select
          value={filtro}
          onChange={(evento) => setFiltro(evento.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          <option value="todas">Todas as mesas</option>
          <option value="livres">Mesas livres</option>
          <option value="ocupadas">Mesas ocupadas</option>
        </select>
      </div>

      {erro && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {mensagem}
        </div>
      )}

      {carregando ? (
        <div className="mt-5 flex min-h-60 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
          <RefreshCw size={20} className="mr-2 animate-spin" />
          Carregando salão...
        </div>
      ) : mesasFiltradas.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-slate-400">
          Nenhuma mesa encontrada.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mesasFiltradas.map((mesa) => {
            if (mesa.mesa_principal_id) {
              const principal = obterComandaDaMesa(mesa.mesa_principal_id)

              return (
                <article
                  key={mesa.id}
                  className="rounded-2xl border border-violet-500/30 bg-slate-900 p-5"
                >
                  <p className="text-xs font-bold uppercase text-violet-300">
                    Mesa agrupada
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    Mesa {mesa.numero}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Atendimento junto com {nomeMesa(mesa.mesa_principal_id)}.
                  </p>
                  {principal && (
                    <button
                      type="button"
                      onClick={() => setComandaGerenciada(principal)}
                      className="mt-5 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white"
                    >
                      Lançar pedido
                    </button>
                  )}
                </article>
              )
            }

            const comanda = obterComandaDaMesa(mesa.id)

            if (!comanda) {
              return (
                <article
                  key={mesa.id}
                  className="flex min-h-60 flex-col rounded-2xl border border-emerald-500/30 bg-slate-900 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-300">
                        Livre
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-white">
                        Mesa {mesa.numero}
                      </h3>
                      {mesa.nome && (
                        <p className="text-sm text-slate-400">{mesa.nome}</p>
                      )}
                    </div>
                    <Armchair className="text-emerald-400" size={28} />
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirNovaComanda(mesa.id)}
                    className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white"
                  >
                    <CirclePlus size={18} />
                    Abrir comanda
                  </button>
                </article>
              )
            }

            return (
              <article
                key={mesa.id}
                className="flex min-h-72 flex-col rounded-2xl border border-orange-500/35 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-orange-300">
                      Em atendimento
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-white">
                      Mesa {mesa.numero}
                    </h3>
                  </div>
                  <div className="rounded-xl bg-orange-500/10 p-3 text-orange-300">
                    <ShoppingCart size={24} />
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-slate-300">
                    <UserRound size={16} className="text-slate-500" />
                    {comanda.cliente || "Cliente não informado"}
                  </p>
                  <p className="flex items-center gap-2 text-slate-400">
                    <Clock3 size={16} />
                    {tempoAberta(comanda.aberta_em, agora)}
                  </p>
                  <p className="text-slate-500">
                    Responsável: {nomeGarcom(comanda.usuario_id)}
                  </p>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-slate-800 pt-4">
                  <span className="text-sm text-slate-400">
                    {quantidadeItens(comanda.id)} itens
                  </span>
                  <strong className="text-xl text-emerald-300">
                    {formatarMoeda(totalComanda(comanda.id))}
                  </strong>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => setComandaGerenciada(comanda)}
                    className="rounded-xl bg-orange-600 px-3 py-3 font-bold text-white"
                  >
                    Lançar pedido
                  </button>
                  <button
                    type="button"
                    onClick={() => setComandaPreConta(comanda)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-3 font-semibold text-slate-200"
                  >
                    <ReceiptText size={17} />
                    Pré-conta
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ModalNovaComanda
          formulario={formulario}
          mesas={mesasLivres}
          salvando={salvando}
          erro={erro}
          aoAtualizar={atualizarCampo}
          aoSalvar={criarComanda}
          aoFechar={fecharModal}
        />
      )}

      {comandaGerenciada && (
        <GerenciarComandaModal
          comanda={comandaGerenciada}
          nomeMesa={nomeMesa(comandaGerenciada.mesa_id)}
          aoAtualizar={() => carregarDados(false)}
          aoFechar={async () => {
            setComandaGerenciada(null)
            await carregarDados(false)
          }}
        />
      )}

      {comandaPreConta && (
        <ModalPreConta
          comanda={comandaPreConta}
          mesa={nomeMesa(comandaPreConta.mesa_id)}
          itens={obterItens(comandaPreConta.id)}
          aoFechar={() => setComandaPreConta(null)}
        />
      )}
    </section>
  )
}

function Resumo({ titulo, valor, compacto = false }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-5">
      <p className="text-xs text-slate-500 sm:text-sm">{titulo}</p>
      <p className={`${compacto ? "text-base sm:text-2xl" : "text-2xl sm:text-3xl"} mt-2 font-bold text-white`}>
        {valor}
      </p>
    </div>
  )
}

function ModalNovaComanda({
  formulario,
  mesas,
  salvando,
  erro,
  aoAtualizar,
  aoSalvar,
  aoFechar,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/75 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full rounded-t-3xl border border-slate-700 bg-slate-900 sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-white">Abrir comanda</h2>
            <p className="mt-1 text-sm text-slate-400">
              Escolha a mesa e informe o cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-2 text-slate-400"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={aoSalvar} className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Mesa *</label>
            <select
              name="mesa_id"
              value={formulario.mesa_id}
              onChange={aoAtualizar}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option value="">Selecione</option>
              {mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  Mesa {mesa.numero}{mesa.nome ? ` — ${mesa.nome}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Cliente
            </label>
            <input
              name="cliente"
              value={formulario.cliente}
              onChange={aoAtualizar}
              placeholder="Nome ou identificação"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formulario.observacoes}
              onChange={aoAtualizar}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>

          {erro && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              disabled={salvando}
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {salvando ? "Abrindo..." : "Abrir e lançar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalPreConta({ comanda, mesa, itens, aoFechar }) {
  const total = itens.reduce(
    (soma, item) =>
      soma +
      Number(
        item.subtotal ??
          Number(item.quantidade ?? 0) *
            Number(item.preco_unitario ?? 0)
      ),
    0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-white">Pré-conta</h2>
            <p className="text-sm text-slate-400">{mesa}</p>
          </div>
          <button type="button" onClick={aoFechar} className="p-2 text-slate-400">
            <X size={22} />
          </button>
        </div>

        <div className="p-5 text-white">
          <h3 className="text-center text-xl font-bold">Santo Espetinho</h3>
          <p className="mt-1 text-center text-sm text-slate-400">
            {mesa} • {comanda.cliente || "Cliente não informado"}
          </p>

          <div className="mt-5 divide-y divide-slate-800">
            {itens.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 py-3">
                <div>
                  <p>{item.quantidade}x {item.produtos?.nome || "Produto"}</p>
                  {item.observacao && (
                    <p className="mt-1 text-xs text-slate-400">
                      {item.observacao}
                    </p>
                  )}
                </div>
                <span>
                  {formatarMoeda(
                    item.subtotal ??
                      Number(item.quantidade) *
                        Number(item.preco_unitario)
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-between border-t border-slate-700 pt-4 text-xl font-bold">
            <span>Total</span>
            <span>{formatarMoeda(total)}</span>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Pré-conta sem valor fiscal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-800 p-5 print:hidden">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

function tempoAberta(data, agora) {
  if (!data) return "Horário não informado"
  const minutos = Math.max(
    Math.floor((agora - new Date(data).getTime()) / 60000),
    0
  )

  if (minutos < 60) return `Aberta há ${minutos}min`

  const horas = Math.floor(minutos / 60)
  return `Aberta há ${horas}h ${String(minutos % 60).padStart(2, "0")}min`
}

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}