import { useEffect, useMemo, useState } from "react"
import {
  CircleMinus,
  CirclePlus,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

const AJUSTE_INICIAL = {
  tipo: "acrescimo",
  descricao: "",
  valor: "",
}

export default function FecharComandaModal({
  comanda,
  nomeMesa,
  aoFechar,
  aoFinalizar,
}) {
  const [itens, setItens] = useState([])
  const [ajustes, setAjustes] = useState([])

  const [formularioAjuste, setFormularioAjuste] =
    useState(AJUSTE_INICIAL)

  const [quantidadePessoas, setQuantidadePessoas] =
    useState(
      Math.max(
        Number(comanda.quantidade_pessoas ?? 1),
        1
      )
    )

  const [carregando, setCarregando] = useState(true)
  const [salvandoAjuste, setSalvandoAjuste] =
    useState(false)

  const [fechandoConta, setFechandoConta] =
    useState(false)

  const [removendoAjuste, setRemovendoAjuste] =
    useState(null)

  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarDados()
  }, [comanda.id])

  async function carregarDados() {
    setCarregando(true)
    setErro("")

    try {
      const [resultadoItens, resultadoAjustes] =
        await Promise.all([
          supabase
            .from("comanda_itens")
            .select(`
              id,
              produto_id,
              quantidade,
              preco_unitario,
              subtotal,
              observacao,
              produtos (
                id,
                nome
              )
            `)
            .eq("comanda_id", comanda.id)
            .order("criado_em", {
              ascending: true,
            }),

          supabase
            .from("comanda_ajustes")
            .select("*")
            .eq("comanda_id", comanda.id)
            .order("criado_em", {
              ascending: true,
            }),
        ])

      if (resultadoItens.error) {
        throw resultadoItens.error
      }

      if (resultadoAjustes.error) {
        throw resultadoAjustes.error
      }

      setItens(resultadoItens.data ?? [])
      setAjustes(resultadoAjustes.data ?? [])
    } catch (erroCarregamento) {
      console.error(
        "Erro ao carregar fechamento:",
        erroCarregamento
      )

      setErro(
        "Não foi possível carregar os dados da conta."
      )
    } finally {
      setCarregando(false)
    }
  }

  function atualizarCampoAjuste(evento) {
    const { name, value } = evento.target

    setFormularioAjuste((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  async function adicionarAjuste(evento) {
    evento.preventDefault()

    setErro("")
    setMensagem("")

    const descricao =
      formularioAjuste.descricao.trim()

    const valor = converterValorParaNumero(
      formularioAjuste.valor
    )

    if (!descricao) {
      setErro("Informe a descrição do ajuste.")
      return
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      setErro(
        "Informe um valor maior que zero para o ajuste."
      )
      return
    }

    setSalvandoAjuste(true)

    try {
      const { error } = await supabase
        .from("comanda_ajustes")
        .insert({
          comanda_id: comanda.id,
          tipo: formularioAjuste.tipo,
          descricao,
          valor,
        })

      if (error) {
        throw error
      }

      setFormularioAjuste(AJUSTE_INICIAL)
      setMensagem("Ajuste adicionado com sucesso.")

      await carregarDados()
    } catch (erroAjuste) {
      console.error(
        "Erro ao adicionar ajuste:",
        erroAjuste
      )

      setErro(
        "Não foi possível adicionar o ajuste."
      )
    } finally {
      setSalvandoAjuste(false)
    }
  }

  async function removerAjuste(ajuste) {
    const confirmado = window.confirm(
      `Deseja remover o ajuste “${ajuste.descricao}”?`
    )

    if (!confirmado) return

    setErro("")
    setMensagem("")
    setRemovendoAjuste(ajuste.id)

    try {
      const { error } = await supabase
        .from("comanda_ajustes")
        .delete()
        .eq("id", ajuste.id)

      if (error) {
        throw error
      }

      setMensagem("Ajuste removido.")
      await carregarDados()
    } catch (erroRemocao) {
      console.error(
        "Erro ao remover ajuste:",
        erroRemocao
      )

      setErro(
        "Não foi possível remover o ajuste."
      )
    } finally {
      setRemovendoAjuste(null)
    }
  }

  function diminuirPessoas() {
    setQuantidadePessoas((anterior) =>
      Math.max(anterior - 1, 1)
    )
  }

  function aumentarPessoas() {
    setQuantidadePessoas((anterior) =>
      Math.min(anterior + 1, 100)
    )
  }

  function alterarQuantidadePessoas(evento) {
    const valor = Number(evento.target.value)

    if (!Number.isFinite(valor)) {
      setQuantidadePessoas(1)
      return
    }

    setQuantidadePessoas(
      Math.min(Math.max(Math.trunc(valor), 1), 100)
    )
  }

  async function fecharConta() {
    setErro("")
    setMensagem("")

    if (itens.length === 0) {
      setErro(
        "Não é possível fechar uma comanda sem produtos."
      )
      return
    }

    const confirmado = window.confirm(
      `Confirma o fechamento da conta da ${nomeMesa} no valor de ${formatarMoeda(
        totalFinal
      )}?`
    )

    if (!confirmado) return

    setFechandoConta(true)

    try {
      const agora = new Date().toISOString()

      const { error: erroComanda } = await supabase
        .from("comandas")
        .update({
          status: "fechada",
          subtotal_consumo: subtotalConsumo,
          total: subtotalConsumo,
          total_acrescimos: totalAcrescimos,
          total_descontos: totalDescontos,
          total_final: totalFinal,
          quantidade_pessoas: quantidadePessoas,
          valor_por_pessoa: valorPorPessoa,
          fechada_em: agora,
        })
        .eq("id", comanda.id)
        .eq("status", "aberta")

      if (erroComanda) {
        throw erroComanda
      }

      const { error: erroMesa } = await supabase
        .from("mesas")
        .update({
          status: "livre",
        })
        .eq("id", comanda.mesa_id)

      if (erroMesa) {
        throw erroMesa
      }

      if (aoFinalizar) {
        await aoFinalizar()
      }
    } catch (erroFechamento) {
      console.error(
        "Erro ao fechar conta:",
        erroFechamento
      )

      setErro(
        "Não foi possível fechar a conta."
      )
    } finally {
      setFechandoConta(false)
    }
  }

  const subtotalConsumo = useMemo(() => {
    return itens.reduce((total, item) => {
      const subtotal =
        item.subtotal ??
        Number(item.quantidade ?? 0) *
          Number(item.preco_unitario ?? 0)

      return total + Number(subtotal)
    }, 0)
  }, [itens])

  const totalAcrescimos = useMemo(() => {
    return ajustes
      .filter(
        (ajuste) => ajuste.tipo === "acrescimo"
      )
      .reduce(
        (total, ajuste) =>
          total + Number(ajuste.valor ?? 0),
        0
      )
  }, [ajustes])

  const totalDescontos = useMemo(() => {
    return ajustes
      .filter(
        (ajuste) => ajuste.tipo === "desconto"
      )
      .reduce(
        (total, ajuste) =>
          total + Number(ajuste.valor ?? 0),
        0
      )
  }, [ajustes])

  const totalFinal = Math.max(
    subtotalConsumo +
      totalAcrescimos -
      totalDescontos,
    0
  )

  const valorPorPessoa =
    quantidadePessoas > 0
      ? totalFinal / quantidadePessoas
      : totalFinal

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 p-0 sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-slate-950 sm:h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-slate-700">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              Fechar conta
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {nomeMesa}
              {comanda.cliente
                ? ` • Cliente: ${comanda.cliente}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            disabled={fechandoConta}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </header>

        {carregando ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <RefreshCw
              size={21}
              className="mr-2 animate-spin"
            />

            Carregando conta...
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_400px]">
            <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
              {erro && (
                <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {erro}
                </div>
              )}

              {mensagem && (
                <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {mensagem}
                </div>
              )}

              <section>
                <div className="flex items-center gap-2">
                  <ReceiptText
                    size={20}
                    className="text-orange-400"
                  />

                  <h3 className="font-bold text-white">
                    Consumo da mesa
                  </h3>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  {itens.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      Nenhum produto lançado.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {itens.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1fr_auto] gap-4 p-4"
                        >
                          <div>
                            <p className="font-semibold text-white">
                              {item.quantidade}x{" "}
                              {item.produtos?.nome ??
                                "Produto não encontrado"}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {formatarMoeda(
                                item.preco_unitario
                              )}{" "}
                              cada
                            </p>

                            {item.observacao && (
                              <p className="mt-2 text-xs text-amber-300">
                                {item.observacao}
                              </p>
                            )}
                          </div>

                          <strong className="text-emerald-300">
                            {formatarMoeda(
                              item.subtotal ??
                                Number(
                                  item.quantidade
                                ) *
                                  Number(
                                    item.preco_unitario
                                  )
                            )}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-7">
                <h3 className="font-bold text-white">
                  Acréscimos e descontos
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Inclua cobranças adicionais ou descontos
                  concedidos.
                </p>

                <form
                  onSubmit={adicionarAjuste}
                  className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[150px_1fr_150px_auto]"
                >
                  <select
                    name="tipo"
                    value={formularioAjuste.tipo}
                    onChange={atualizarCampoAjuste}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-orange-500"
                  >
                    <option value="acrescimo">
                      Acréscimo
                    </option>

                    <option value="desconto">
                      Desconto
                    </option>
                  </select>

                  <input
                    type="text"
                    name="descricao"
                    value={
                      formularioAjuste.descricao
                    }
                    onChange={atualizarCampoAjuste}
                    placeholder="Ex.: copo quebrado"
                    maxLength={150}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
                  />

                  <input
                    type="text"
                    inputMode="decimal"
                    name="valor"
                    value={formularioAjuste.valor}
                    onChange={atualizarCampoAjuste}
                    placeholder="R$ 0,00"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
                  />

                  <button
                    type="submit"
                    disabled={salvandoAjuste}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                  >
                    {formularioAjuste.tipo ===
                    "acrescimo" ? (
                      <CirclePlus size={18} />
                    ) : (
                      <CircleMinus size={18} />
                    )}

                    {salvandoAjuste
                      ? "Salvando..."
                      : "Adicionar"}
                  </button>
                </form>

                {ajustes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {ajustes.map((ajuste) => (
                      <div
                        key={ajuste.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {ajuste.descricao}
                          </p>

                          <p
                            className={`mt-1 text-xs font-semibold ${
                              ajuste.tipo ===
                              "acrescimo"
                                ? "text-orange-300"
                                : "text-blue-300"
                            }`}
                          >
                            {ajuste.tipo ===
                            "acrescimo"
                              ? "Acréscimo"
                              : "Desconto"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <strong
                            className={
                              ajuste.tipo ===
                              "acrescimo"
                                ? "text-orange-300"
                                : "text-blue-300"
                            }
                          >
                            {ajuste.tipo ===
                            "acrescimo"
                              ? "+"
                              : "-"}{" "}
                            {formatarMoeda(
                              ajuste.valor
                            )}
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              removerAjuste(ajuste)
                            }
                            disabled={
                              removendoAjuste ===
                              ajuste.id
                            }
                            className="rounded-lg p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {removendoAjuste ===
                            ajuste.id ? (
                              <RefreshCw
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </main>

            <aside className="flex min-h-0 flex-col border-t border-slate-800 bg-slate-900 lg:border-l lg:border-t-0">
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <h3 className="font-bold text-white">
                  Resumo da conta
                </h3>

                <div className="mt-5 space-y-4">
                  <LinhaResumo
                    titulo="Consumo"
                    valor={subtotalConsumo}
                  />

                  <LinhaResumo
                    titulo="Acréscimos"
                    valor={totalAcrescimos}
                    prefixo="+"
                    classeValor="text-orange-300"
                  />

                  <LinhaResumo
                    titulo="Descontos"
                    valor={totalDescontos}
                    prefixo="-"
                    classeValor="text-blue-300"
                  />
                </div>

                <div className="my-5 border-t border-slate-800" />

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">
                    Total final
                  </span>

                  <strong className="text-3xl text-emerald-300">
                    {formatarMoeda(totalFinal)}
                  </strong>
                </div>

                <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-center gap-2">
                    <Users
                      size={19}
                      className="text-orange-400"
                    />

                    <p className="font-semibold text-white">
                      Dividir a conta
                    </p>
                  </div>

                  <p className="mt-1 text-sm text-slate-400">
                    Informe quantas pessoas irão dividir o
                    total.
                  </p>

                  <div className="mt-4 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={diminuirPessoas}
                      disabled={
                        quantidadePessoas <= 1
                      }
                      className="rounded-l-xl border border-slate-700 p-3 text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                    >
                      <Minus size={18} />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quantidadePessoas}
                      onChange={
                        alterarQuantidadePessoas
                      }
                      className="h-[50px] w-20 border-y border-slate-700 bg-slate-950 text-center text-xl font-bold text-white outline-none"
                    />

                    <button
                      type="button"
                      onClick={aumentarPessoas}
                      disabled={
                        quantidadePessoas >= 100
                      }
                      className="rounded-r-xl border border-slate-700 p-3 text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="mt-5 text-center">
                    <p className="text-sm text-slate-400">
                      Valor por pessoa
                    </p>

                    <strong className="mt-1 block text-2xl text-orange-300">
                      {formatarMoeda(valorPorPessoa)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 bg-slate-950/50 p-5">
                <button
                  type="button"
                  onClick={fecharConta}
                  disabled={
                    fechandoConta ||
                    itens.length === 0
                  }
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fechandoConta
                    ? "Fechando conta..."
                    : `Fechar conta — ${formatarMoeda(
                        totalFinal
                      )}`}
                </button>

                <button
                  type="button"
                  onClick={aoFechar}
                  disabled={fechandoConta}
                  className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Voltar
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function LinhaResumo({
  titulo,
  valor,
  prefixo = "",
  classeValor = "text-white",
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">
        {titulo}
      </span>

      <strong className={classeValor}>
        {prefixo && Number(valor) > 0
          ? `${prefixo} `
          : ""}
        {formatarMoeda(valor)}
      </strong>
    </div>
  )
}

function converterValorParaNumero(valor) {
  const texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace("R$", "")

  if (!texto) {
    return Number.NaN
  }

  if (texto.includes(",")) {
    return Number(
      texto.replace(/\./g, "").replace(",", ".")
    )
  }

  return Number(texto)
}

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  )
}