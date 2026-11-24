import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, RefreshCw, Search, Wifi, X, SlidersHorizontal, CheckCircle2, AlertCircle } from "lucide-react"
import { supabase } from "../../lib/supabase"

const moeda = (valor) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const disponivel = (produto) => produto.ativo && produto.disponivel !== false && produto.categorias?.ativa !== false

export default function CardapioPage() {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoria, setCategoria] = useState("todas")
  const [busca, setBusca] = useState("")
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState("todos")
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState("")
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)

  const carregarDados = useCallback(async (inicial = false) => {
    if (inicial) setCarregando(true)
    else setAtualizando(true)
    try {
      const [resProdutos, resCategorias] = await Promise.all([
        supabase.from("produtos").select("id,nome,descricao,preco,ativo,disponivel,categoria_id,categorias(id,nome,ativa)")
          .eq("ativo", true).order("nome"),
        supabase.from("categorias").select("id,nome,ativa,ordem")
          .eq("ativa", true).order("ordem").order("nome"),
      ])
      if (resProdutos.error) throw resProdutos.error
      if (resCategorias.error) throw resCategorias.error
      setProdutos((resProdutos.data ?? []).filter((item) => item.categorias?.ativa !== false))
      setCategorias(resCategorias.data ?? [])
      setUltimaAtualizacao(new Date())
      setErro("")
    } catch (error) {
      console.error("Falha ao consultar o cardápio:", error)
      setErro("Não foi possível atualizar o cardápio. Confira a conexão e tente novamente.")
    } finally {
      setCarregando(false)
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados(true)
    const atualizarSeVisivel = () => {
      if (document.visibilityState === "visible") carregarDados()
    }
    const interval = window.setInterval(atualizarSeVisivel, 20000)
    window.addEventListener("focus", atualizarSeVisivel)
    document.addEventListener("visibilitychange", atualizarSeVisivel)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", atualizarSeVisivel)
      document.removeEventListener("visibilitychange", atualizarSeVisivel)
    }
  }, [carregarDados])

  const produtosBusca = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    return produtos.filter((p) =>
      (categoria === "todas" || p.categoria_id === categoria) &&
      (!termo || `${p.nome} ${p.descricao ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo))
    ).filter((p) => filtroDisponibilidade === "todos" || (filtroDisponibilidade === "disponiveis" ? disponivel(p) : !disponivel(p)))
      .sort((a,b) => Number(disponivel(b)) - Number(disponivel(a)) || a.nome.localeCompare(b.nome,"pt-BR"))
  }, [produtos,busca,categoria,filtroDisponibilidade])
  const disponiveis = produtos.filter(disponivel).length
  const filtrados = produtosBusca
  const filtrosAtivos = busca.trim() || categoria !== "todas" || filtroDisponibilidade !== "todos"
  const limparFiltros = () => { setBusca(""); setCategoria("todas"); setFiltroDisponibilidade("todos") }

  return (
    <section className="space-y-5 pb-24 sm:pb-8" aria-label="Cardápio para consulta">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Atendimento · Consulta rápida</p>
          <h2 className="mt-2 flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400"><BookOpen size={23}/></span>
            Cardápio
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Consulte os preços e a disponibilidade antes de orientar o cliente. Esta tela não lança pedidos.</p>
        </div>
        <button type="button" disabled={atualizando || carregando} onClick={() => carregarDados()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 disabled:opacity-50">
          <RefreshCw size={17} className={atualizando ? "animate-spin" : ""}/> {atualizando ? "Atualizando..." : "Atualizar cardápio"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-400">Produtos cadastrados</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{produtos.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-300"><CheckCircle2 size={14}/> Disponíveis</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{disponiveis}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:col-span-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-300"><AlertCircle size={14}/> Indisponíveis</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{produtos.length - disponiveis}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4">
        <div className="relative">
          <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" aria-label="Buscar produtos" value={busca} onChange={(e)=>setBusca(e.target.value)} placeholder="Buscar por nome ou descrição..."
            className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15" />
          {busca && <button aria-label="Limpar busca" title="Limpar busca" type="button" onClick={()=>setBusca("")} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18}/></button>}
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><SlidersHorizontal size={15}/> Categorias</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" aria-label="Filtrar por categoria">
            {[{id:"todas",nome:"Todas"},...categorias].map((item)=><button key={item.id} type="button" onClick={()=>setCategoria(item.id)} aria-pressed={categoria===item.id}
              className={`min-h-10 shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${categoria===item.id ? "border-orange-500 bg-orange-600 text-white" : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"}`}>
              {item.nome}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar por disponibilidade">
          {[{id:"todos",nome:"Todos"},{id:"disponiveis",nome:"Disponíveis"},{id:"indisponiveis",nome:"Indisponíveis"}].map(item => (
            <button key={item.id} type="button" aria-pressed={filtroDisponibilidade===item.id} onClick={()=>setFiltroDisponibilidade(item.id)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${filtroDisponibilidade===item.id ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{item.nome}</button>
          ))}
          {filtrosAtivos && <button type="button" onClick={limparFiltros} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-orange-300 hover:bg-orange-500/10"><X size={14}/> Limpar filtros</button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400" aria-live="polite">
        <span><strong className="text-slate-200">{filtrados.length}</strong> {filtrados.length === 1 ? "produto encontrado" : "produtos encontrados"}</span>
        {ultimaAtualizacao && <span className="inline-flex items-center gap-1.5"><Wifi size={14} className="text-emerald-400"/> Atualizado às {ultimaAtualizacao.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
      </div>
      {erro && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">{erro}</div>}
      {carregando ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando cardápio">
          {Array.from({length:6},(_,i)=><div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-7 text-center">
          <Search size={28} className="text-slate-500"/>
          <h3 className="font-semibold text-white">Nenhum produto encontrado</h3>
          <p className="max-w-sm text-sm text-slate-400">Tente outra busca ou remova os filtros para visualizar o cardápio.</p>
          {filtrosAtivos && <button type="button" onClick={limparFiltros} className="min-h-10 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white">Ver todos os produtos</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((produto)=>{
            const estaDisponivel = disponivel(produto)
            return <article key={produto.id} className={`flex min-h-40 flex-col justify-between rounded-2xl border p-4 transition sm:p-5 ${estaDisponivel ? "border-slate-800 bg-slate-900 hover:border-slate-700" : "border-amber-500/25 bg-slate-900/65"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{produto.categorias?.nome ?? "Outros"}</p>
                  <h3 className="text-base font-bold leading-snug text-white">{produto.nome}</h3>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${estaDisponivel ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300"}`}>{estaDisponivel ? "Disponível" : "Indisponível"}</span>
              </div>
              {produto.descricao && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{produto.descricao}</p>}
              <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-800 pt-3">
                <span className="text-xs text-slate-500">Preço unitário</span>
                <strong className="text-xl font-bold tabular-nums text-white">{moeda(produto.preco)}</strong>
              </div>
            </article>
          })}
        </div>
      )}
      <p className="text-xs leading-relaxed text-slate-500">Os preços e a disponibilidade são atualizados automaticamente enquanto a tela estiver ativa. O gerente e o administrador controlam a disponibilidade dos itens.</p>
    </section>
  )
}
