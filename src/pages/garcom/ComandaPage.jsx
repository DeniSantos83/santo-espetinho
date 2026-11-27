import { useEffect, useMemo, useState } from "react"
import {
  Armchair,
  CheckCircle2,
  LayoutGrid,
  ListFilter,
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
import { abrirComandaCompat } from "../../lib/abrirComandaCompat"
import { comandasAbertasDaMesa } from "../../lib/comandasPorMesa"
import GerenciarComandaModal from "../../components/comandas/GerenciarComandaModal"

const FORMULARIO_INICIAL = {
  mesa_id: "",
  cliente: "",
  observacoes: "",
}

export default function ComandasPage() {
  const [comandas, setComandas] = useState([])
  const [mesas, setMesas] = useState([])
  const [reservas, setReservas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [itens, setItens] = useState([])

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [modalAberto, setModalAberto] = useState(false)
  const [comandaGerenciada, setComandaGerenciada] = useState(null)
  const [comandaPreConta, setComandaPreConta] = useState(null)

  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState("todas")
  const [agora, setAgora] = useState(Date.now())
  const [ordenacao, setOrdenacao] = useState("numero")

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
        resultadoReservas,
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

        supabase
          .from("reservas_mesas")
          .select("id, mesa_id, status, cliente")
          .eq("status", "ativa"),
      ])

      if (resultadoComandas.error) throw resultadoComandas.error
      if (resultadoMesas.error) throw resultadoMesas.error
      if (resultadoUsuarios.error) throw resultadoUsuarios.error
      if (resultadoItens.error) throw resultadoItens.error
      if (resultadoReservas.error) throw resultadoReservas.error

      setComandas(resultadoComandas.data ?? [])
      setMesas(resultadoMesas.data ?? [])
      setUsuarios(resultadoUsuarios.data ?? [])
      setItens(resultadoItens.data ?? [])
      setReservas(resultadoReservas.data ?? [])
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
    const primeiraMesa = mesasDisponiveisParaComanda[0]

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
      const usuarioAtual = await obterUsuarioAtual()
      const { comanda: novaComanda, modoLegado } = await abrirComandaCompat({
        mesaId: formulario.mesa_id,
        cliente: formulario.cliente.trim(),
        observacoes: formulario.observacoes.trim(),
        usuarioId: usuarioAtual.id,
      })

      setModalAberto(false)
      setFormulario(FORMULARIO_INICIAL)
      setMensagem(modoLegado
        ? "Comanda aberta no modo tradicional (uma por mesa)."
        : "Comanda aberta. Agora lance os pedidos.")
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

  function obterComandasDaMesa(mesaId) {
    return comandasAbertasDaMesa(comandas, mesaId)
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

  const idsMesasReservadas = useMemo(() => reservas.map(r => r.mesa_id), [reservas])

  const mesasLivres = useMemo(
    () =>
      mesas.filter(
        (mesa) =>
          !idsOcupadas.includes(mesa.id) &&
          !mesa.mesa_principal_id &&
          !mesa.grupo_mesas_id &&
          !idsMesasReservadas.includes(mesa.id)
      ),
    [mesas, idsOcupadas, idsMesasReservadas]
  )

  const mesasDisponiveisParaComanda = useMemo(
    () => mesas.filter(mesa =>
      !mesa.mesa_principal_id && !mesa.grupo_mesas_id &&
      (idsOcupadas.includes(mesa.id) || !idsMesasReservadas.includes(mesa.id))
    ), [mesas, idsOcupadas, idsMesasReservadas]
  )

  const mesasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    const resultado = mesas.filter((mesa) => {
      const comanda = obterComandaDaMesa(mesa.id)
      const clientes = obterComandasDaMesa(mesa.id).map(c => c.cliente || "").join(" ")
      const ocupada = Boolean(comanda || mesa.mesa_principal_id)
      const texto =
        `mesa ${mesa.numero} ${mesa.nome ?? ""} ${clientes}`.toLowerCase()

      const correspondeBusca = !termo || texto.includes(termo)
      const correspondeFiltro =
        filtro === "todas" ||
        (filtro === "livres" && !ocupada) ||
        (filtro === "ocupadas" && ocupada)

      return correspondeBusca && correspondeFiltro
    })
    return resultado.sort((a, b) => {
      if (ordenacao === "ocupadas") {
        const ativaA = Boolean(obterComandaDaMesa(a.id) || a.mesa_principal_id)
        const ativaB = Boolean(obterComandaDaMesa(b.id) || b.mesa_principal_id)
        if (ativaA !== ativaB) return Number(ativaB) - Number(ativaA)
      }
      return Number(a.numero) - Number(b.numero)
    })
  }, [mesas, comandas, busca, filtro, ordenacao])

  const valorEmAberto = comandas.reduce(
    (total, comanda) => total + totalComanda(comanda.id),
    0
  )

  return (
    <section className="space-y-5 pb-24 sm:pb-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Operação · Salão</p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400"><LayoutGrid size={22}/></span> Mesas e pedidos</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Abra uma comanda, lance produtos ou consulte a pré-conta de uma mesa em atendimento.</p>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2 sm:flex sm:shrink-0">
          <button type="button" onClick={() => carregarDados()} disabled={carregando} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 disabled:opacity-50" aria-label="Atualizar dados das mesas"><RefreshCw size={18} className={carregando ? "animate-spin" : ""}/><span className="hidden sm:inline">Atualizar</span></button>
          <button type="button" onClick={() => abrirNovaComanda()} disabled={mesasDisponiveisParaComanda.length === 0} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 disabled:opacity-50"><CirclePlus size={19}/> Nova comanda</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Resumo titulo="Mesas livres" valor={mesasLivres.length} variante="livre" />
        <Resumo titulo="Comandas abertas" valor={comandas.length} variante="ocupada" />
        <div className="col-span-2 sm:col-span-1"><Resumo titulo="Consumo em aberto" valor={formatarMoeda(valorEmAberto)} compacto variante="valor" /></div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Buscar mesa ou cliente" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar mesa ou cliente..." className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15" />
            {busca && <button type="button" aria-label="Limpar busca" onClick={() => setBusca("")} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"><X size={17}/></button>}
          </div>
          <label className="sr-only" htmlFor="ordenacao-mesas">Ordenar mesas</label>
          <select id="ordenacao-mesas" value={ordenacao} onChange={(evento)=>setOrdenacao(evento.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"><option value="numero">Ordenar por número</option><option value="ocupadas">Ocupadas primeiro</option></select>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar mesas por situação">
          <ListFilter size={17} className="mr-1 text-slate-400" />
          {[{id:"todas",label:"Todas",quantidade:mesas.length},{id:"livres",label:"Livres",quantidade:mesasLivres.length},{id:"ocupadas",label:"Ocupadas",quantidade:mesas.filter(m=>Boolean(obterComandaDaMesa(m.id) || m.mesa_principal_id)).length}].map(opcao=><button key={opcao.id} type="button" onClick={()=>setFiltro(opcao.id)} aria-pressed={filtro===opcao.id} className={`min-h-10 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${filtro===opcao.id ? "border-orange-500 bg-orange-600 text-white" : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"}`}>{opcao.label} <span className="ml-1 text-xs opacity-75">{opcao.quantidade}</span></button>)}
          {(busca || filtro !== "todas") && <button type="button" onClick={()=>{setBusca("");setFiltro("todas")}} className="ml-auto min-h-10 rounded-lg px-3 text-xs font-semibold text-orange-300 hover:bg-orange-500/10">Limpar filtros</button>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-400" aria-live="polite"><span><strong className="text-slate-200">{mesasFiltradas.length}</strong> {mesasFiltradas.length === 1 ? "mesa encontrada" : "mesas encontradas"}</span><span>Atualização automática a cada 30s</span></div>
      {erro && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">{erro}</div>}
      {mensagem && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{mensagem}</div>}
      {carregando ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando mesas">{Array.from({length:6},(_,i)=><div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />)}</div>
      ) : mesasFiltradas.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center"><Search size={27} className="text-slate-500"/><h3 className="font-semibold text-white">Nenhuma mesa encontrada</h3><p className="text-sm text-slate-400">Experimente outro número, nome ou filtro.</p><button type="button" onClick={()=>{setBusca("");setFiltro("todas")}} className="min-h-10 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white">Ver todas as mesas</button></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {mesasFiltradas.map((mesa) => {
            if (mesa.mesa_principal_id) {
              const principal = obterComandaDaMesa(mesa.mesa_principal_id)
              return <article key={mesa.id} className="flex min-h-44 flex-col rounded-2xl border border-violet-500/30 bg-slate-900 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-300">Mesa agrupada</span><Armchair size={20} className="text-violet-300"/></div>
                <h3 className="mt-3 text-2xl font-bold text-white">Mesa {mesa.numero}</h3>
                <p className="mt-1 text-sm text-slate-400">Atendimento com {nomeMesa(mesa.mesa_principal_id)}</p>
                {principal && <button type="button" onClick={()=>setComandaGerenciada(principal)} className="mt-4 min-h-12 w-full rounded-xl bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-500">Lançar pedido na mesa principal</button>}
              </article>
            }
            const comandasDaMesa = obterComandasDaMesa(mesa.id)
            const comanda = comandasDaMesa[0]
            if (!comanda && idsMesasReservadas.includes(mesa.id)) return <article key={mesa.id} className="flex min-h-44 flex-col rounded-2xl border border-sky-500/30 bg-slate-900 p-4 sm:p-5">
              <span className="text-xs font-bold uppercase text-sky-300">Reservada</span>
              <h3 className="mt-3 text-2xl font-bold text-white">Mesa {mesa.numero}</h3>
              <p className="mt-2 text-sm text-slate-400">O atendimento desta reserva deve ser iniciado pela gerência ou administração.</p>
            </article>
            if (!comanda) return <article key={mesa.id} className="flex min-h-44 flex-col rounded-2xl border border-emerald-500/20 bg-slate-900 p-4 transition hover:border-emerald-500/40 sm:p-5">
              <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300"><CheckCircle2 size={13}/> Livre</span><Armchair size={22} className="text-emerald-300" /></div>
              <h3 className="mt-3 text-2xl font-bold text-white">Mesa {mesa.numero}</h3>
              {mesa.nome && <p className="mt-1 text-sm text-slate-400">{mesa.nome}</p>}
              <button type="button" onClick={()=>abrirNovaComanda(mesa.id)} className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"><CirclePlus size={18}/> Abrir comanda</button>
            </article>
            if (comandasDaMesa.length > 1) return <article key={mesa.id} className="flex flex-col gap-3 rounded-2xl border border-orange-500/30 bg-slate-900 p-4 sm:p-5">
              <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-white">Mesa {mesa.numero}</h3><span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-300">{comandasDaMesa.length} comandas</span></div>
              <p className="text-sm text-slate-400">Total da mesa: <strong className="text-white">{formatarMoeda(comandasDaMesa.reduce((s,c)=>s+totalComanda(c.id),0))}</strong></p>
              {comandasDaMesa.map(c => <div key={c.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between gap-2"><strong className="text-sm text-white">{c.cliente || "Comanda sem nome"}</strong><strong className="text-emerald-300">{formatarMoeda(totalComanda(c.id))}</strong></div>
                <p className="mt-1 text-xs text-slate-400">{quantidadeItens(c.id)} itens · {nomeGarcom(c.usuario_id)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setComandaGerenciada(c)} className="min-h-11 rounded-lg bg-orange-600 px-2 text-sm font-bold text-white">Lançar pedido</button><button type="button" onClick={()=>setComandaPreConta(c)} className="min-h-11 rounded-lg border border-slate-600 px-2 text-sm font-semibold text-slate-200">Pré-conta</button></div>
              </div>)}
              <button type="button" onClick={()=>abrirNovaComanda(mesa.id)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-orange-500/50 text-sm font-bold text-orange-300"><CirclePlus size={17}/> Nova comanda nesta mesa</button>
            </article>
            return <article key={mesa.id} className="flex min-h-60 flex-col rounded-2xl border border-orange-500/25 bg-slate-900 p-4 transition hover:border-orange-500/45 sm:p-5">
              <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-300"><ShoppingCart size={13}/> Em atendimento</span><span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><Clock3 size={14}/>{tempoAberta(comanda.aberta_em, agora)}</span></div>
              <h3 className="mt-3 text-2xl font-bold text-white">Mesa {mesa.numero}</h3>
              <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-300"><UserRound size={15} className="shrink-0 text-slate-500"/>{comanda.cliente || "Cliente não informado"}</p>
              <p className="mt-1 truncate text-xs text-slate-500">Responsável: {nomeGarcom(comanda.usuario_id)}</p>
              <div className="mt-4 flex items-end justify-between border-t border-slate-800 pt-3"><span className="text-xs text-slate-400">{quantidadeItens(comanda.id)} {quantidadeItens(comanda.id)===1 ? "item" : "itens"}</span><strong className="text-xl font-bold tabular-nums text-white">{formatarMoeda(totalComanda(comanda.id))}</strong></div>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-4"><button type="button" onClick={()=>setComandaGerenciada(comanda)} className="min-h-12 rounded-xl bg-orange-600 px-2 text-sm font-bold text-white transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">Lançar pedido</button><button type="button" onClick={()=>setComandaPreConta(comanda)} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"><ReceiptText size={16}/> Pré-conta</button></div><button type="button" onClick={()=>abrirNovaComanda(mesa.id)} className="mt-2 min-h-11 w-full rounded-xl border border-orange-500/40 text-sm font-semibold text-orange-300"><CirclePlus size={16} className="mr-1 inline"/> Nova comanda nesta mesa</button>
            </article>
          })}
        </div>
      )}

      {modalAberto && (
        <ModalNovaComanda
          formulario={formulario}
          mesas={mesasDisponiveisParaComanda}
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

function Resumo({ titulo, valor, compacto = false, variante = "livre" }) {
  const tonalidade = variante === "ocupada" ? "border-orange-500/25 bg-orange-500/5" : variante === "valor" ? "border-slate-700 bg-slate-900" : "border-emerald-500/20 bg-emerald-500/5"
  const cor = variante === "ocupada" ? "text-orange-300" : variante === "livre" ? "text-emerald-300" : "text-white"
  return <div className={`h-full rounded-2xl border p-4 sm:p-5 ${tonalidade}`}>
    <p className="text-xs font-semibold text-slate-400 sm:text-sm">{titulo}</p>
    <p className={`${compacto ? "text-xl sm:text-2xl" : "text-3xl"} mt-2 break-words font-bold tabular-nums ${cor}`}>{valor}</p>
  </div>
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
      <div className="max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-w-lg sm:rounded-2xl">
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
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar janela"
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
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
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
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
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
              className="min-h-12 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="min-h-12 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"
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
          <h3 className="text-center text-xl font-bold">Nova Espetaria Bar</h3>
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
            className="min-h-12 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300"
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