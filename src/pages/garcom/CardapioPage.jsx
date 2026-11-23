import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, RefreshCw, Search, Wifi } from "lucide-react"
import { supabase } from "../../lib/supabase"

const moeda = (valor) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const disponivel = (produto) => produto.ativo && produto.disponivel !== false && produto.categorias?.ativa !== false

export default function CardapioPage() {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoria, setCategoria] = useState("todas")
  const [busca, setBusca] = useState("")
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

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    return produtos.filter((p) =>
      (categoria === "todas" || p.categoria_id === categoria) &&
      (!termo || `${p.nome} ${p.descricao ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo))
    ).sort((a,b) => Number(disponivel(b)) - Number(disponivel(a)) || a.nome.localeCompare(b.nome,"pt-BR"))
  }, [produtos,busca,categoria])
  const disponiveis = produtos.filter(disponivel).length

  return (
    <section className="space-y-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">Consulta rápida</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white"><BookOpen size={24}/> Cardápio</h2>
          <p className="mt-1 text-sm text-slate-400">Preços e disponibilidade para orientar o cliente, sem abrir uma comanda.</p>
        </div>
        <button type="button" disabled={atualizando || carregando} onClick={() => carregarDados()}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 font-semibold text-slate-200 disabled:opacity-50">
          <RefreshCw size={17} className={atualizando ? "animate-spin" : ""}/> Atualizar
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
        <span><span className="font-semibold text-emerald-300">{disponiveis}</span> disponíveis · <span className="font-semibold text-amber-300">{produtos.length - disponiveis}</span> indisponíveis</span>
        {ultimaAtualizacao && <span className="flex items-center gap-1"><Wifi size={14}/> Atualizado às {ultimaAtualizacao.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
      </div>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="search" aria-label="Buscar produtos" value={busca} onChange={(e)=>setBusca(e.target.value)} placeholder="Buscar produto..."
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 pl-11 text-white outline-none placeholder:text-slate-500 focus:border-orange-500" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por categoria">
        {[{id:"todas",nome:"Todas"},...categorias].map((c)=><button key={c.id} type="button" onClick={()=>setCategoria(c.id)}
          aria-pressed={categoria===c.id}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold ${categoria===c.id ? "bg-orange-600 text-white" : "border border-slate-700 bg-slate-900 text-slate-300"}`}>
          {c.nome}</button>)}
      </div>
      {erro && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-sm text-red-300">{erro}</div>}
      {carregando ? <div className="rounded-xl bg-slate-900 p-8 text-center text-slate-400">Carregando cardápio...</div>
      : filtrados.length===0 ? <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">Nenhum produto encontrado.</div>
      : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((p)=><article key={p.id} className={`rounded-2xl border bg-slate-900 p-4 ${disponivel(p)?"border-slate-800":"border-amber-600/30 opacity-75"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="font-semibold text-white">{p.nome}</h3>
                <p className="mt-1 text-xs text-slate-400">{p.categorias?.nome ?? "Outros"}</p></div>
              <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${disponivel(p)?"bg-emerald-500/10 text-emerald-300":"bg-amber-500/10 text-amber-300"}`}>
                {disponivel(p)?"Disponível":"Indisponível"}</span>
            </div>
            {p.descricao && <p className="mt-3 text-sm text-slate-400">{p.descricao}</p>}
            <p className="mt-3 text-lg font-bold text-emerald-300">{moeda(p.preco)}</p>
          </article>)}
        </div>}
      <p className="text-xs text-slate-500">Disponibilidade atualizada periodicamente ou ao tocar em Atualizar. O gerente ou administrador controla os produtos disponíveis.</p>
    </section>
  )
}
