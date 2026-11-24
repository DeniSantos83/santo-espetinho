import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, CalendarDays, ClipboardList, Package, RefreshCw, Search, ShoppingCart, TrendingUp, Users, X, Clock3, Filter, BarChart3 } from "lucide-react"
import { supabase } from "../../lib/supabase"

const dinheiro = (n) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const dataInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const dataHora = (d) => d ? new Date(d).toLocaleString("pt-BR") : "—"
const saldo = (c) => Number(c.total_final ?? c.total ?? 0)

function Card({ titulo, valor, detalhe, icone: Icone, destaque = false }) {
  return <article className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${destaque ? "border-orange-500/40 bg-gradient-to-br from-orange-600/15 via-slate-900 to-slate-900" : "border-slate-800 bg-slate-900"}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{titulo}</p>
        <strong className="mt-3 block break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">{valor}</strong>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{detalhe}</p></div>
      <div className={`shrink-0 rounded-xl p-3 ${destaque ? "bg-orange-500/20 text-orange-300" : "bg-slate-800 text-orange-400"}`}><Icone size={21}/></div>
    </div>
  </article>
}
function Vazio({ texto }) {
  return <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">{texto}</p>
}

export default function RelatoriosPage() {
  const [dataInicial, setDataInicial] = useState(() => { const hoje = new Date(); return dataInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)) })
  const [dataFinal, setDataFinal] = useState(() => dataInput(new Date()))
  const [comandas, setComandas] = useState([])
  const [itens, setItens] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [busca, setBusca] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [atualizado, setAtualizado] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro("")
    try {
      if (!dataInicial || !dataFinal || dataInicial > dataFinal) throw new Error("Informe um período válido: a data inicial não pode superar a final.")
      const inicio = new Date(`${dataInicial}T00:00:00`)
      const fim = new Date(`${dataFinal}T00:00:00`)
      fim.setDate(fim.getDate() + 1)
      const consultas = [
        supabase.from("comandas").select("id,cliente,usuario_id,garcom_id,status,fechada_em,total,total_final,subtotal_consumo,total_acrescimos,total_descontos,forma_pagamento")
          .eq("status", "fechada").gte("fechada_em", inicio.toISOString()).lt("fechada_em", fim.toISOString())
          .order("fechada_em", { ascending: false }).limit(1000),
        supabase.from("usuarios").select("id,nome").limit(1000),
      ]
      const [resultadoComandas, resultadoUsuarios] = await Promise.all(consultas)
      if (resultadoComandas.error) throw resultadoComandas.error
      if (resultadoUsuarios.error) throw resultadoUsuarios.error
      const fechadas = resultadoComandas.data ?? []
      const itensLidos = []
      for (let offset = 0; offset < fechadas.length; offset += 100) {
        const ids = fechadas.slice(offset, offset + 100).map((c) => c.id)
        const resultado = await supabase.from("comanda_itens").select(
          "id,comanda_id,produto_id,quantidade,preco_unitario,subtotal,produtos(id,nome)"
        ).in("comanda_id", ids).limit(1000)
        if (resultado.error) throw resultado.error
        if ((resultado.data ?? []).length === 1000) throw new Error("O volume de itens excedeu o limite desta consulta. Use um período menor.")
        itensLidos.push(...(resultado.data ?? []))
      }
      setComandas(fechadas)
      setItens(itensLidos)
      setUsuarios(resultadoUsuarios.data ?? [])
      setAtualizado(new Date())
      if (fechadas.length === 1000) setErro("Limite de 1.000 comandas atingido. Selecione um período menor para obter um relatório completo.")
    } catch (e) {
      console.error("Erro ao carregar relatórios:", e)
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os relatórios.")
      setComandas([])
      setItens([])
      setUsuarios([])
    } finally {
      setCarregando(false)
    }
  }, [dataInicial, dataFinal])

  useEffect(() => { carregar() }, [carregar])

  const nomes = useMemo(() => new Map(usuarios.map((u) => [u.id, u.nome])), [usuarios])
  const faturamento = useMemo(() => comandas.reduce((n,c) => n + saldo(c),0),[comandas])
  const consumo = useMemo(() => comandas.reduce((n,c) => n + Number(c.subtotal_consumo ?? c.total ?? 0),0),[comandas])
  const acrescimos = useMemo(() => comandas.reduce((n,c) => n + Number(c.total_acrescimos ?? 0),0),[comandas])
  const descontos = useMemo(() => comandas.reduce((n,c) => n + Number(c.total_descontos ?? 0),0),[comandas])
  const unidades = useMemo(() => itens.reduce((n,i) => n + Number(i.quantidade ?? 0),0),[itens])
  const produtos = useMemo(() => {
    const agrupado = new Map()
    for (const i of itens) {
      const id = i.produto_id ?? i.produtos?.nome ?? "sem-produto"
      const antigo = agrupado.get(id) ?? { id, nome: i.produtos?.nome ?? "Produto não encontrado", quantidade: 0, total: 0 }
      const quantidade = Number(i.quantidade ?? 0)
      antigo.quantidade += quantidade
      antigo.total += Number(i.subtotal ?? quantidade * Number(i.preco_unitario ?? 0))
      agrupado.set(id, antigo)
    }
    return [...agrupado.values()].sort((a,b) => b.quantidade - a.quantidade).slice(0,10)
  },[itens])
  const equipe = useMemo(() => {
    const agrupado = new Map()
    for (const c of comandas) {
      const id = c.usuario_id
      if (!id) continue
      const antigo = agrupado.get(id) ?? { id, nome: nomes.get(id) ?? "Usuário não encontrado", quantidade: 0, total: 0 }
      antigo.quantidade += 1
      antigo.total += saldo(c)
      agrupado.set(id, antigo)
    }
    return [...agrupado.values()].sort((a,b) => b.total - a.total)
  },[comandas,nomes])
  const historico = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    return comandas.filter(c => !termo ||
      `${c.cliente ?? ""} ${nomes.get(c.usuario_id) ?? ""} ${c.id}`.toLocaleLowerCase("pt-BR").includes(termo))
  },[comandas,nomes,busca])
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-400"
  const inputClass = "h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
  const maximoRanking = Math.max(1, ...produtos.map((produto) => produto.quantidade))
  function aplicarPeriodo(periodo) {
    const hoje = new Date()
    const inicial = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    if (periodo === "mes") inicial.setDate(1)
    if (periodo === "7dias") inicial.setDate(inicial.getDate() - 6)
    if (periodo === "30dias") inicial.setDate(inicial.getDate() - 29)
    setDataInicial(dataInput(inicial))
    setDataFinal(dataInput(hoje))
  }

  return <section className="space-y-6 pb-12 text-white">
    <header className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400"><BarChart3 size={15}/> Inteligência da operação</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Relatórios</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Vendas, resultados financeiros e desempenho da equipe em um só lugar.</p>
      </div>
      {atualizado && <p className="flex shrink-0 items-center gap-2 text-xs text-slate-400"><Clock3 size={15} className="text-emerald-400"/> Atualizado às {atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>}
    </header>

    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Filter size={18} className="text-orange-400"/> Período de análise</h2>
        <p className="text-xs text-slate-400">Somente comandas fechadas</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Períodos rápidos">
        <button type="button" onClick={() => aplicarPeriodo("hoje")} className="min-h-10 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500 hover:text-white">Hoje</button>
        <button type="button" onClick={() => aplicarPeriodo("7dias")} className="min-h-10 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500 hover:text-white">7 dias</button>
        <button type="button" onClick={() => aplicarPeriodo("30dias")} className="min-h-10 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500 hover:text-white">30 dias</button>
        <button type="button" onClick={() => aplicarPeriodo("mes")} className="min-h-10 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500 hover:text-white">Este mês</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label><span className={labelClass}><CalendarDays size={14} className="mr-1 inline"/>Data inicial</span>
          <input type="date" className={inputClass} value={dataInicial} onChange={e => setDataInicial(e.target.value)}/></label>
        <label><span className={labelClass}><CalendarDays size={14} className="mr-1 inline"/>Data final</span>
          <input type="date" className={inputClass} value={dataFinal} onChange={e => setDataFinal(e.target.value)}/></label>
        <button type="button" onClick={carregar} disabled={carregando}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50">
          <RefreshCw size={18} className={carregando ? "animate-spin" : ""}/> Atualizar relatório
        </button>
      </div>
    </div>

    {erro && <div role="alert" className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-4 text-sm text-amber-200">{erro}</div>}
    {carregando ? <div role="status" className="flex min-h-60 items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 text-slate-300"><RefreshCw size={20} className="animate-spin text-orange-400"/> Gerando relatório...</div> : <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card titulo="Faturamento" valor={dinheiro(faturamento)} detalhe={`${comandas.length} contas fechadas no período`} icone={Banknote} destaque/>
        <Card titulo="Ticket médio" valor={dinheiro(comandas.length ? faturamento / comandas.length : 0)} detalhe="Valor médio por comanda" icone={TrendingUp}/>
        <Card titulo="Produtos vendidos" valor={unidades} detalhe="Unidades comercializadas" icone={ShoppingCart}/>
        <Card titulo="Comandas" valor={comandas.length} detalhe="Contas finalizadas" icone={ClipboardList}/>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <h2 className="text-base font-bold">Resumo financeiro</h2>
          <p className="mt-1 text-sm text-slate-400">Composição dos valores no período</p>
          <dl className="mt-5 space-y-4">
            {[["Consumo", consumo], ["Acréscimos", acrescimos], ["Descontos", descontos]].map(([nome, valor]) =>
              <div key={nome} className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 text-sm">
                <dt className="text-slate-400">{nome}</dt><dd className="font-semibold text-white">{dinheiro(valor)}</dd>
              </div>)}
          </dl>
          <div className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-300">Faturamento total</p>
            <strong className="mt-2 block break-words text-2xl font-bold text-white">{dinheiro(faturamento)}</strong>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 xl:col-span-2">
          <div className="flex items-center gap-2"><Package size={20} className="text-orange-400"/><h2 className="text-base font-bold">Produtos mais vendidos</h2></div>
          <p className="mt-1 text-sm text-slate-400">Top 10 por quantidade comercializada</p>
          {!produtos.length ? <div className="mt-5"><Vazio texto="Nenhum produto vendido neste período."/></div> :
            <ol className="mt-5 space-y-4">{produtos.map((p, i) =>
              <li key={p.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-orange-300">{i + 1}</span>
                    <div className="min-w-0"><p className="truncate font-semibold text-white">{p.nome}</p><p className="text-xs text-slate-400">{p.quantidade} unidades</p></div></div>
                  <strong className="shrink-0 text-emerald-300">{dinheiro(p.total)}</strong>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-orange-500" style={{width: `${Math.max(3, p.quantidade / maximoRanking * 100)}%`}}/></div>
              </li>)}</ol>}
        </article>
      </div>

      <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="p-4 sm:p-5"><h2 className="flex items-center gap-2 text-base font-bold"><Users size={20} className="text-orange-400"/>Desempenho da equipe</h2>
          <p className="mt-1 text-sm text-slate-400">Comandas fechadas por responsável registrado</p></div>
        {!equipe.length ? <div className="px-4 pb-5"><Vazio texto="Nenhuma movimentação encontrada."/></div> : <>
          <div className="grid gap-2 px-4 pb-5 sm:hidden">{equipe.map(u =>
            <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-3"><p className="font-semibold">{u.nome}</p><strong className="text-emerald-300">{dinheiro(u.total)}</strong></div>
              <p className="mt-2 text-xs text-slate-400">{u.quantidade} comandas · Ticket médio {dinheiro(u.total / u.quantidade)}</p>
            </div>)}</div>
          <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[550px] text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400"><tr><th scope="col" className="px-5 py-3">Responsável</th><th scope="col" className="px-5 py-3 text-center">Comandas</th><th scope="col" className="px-5 py-3 text-right">Valor</th><th scope="col" className="px-5 py-3 text-right">Ticket médio</th></tr></thead>
            <tbody className="divide-y divide-slate-800">{equipe.map(u => <tr key={u.id} className="hover:bg-slate-800/40">
              <td className="px-5 py-3 font-semibold">{u.nome}</td><td className="px-5 py-3 text-center text-slate-300">{u.quantidade}</td>
              <td className="px-5 py-3 text-right font-bold text-emerald-300">{dinheiro(u.total)}</td>
              <td className="px-5 py-3 text-right text-slate-300">{dinheiro(u.total / u.quantidade)}</td>
            </tr>)}</tbody>
          </table></div>
        </>}
      </article>

      <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="text-base font-bold">Histórico de comandas</h2><p className="mt-1 text-sm text-slate-400">Contas fechadas no período · {historico.length} resultados</p></div>
          <div className="relative sm:min-w-[265px]"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input type="search" aria-label="Pesquisar cliente ou responsável" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar cliente ou responsável" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-500"/>
            {busca && <button type="button" aria-label="Limpar busca" title="Limpar busca" onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={16}/></button>}
          </div>
        </div>
        {!historico.length ? <div className="px-4 pb-5"><Vazio texto={busca ? "Nenhuma comanda corresponde à busca." : "Nenhuma comanda encontrada neste período."}/></div> : <>
          <div className="grid gap-2 px-4 pb-5 sm:hidden">{historico.map(c =>
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{c.cliente || "Cliente não informado"}</p><p className="mt-1 text-xs text-slate-400">{dataHora(c.fechada_em)}</p></div>
                <strong className="shrink-0 text-emerald-300">{dinheiro(saldo(c))}</strong></div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-800 pt-3 text-xs text-slate-400"><span>Responsável: {nomes.get(c.usuario_id) ?? "—"}</span><span>Consumo: {dinheiro(c.subtotal_consumo ?? c.total)}</span></div>
            </div>)}</div>
          <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400"><tr>
              <th scope="col" className="px-5 py-3">Data</th><th scope="col" className="px-5 py-3">Cliente</th><th scope="col" className="px-5 py-3">Responsável</th><th scope="col" className="px-5 py-3 text-right">Consumo</th><th scope="col" className="px-5 py-3 text-right">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-800">{historico.map(c => <tr key={c.id} className="hover:bg-slate-800/40">
              <td className="whitespace-nowrap px-5 py-3 text-slate-300">{dataHora(c.fechada_em)}</td>
              <td className="px-5 py-3 font-medium text-white">{c.cliente || "Não informado"}</td>
              <td className="px-5 py-3 text-slate-300">{nomes.get(c.usuario_id) ?? "—"}</td>
              <td className="px-5 py-3 text-right text-slate-300">{dinheiro(c.subtotal_consumo ?? c.total)}</td>
              <td className="px-5 py-3 text-right font-bold text-emerald-300">{dinheiro(saldo(c))}</td>
            </tr>)}</tbody>
          </table></div>
        </>}
      </article>
    </>}
  </section>
}
