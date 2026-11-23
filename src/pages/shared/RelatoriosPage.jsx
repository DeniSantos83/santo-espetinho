import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, CalendarDays, ClipboardList, Package, RefreshCw, Search, ShoppingCart, TrendingUp, Users } from "lucide-react"
import { supabase } from "../../lib/supabase"

const dinheiro = (n) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const dataInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const dataHora = (d) => d ? new Date(d).toLocaleString("pt-BR") : "—"
const saldo = (c) => Number(c.total_final ?? c.total ?? 0)

function Card({ titulo, valor, detalhe, icone: Icone }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm text-slate-400">{titulo}</p>
        <strong className="mt-2 block text-2xl font-bold text-white">{valor}</strong>
        <p className="mt-1 text-xs text-slate-500">{detalhe}</p></div>
      <div className="rounded-xl bg-orange-500/10 p-3 text-orange-400"><Icone size={22}/></div>
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
  const inputClass = "h-[46px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-orange-500"

  return <section className="space-y-6 pb-10">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <p className="mt-1 text-sm text-slate-400">Acompanhe vendas, faturamento e desempenho da operação.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label><span className={labelClass}><CalendarDays size={14} className="mr-1 inline"/>Data inicial</span>
          <input type="date" className={inputClass} value={dataInicial} onChange={e=>setDataInicial(e.target.value)}/></label>
        <label><span className={labelClass}><CalendarDays size={14} className="mr-1 inline"/>Data final</span>
          <input type="date" className={inputClass} value={dataFinal} onChange={e=>setDataFinal(e.target.value)}/></label>
        <button type="button" onClick={carregar} disabled={carregando}
          className="flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-orange-600 px-5 font-semibold text-white disabled:opacity-50">
          <RefreshCw size={18} className={carregando ? "animate-spin": ""}/> Atualizar
        </button>
      </div>
    </div>
    {atualizado && <p className="text-xs text-slate-500">Atualizado às {atualizado.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}. Apenas comandas fechadas no período.</p>}
    {erro && <div role="alert" className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-4 text-sm text-amber-200">{erro}</div>}
    {carregando ? <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">Gerando relatório...</div> : <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card titulo="Faturamento" valor={dinheiro(faturamento)} detalhe={`${comandas.length} contas fechadas`} icone={Banknote}/>
        <Card titulo="Ticket médio" valor={dinheiro(comandas.length ? faturamento/comandas.length : 0)} detalhe="Valor médio por comanda" icone={TrendingUp}/>
        <Card titulo="Produtos vendidos" valor={unidades} detalhe="Unidades no período" icone={ShoppingCart}/>
        <Card titulo="Comandas" valor={comandas.length} detalhe="Contas fechadas" icone={ClipboardList}/>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-bold text-white">Resumo financeiro</h2>
          <p className="mt-1 text-sm text-slate-400">Composição do faturamento</p>
          <dl className="mt-5 space-y-4">
            {[["Consumo",consumo],["Acréscimos",acrescimos],["Descontos",descontos],["Faturamento",faturamento]].map(([nome,valor])=>
              <div key={nome} className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <dt className="text-slate-300">{nome}</dt>
                <dd className={`font-bold ${nome==="Faturamento"?"text-emerald-300":"text-white"}`}>{dinheiro(valor)}</dd>
              </div>)}
          </dl>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
          <h2 className="flex items-center gap-2 font-bold text-white"><Package size={20} className="text-emerald-300"/>Produtos mais vendidos</h2>
          <p className="mt-1 text-sm text-slate-400">Ranking por unidades</p>
          {!produtos.length ? <div className="mt-5"><Vazio texto="Nenhum produto vendido neste período."/></div> :
            <ol className="mt-5 space-y-2">{produtos.map((p,i)=>
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-4 py-3">
                <div className="min-w-0"><span className="mr-2 text-orange-300">{i+1}.</span><span className="font-semibold text-white">{p.nome}</span>
                  <p className="text-xs text-slate-500">{p.quantidade} unidades</p></div>
                <strong className="shrink-0 text-emerald-300">{dinheiro(p.total)}</strong>
              </li>)}</ol>}
        </article>
      </div>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 font-bold text-white"><Users size={20} className="text-orange-400"/>Desempenho da equipe</h2>
        <p className="mt-1 text-sm text-slate-400">Comandas fechadas por responsável registrado</p>
        {!equipe.length ? <div className="mt-4"><Vazio texto="Nenhuma movimentação encontrada."/></div> :
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[550px] text-left text-sm">
            <thead><tr className="border-b border-slate-700 text-slate-400"><th className="py-3">Responsável</th><th className="py-3 text-center">Comandas</th><th className="py-3 text-right">Valor</th><th className="py-3 text-right">Ticket médio</th></tr></thead>
            <tbody>{equipe.map(u=><tr key={u.id} className="border-b border-slate-800">
              <td className="py-3 text-white">{u.nome}</td><td className="py-3 text-center">{u.quantidade}</td>
              <td className="py-3 text-right text-emerald-300">{dinheiro(u.total)}</td>
              <td className="py-3 text-right">{dinheiro(u.total/u.quantidade)}</td>
            </tr>)}</tbody>
          </table></div>}
      </article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="font-bold text-white">Histórico de comandas</h2><p className="text-sm text-slate-400">Contas fechadas no período</p></div>
          <div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input type="search" aria-label="Pesquisar cliente ou responsável" value={busca} onChange={e=>setBusca(e.target.value)}
              placeholder="Cliente ou responsável..." className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white md:w-72"/>
          </div>
        </div>
        {!historico.length ? <div className="mt-4"><Vazio texto="Nenhuma comanda encontrada."/></div> :
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
            <thead><tr className="border-b border-slate-700 text-slate-400">
              <th className="py-3">Data</th><th className="py-3">Cliente</th><th className="py-3">Responsável</th><th className="py-3 text-right">Consumo</th><th className="py-3 text-right">Total</th>
            </tr></thead>
            <tbody>{historico.map(c=><tr key={c.id} className="border-b border-slate-800">
              <td className="py-3 text-slate-300">{dataHora(c.fechada_em)}</td>
              <td className="py-3 font-medium text-white">{c.cliente || "Não informado"}</td>
              <td className="py-3 text-slate-300">{nomes.get(c.usuario_id) ?? "—"}</td>
              <td className="py-3 text-right text-slate-300">{dinheiro(c.subtotal_consumo ?? c.total)}</td>
              <td className="py-3 text-right font-bold text-emerald-300">{dinheiro(saldo(c))}</td>
            </tr>)}</tbody>
          </table></div>}
      </article>
    </>}
  </section>
}
