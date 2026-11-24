import { useCallback, useEffect, useMemo, useState } from "react"
import { Package, RefreshCw, Search, CheckCircle2, AlertTriangle, X, SlidersHorizontal } from "lucide-react"
import { supabase } from "../../lib/supabase"

const reais = (value) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function DisponibilidadeProdutosPage() {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState("")
  const [categoriaId, setCategoriaId] = useState("todas")
  const [filtro, setFiltro] = useState("todos")
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [alterandoId, setAlterandoId] = useState(null)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [atualizadoEm, setAtualizadoEm] = useState(null)

  const carregar = useCallback(async (inicial = false) => {
    if (inicial) setCarregando(true)
    else setAtualizando(true)
    try {
      const [p, c] = await Promise.all([
        supabase.from("produtos").select("id,nome,descricao,preco,categoria_id,ativo,disponivel,categorias(id,nome,ativa)")
          .eq("ativo", true).order("nome", { ascending: true }),
        supabase.from("categorias").select("id,nome,ativa,ordem")
          .eq("ativa", true).order("ordem", { ascending: true }).order("nome", { ascending: true }),
      ])
      if (p.error) throw p.error
      if (c.error) throw c.error
      setProdutos((p.data ?? []).filter((item) => item.categorias?.ativa !== false))
      setCategorias(c.data ?? [])
      setErro("")
      setAtualizadoEm(new Date())
    } catch (e) {
      console.error("Erro ao carregar disponibilidade:", e)
      setErro("Não foi possível carregar os produtos. Verifique a conexão e tente novamente.")
    } finally {
      setCarregando(false)
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    carregar(true)
    const aoVoltar = () => {
      if (document.visibilityState === "visible" && !alterandoId) carregar()
    }
    const intervalo = window.setInterval(aoVoltar, 30000)
    window.addEventListener("focus", aoVoltar)
    document.addEventListener("visibilitychange", aoVoltar)
    return () => {
      window.clearInterval(intervalo)
      window.removeEventListener("focus", aoVoltar)
      document.removeEventListener("visibilitychange", aoVoltar)
    }
  }, [carregar, alterandoId])

  async function mudarDisponibilidade(produto) {
    if (alterandoId) return
    const novoEstado = produto.disponivel === false
    setAlterandoId(produto.id)
    setErro("")
    setAviso("")
    try {
      const { data, error } = await supabase.rpc("definir_disponibilidade_produto", {
        p_id: produto.id,
        p_disponivel: novoEstado,
      })
      if (error || data !== true) throw error || new Error("Produto não encontrado")
      setProdutos((atual) => atual.map((p) => p.id === produto.id ? { ...p, disponivel: novoEstado } : p))
      setAviso(`${produto.nome}: ${novoEstado ? "disponível" : "indisponível"} para novos pedidos.`)
      setAtualizadoEm(new Date())
    } catch (e) {
      console.error("Não foi possível alterar disponibilidade:", e)
      setErro("Não foi possível salvar a disponibilidade. Verifique sua permissão e tente novamente.")
    } finally {
      setAlterandoId(null)
    }
  }

  const disponiveis = produtos.filter((p) => p.disponivel !== false).length
  const filtrosAtivos = busca.trim() !== "" || categoriaId !== "todas" || filtro !== "todos"
  function limparFiltros() {
    setBusca("")
    setCategoriaId("todas")
    setFiltro("todos")
  }
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    return produtos.filter((p) => {
      const bateBusca = !termo || `${p.nome} ${p.descricao ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo)
      const bateCategoria = categoriaId === "todas" || p.categoria_id === categoriaId
      const bateStatus = filtro === "todos" || (filtro === "disponiveis" ? p.disponivel !== false : p.disponivel === false)
      return bateBusca && bateCategoria && bateStatus
    }).sort((a, b) => Number(a.disponivel === false) - Number(b.disponivel === false) || a.nome.localeCompare(b.nome, "pt-BR"))
  }, [produtos, busca, categoriaId, filtro])

  return (
    <section className="space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Controle de estoque para atendimento</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            <Package size={24} className="shrink-0 text-orange-400" /> Disponibilidade dos produtos
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Marque o que pode ser vendido agora. Preços, categorias e cadastro continuam exclusivos do administrador.
          </p>
        </div>
        <button type="button" disabled={carregando || atualizando || Boolean(alterandoId)} onClick={() => carregar()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 disabled:opacity-50">
          <RefreshCw size={17} className={atualizando ? "animate-spin" : ""}/> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Indicador titulo="No cardápio" valor={produtos.length} tom="slate" />
        <Indicador titulo="Disponíveis" valor={disponiveis} tom="emerald" />
        <Indicador titulo="Indisponíveis" valor={produtos.length - disponiveis} tom="amber" className="col-span-2 sm:col-span-1" />
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><SlidersHorizontal size={16} className="text-orange-400" /> Filtrar produtos</p>
          {filtrosAtivos && <button type="button" onClick={limparFiltros} className="text-xs font-semibold text-orange-300 underline-offset-4 hover:underline">Limpar filtros</button>}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou descrição"
              aria-label="Buscar produto"
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"/>
            {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={16}/></button>}
          </div>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Filtrar categoria"
            className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-orange-500">
            <option value="todas">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div role="group" aria-label="Filtrar disponibilidade" className="grid grid-cols-3 gap-2">
          {[
            {id:"todos",nome:"Todos"},
            {id:"disponiveis",nome:"Disponíveis"},
            {id:"indisponiveis",nome:"Indisponíveis"},
          ].map((opcao) => <button key={opcao.id} type="button" onClick={() => setFiltro(opcao.id)} aria-pressed={filtro === opcao.id}
            className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 sm:text-sm ${filtro === opcao.id ? "border-orange-500 bg-orange-600 text-white" : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"}`}>
            {opcao.nome}
          </button>)}
        </div>
      </div>

      {erro && <p role="alert" className="rounded-xl border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300">{erro}</p>}
      {aviso && <p role="status" className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-300">{aviso}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>Exibindo <strong className="text-slate-100">{filtrados.length}</strong> de {produtos.length} produtos</span>
        {atualizadoEm && <span>Atualizado às {atualizadoEm.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}</span>}
      </div>

      {carregando ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 text-slate-400"><RefreshCw size={20} className="animate-spin" /> Carregando produtos...</div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
          <Search size={30} className="mx-auto text-slate-500" />
          <h3 className="mt-3 font-bold text-white">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm text-slate-400">Altere a pesquisa ou os filtros para encontrar outro produto.</p>
          {filtrosAtivos && <button type="button" onClick={limparFiltros} className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-orange-300">Limpar filtros</button>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((p) => {
            const ok = p.disponivel !== false
            const processando = alterandoId === p.id
            return (
              <article key={p.id} className={`flex min-w-0 flex-col rounded-2xl border bg-slate-900 p-4 transition sm:p-5 ${ok ? "border-slate-800 hover:border-slate-700" : "border-amber-500/30"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">{p.categorias?.nome ?? "Outros"}</p>
                    <h3 className="mt-1 break-words text-base font-bold text-white">{p.nome}</h3>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ok ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                    {ok ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>} <span className="hidden sm:inline">{ok ? "Disponível" : "Indisponível"}</span>
                  </span>
                </div>
                {p.descricao && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{p.descricao}</p>}
                <p className="mt-auto pt-5 text-xl font-bold text-white">{reais(p.preco)}</p>
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <button type="button" disabled={Boolean(alterandoId)} aria-label={`${ok ? "Indisponibilizar" : "Disponibilizar"} ${p.nome}`}
                    onClick={() => mudarDisponibilidade(p)}
                    className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-50 ${ok ? "bg-amber-700 hover:bg-amber-600" : "bg-emerald-700 hover:bg-emerald-600"}`}>
                    {processando && <RefreshCw size={16} className="animate-spin" />}
                    {processando ? "Salvando alteração..." : ok ? "Marcar indisponível" : "Voltar a disponibilizar"}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
      <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs leading-relaxed text-slate-400">
        Alterações afetam novos pedidos. Itens já lançados em comandas permanecem registrados.
      </p>
    </section>
  )
}

function Indicador({ titulo, valor, tom, className = "" }) {
  const estilos = {
    slate: "border-slate-800 text-white",
    emerald: "border-emerald-500/25 text-emerald-300",
    amber: "border-amber-500/25 text-amber-300",
  }
  return (
    <div className={`rounded-2xl border bg-slate-900 p-4 sm:p-5 ${estilos[tom]} ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{valor}</p>
    </div>
  )
}
