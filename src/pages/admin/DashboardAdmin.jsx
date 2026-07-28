import { useEffect, useMemo, useState } from "react"
import {
  Armchair,
  Banknote,
  CircleDollarSign,
  Clock3,
  ClipboardList,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import Sidebar from "../../components/layout/Sidebar"
import Header from "../../components/layout/Header"
import MesasPage from "./MesasPage"
import ProdutosPage from "./ProdutosPage"
import UsuariosPage from "./UsuariosPage"
import ComandasPage from "./ComandasPage"
import CategoriasPage from "./CategoriasPage"
import { supabase } from "../../lib/supabase"

export default function DashboardAdmin() {
  const [paginaAtiva, setPaginaAtiva] = useState("dashboard")

  const titulos = {
    dashboard: "Dashboard",
    usuarios: "Usuários",
    mesas: "Mesas",
    produtos: "Produtos",
    categorias: "Categorias",
    comandas: "Comandas",
    relatorios: "Relatórios",
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar paginaAtiva={paginaAtiva} setPaginaAtiva={setPaginaAtiva} />

      <div className="min-w-0 flex-1">
        <Header titulo={titulos[paginaAtiva] ?? "Santo Espetinho"} />

        <main className="p-4 text-white md:p-6">
          {paginaAtiva === "dashboard" && (
            <DashboardResumo setPaginaAtiva={setPaginaAtiva} />
          )}

          {paginaAtiva === "usuarios" && <UsuariosPage />}
          {paginaAtiva === "mesas" && <MesasPage />}
          {paginaAtiva === "produtos" && <ProdutosPage />}
          {paginaAtiva === "categorias" && <CategoriasPage />}
          {paginaAtiva === "comandas" && <ComandasPage />}

          {paginaAtiva === "relatorios" && (
            <PaginaTemporaria texto="Relatórios" />
          )}
        </main>
      </div>
    </div>
  )
}

function DashboardResumo({ setPaginaAtiva }) {
  const [comandas, setComandas] = useState([])
  const [mesas, setMesas] = useState([])
  const [itensHoje, setItensHoje] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)

  useEffect(() => {
    carregarDashboard()

    const intervalo = window.setInterval(() => {
      carregarDashboard(false)
    }, 30000)

    return () => window.clearInterval(intervalo)
  }, [])

  async function carregarDashboard(mostrarCarregamento = true) {
    if (mostrarCarregamento) {
      setCarregando(true)
    }

    setErro("")

    const { inicio, fim } = obterLimitesDoDia()

    try {
      const [
        resultadoComandas,
        resultadoMesas,
        resultadoItens,
      ] = await Promise.all([
        supabase
          .from("comandas")
          .select("*")
          .or(
            `status.eq.aberta,and(fechada_em.gte.${inicio},fechada_em.lt.${fim})`
          )
          .order("aberta_em", { ascending: false }),

        supabase
          .from("mesas")
          .select("*")
          .eq("ativa", true)
          .order("numero", { ascending: true }),

        supabase
          .from("comanda_itens")
          .select(`
            id,
            comanda_id,
            produto_id,
            quantidade,
            preco_unitario,
            subtotal,
            criado_em,
            produtos (
              id,
              nome
            )
          `)
          .gte("criado_em", inicio)
          .lt("criado_em", fim),
      ])

      if (resultadoComandas.error) throw resultadoComandas.error
      if (resultadoMesas.error) throw resultadoMesas.error
      if (resultadoItens.error) throw resultadoItens.error

      setComandas(resultadoComandas.data ?? [])
      setMesas(resultadoMesas.data ?? [])
      setItensHoje(resultadoItens.data ?? [])
      setUltimaAtualizacao(new Date())
    } catch (erroCarregamento) {
      console.error("Erro ao carregar dashboard:", erroCarregamento)
      setErro("Não foi possível atualizar os dados do dashboard.")
    } finally {
      setCarregando(false)
    }
  }

  const comandasAbertas = useMemo(
    () => comandas.filter((comanda) => comanda.status === "aberta"),
    [comandas]
  )

  const comandasFechadasHoje = useMemo(
    () => comandas.filter((comanda) => comanda.status === "fechada"),
    [comandas]
  )

  const faturamentoHoje = useMemo(() => {
    return comandasFechadasHoje.reduce(
      (total, comanda) =>
        total + Number(comanda.total_final ?? comanda.total ?? 0),
      0
    )
  }, [comandasFechadasHoje])

  const valorEmAberto = useMemo(() => {
    return comandasAbertas.reduce(
      (total, comanda) =>
        total + Number(comanda.total_final ?? comanda.total ?? 0),
      0
    )
  }, [comandasAbertas])

  const quantidadeItensHoje = useMemo(() => {
    return itensHoje.reduce(
      (total, item) => total + Number(item.quantidade ?? 0),
      0
    )
  }, [itensHoje])

  const produtosMaisPedidos = useMemo(() => {
    const agrupados = new Map()

    itensHoje.forEach((item) => {
      const id = item.produto_id
      const atual = agrupados.get(id) ?? {
        id,
        nome: item.produtos?.nome ?? "Produto não encontrado",
        quantidade: 0,
        valor: 0,
      }

      atual.quantidade += Number(item.quantidade ?? 0)
      atual.valor += Number(
        item.subtotal ??
          Number(item.quantidade ?? 0) *
            Number(item.preco_unitario ?? 0)
      )

      agrupados.set(id, atual)
    })

    return Array.from(agrupados.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)
  }, [itensHoje])

  const mesasOcupadas = useMemo(() => {
    const idsOcupados = new Set(
      comandasAbertas.map((comanda) => comanda.mesa_id)
    )

    return mesas.filter((mesa) => idsOcupados.has(mesa.id))
  }, [mesas, comandasAbertas])

  const taxaOcupacao =
    mesas.length > 0
      ? Math.round((mesasOcupadas.length / mesas.length) * 100)
      : 0

  function encontrarMesa(mesaId) {
    const mesa = mesas.find((item) => item.id === mesaId)

    if (!mesa) return "Mesa não encontrada"

    return `Mesa ${mesa.numero}${mesa.nome ? ` — ${mesa.nome}` : ""}`
  }

  if (carregando) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
        <RefreshCw className="mr-2 animate-spin text-orange-400" size={21} />
        <span className="text-slate-400">Carregando movimento do dia...</span>
      </div>
    )
  }

  return (
    <section>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
            Visão geral
          </p>

          <h2 className="mt-1 text-3xl font-bold text-white">
            Movimento de hoje
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Acompanhe mesas, comandas e vendas em uma única tela.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setPaginaAtiva("comandas")}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            <ShoppingCart size={19} />
            Ir para comandas
          </button>

          <button
            type="button"
            onClick={() => carregarDashboard()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>
      </div>

      {ultimaAtualizacao && (
        <p className="mt-3 text-xs text-slate-500">
          Atualizado às{" "}
          {ultimaAtualizacao.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          . Atualização automática a cada 30 segundos.
        </p>
      )}

      {erro && (
        <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <CardResumo
          titulo="Faturamento hoje"
          valor={formatarMoeda(faturamentoHoje)}
          detalhe={`${comandasFechadasHoje.length} contas fechadas`}
          icone={CircleDollarSign}
          tipo="dinheiro"
        />

        <CardResumo
          titulo="Comandas abertas"
          valor={comandasAbertas.length}
          detalhe={formatarMoeda(valorEmAberto)}
          icone={ReceiptText}
          tipo="aberta"
        />

        <CardResumo
          titulo="Mesas ocupadas"
          valor={`${mesasOcupadas.length}/${mesas.length}`}
          detalhe={`${taxaOcupacao}% de ocupação`}
          icone={Armchair}
          tipo="mesa"
        />

        <CardResumo
          titulo="Itens pedidos hoje"
          valor={quantidadeItensHoje}
          detalhe={`${produtosMaisPedidos.length} produtos em destaque`}
          icone={Package}
          tipo="item"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 2xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                <Armchair size={20} className="text-orange-400" />
                Mesas em atendimento
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Comandas que ainda estão abertas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPaginaAtiva("comandas")}
              className="text-sm font-semibold text-orange-400 transition hover:text-orange-300"
            >
              Ver painel
            </button>
          </div>

          {comandasAbertas.length === 0 ? (
            <EstadoVazio
              icone={ClipboardList}
              titulo="Nenhuma comanda aberta"
              texto="As mesas ocupadas aparecerão aqui."
            />
          ) : (
            <div className="divide-y divide-slate-800">
              {comandasAbertas.slice(0, 8).map((comanda) => (
                <div
                  key={comanda.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-white">
                      {encontrarMesa(comanda.mesa_id)}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <UsersRound size={14} />
                        {comanda.cliente || "Cliente não informado"}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {calcularTempoAberta(comanda.aberta_em)}
                      </span>
                    </div>
                  </div>

                  <strong className="text-lg text-emerald-300">
                    {formatarMoeda(
                      comanda.total_final ?? comanda.total ?? 0
                    )}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <TrendingUp size={20} className="text-emerald-400" />
              Mais pedidos hoje
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Produtos com maior quantidade vendida.
            </p>
          </div>

          {produtosMaisPedidos.length === 0 ? (
            <EstadoVazio
              icone={Package}
              titulo="Sem pedidos hoje"
              texto="Os produtos mais pedidos aparecerão aqui."
            />
          ) : (
            <div className="space-y-4 p-5">
              {produtosMaisPedidos.map((produto, indice) => {
                const maiorQuantidade =
                  produtosMaisPedidos[0]?.quantidade || 1

                const percentual = Math.max(
                  (produto.quantidade / maiorQuantidade) * 100,
                  8
                )

                return (
                  <div key={produto.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {indice + 1}. {produto.nome}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatarMoeda(produto.valor)}
                        </p>
                      </div>

                      <strong className="shrink-0 text-orange-300">
                        {produto.quantidade} un.
                      </strong>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <Banknote size={20} className="text-emerald-400" />
              Últimas contas fechadas
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Fechamentos realizados hoje.
            </p>
          </div>

          <div className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Total: {formatarMoeda(faturamentoHoje)}
          </div>
        </div>

        {comandasFechadasHoje.length === 0 ? (
          <EstadoVazio
            icone={ReceiptText}
            titulo="Nenhuma conta fechada hoje"
            texto="Os fechamentos aparecerão nesta área."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
                  <th className="px-5 py-3">Mesa</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Horário</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {comandasFechadasHoje.slice(0, 10).map((comanda) => (
                  <tr key={comanda.id}>
                    <td className="px-5 py-3 font-semibold text-white">
                      {encontrarMesa(comanda.mesa_id)}
                    </td>

                    <td className="px-5 py-3 text-slate-300">
                      {comanda.cliente || "Não informado"}
                    </td>

                    <td className="px-5 py-3 text-slate-400">
                      {formatarHora(comanda.fechada_em)}
                    </td>

                    <td className="px-5 py-3 text-right font-bold text-emerald-300">
                      {formatarMoeda(
                        comanda.total_final ?? comanda.total ?? 0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function CardResumo({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  tipo,
}) {
  const estilos = {
    dinheiro: {
      icone: "bg-emerald-500/10 text-emerald-300",
      valor: "text-emerald-300",
    },
    aberta: {
      icone: "bg-orange-500/10 text-orange-300",
      valor: "text-orange-300",
    },
    mesa: {
      icone: "bg-sky-500/10 text-sky-300",
      valor: "text-sky-300",
    },
    item: {
      icone: "bg-amber-500/10 text-amber-300",
      valor: "text-amber-300",
    },
  }

  const estilo = estilos[tipo] ?? estilos.aberta

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {titulo}
          </p>

          <p className={`mt-2 text-2xl font-bold sm:text-3xl ${estilo.valor}`}>
            {valor}
          </p>

          <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
        </div>

        <div className={`rounded-2xl p-3 ${estilo.icone}`}>
          <Icone size={24} />
        </div>
      </div>
    </article>
  )
}

function EstadoVazio({ icone: Icone, titulo, texto }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
      <Icone size={36} className="text-slate-600" />
      <p className="mt-3 font-semibold text-slate-300">{titulo}</p>
      <p className="mt-1 text-sm text-slate-500">{texto}</p>
    </div>
  )
}

function PaginaTemporaria({ texto }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-xl font-bold">{texto}</h3>
      <p className="mt-2 text-slate-400">Em construção.</p>
    </div>
  )
}

function obterLimitesDoDia() {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)

  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 1)

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  }
}

function calcularTempoAberta(valor) {
  if (!valor) return "Horário não informado"

  const inicio = new Date(valor).getTime()
  const agora = Date.now()
  const minutos = Math.max(Math.floor((agora - inicio) / 60000), 0)

  if (minutos < 60) {
    return `Aberta há ${minutos}min`
  }

  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60

  return `Aberta há ${horas}h ${String(minutosRestantes).padStart(2, "0")}min`
}

function formatarHora(valor) {
  if (!valor) return "Não informado"

  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}