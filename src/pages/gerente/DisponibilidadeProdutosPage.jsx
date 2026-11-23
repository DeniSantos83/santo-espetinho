import { useCallback, useEffect, useMemo, useState } from "react"
import { Package, RefreshCw, Search, CheckCircle2, AlertTriangle } from "lucide-react"
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
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    return produtos.filter((p) => {
      const bateBusca = !termo || `${p.nome} ${p.descricao ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo)
      const bateCategoria = categoriaId === "todas" || p.categoria_id === categoriaId
      const bateStatus = filtro === "todos" || (filtro === "disponiveis" ? p.disponivel !== false : p.disponivel === false)
      return bateBusca && bateCategoria && bateStatus
    })
  }, [produtos, busca, categoriaId, filtro])

  return (
    <section className="space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">Controle da gerência</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white"><Package size={23}/> Disponibilidade dos produtos</h2>
          <p className="mt-2 text-sm text-slate-400">
            Marque o que está disponível para venda. Preços, categorias e cadastro são exclusivos do administrador.
          </p>
        </div>
        <button type="button" disabled={carregando || atualizando || Boolean(alterandoId)} onClick={() => carregar()}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
          <RefreshCw size={17} className={atualizando ? "animate-spin" : ""}/> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase text-slate-400">Produtos no cardápio</p>
          <p className="mt-2 text-2xl font-bold text-white">{produtos.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900 p-4">
          <p className="text-xs uppercase text-emerald-300">Disponíveis</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{disponiveis}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-slate-900 p-4">
          <p className="text-xs uppercase text-amber-300">Indisponíveis</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{produtos.length - disponiveis}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-[minmax(0,1fr)_200px_190px]">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..."
            aria-label="Buscar produto"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-orange-500"/>
        </div>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Filtrar categoria"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar disponibilidade"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">
          <option value="todos">Todos os produtos</option>
          <option value="disponiveis">Disponíveis</option>
          <option value="indisponiveis">Indisponíveis</option>
        </select>
      </div>

      {erro && <p role="alert" className="rounded-xl border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300">{erro}</p>}
      {aviso && <p role="status" className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-300">{aviso}</p>}
      {atualizadoEm && <p className="text-xs text-slate-500">Consulta atualizada às {atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</p>}

      {carregando ? <p className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Carregando produtos...</p> :
        filtrados.length === 0 ? <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">Nenhum produto encontrado.</p> :
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((p) => {
            const ok = p.disponivel !== false
            return <article key={p.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-white">{p.nome}</h3>
                  <p className="mt-1 text-xs text-slate-400">{p.categorias?.nome ?? "Outros"}</p>
                </div>
                {ok ? <CheckCircle2 size={21} className="shrink-0 text-emerald-400"/> : <AlertTriangle size={21} className="shrink-0 text-amber-400"/>}
              </div>
              {p.descricao && <p className="mt-3 text-sm text-slate-400">{p.descricao}</p>}
              <p className="mt-auto pt-4 text-lg font-bold text-emerald-300">{reais(p.preco)}</p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <span className={`text-sm font-semibold ${ok ? "text-emerald-300" : "text-amber-300"}`}>
                  {ok ? "Disponível" : "Indisponível"}
                </span>
                <button type="button" disabled={Boolean(alterandoId)} aria-label={`${ok ? "Indisponibilizar" : "Disponibilizar"} ${p.nome}`}
                  onClick={() => mudarDisponibilidade(p)}
                  className={`min-h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 ${ok ? "bg-amber-700 hover:bg-amber-600" : "bg-emerald-700 hover:bg-emerald-600"}`}>
                  {alterandoId === p.id ? "Salvando..." : ok ? "Indisponibilizar" : "Disponibilizar"}
                </button>
              </div>
            </article>
          })}
        </div>
      }

      <p className="text-xs text-slate-500">
        Itens indisponíveis não poderão ser adicionados a novos pedidos. Itens já lançados em comandas permanecem registrados.
      </p>
    </section>
  )
}
