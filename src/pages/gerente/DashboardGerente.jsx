import { useState } from "react"
import { ClipboardList, LogOut, Package, RefreshCw, ShieldCheck } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import ComandasPage from "../admin/ComandasPage"
import DisponibilidadeProdutosPage from "./DisponibilidadeProdutosPage"
import { supabase } from "../../lib/supabase"

const secoes = [
  { id: "comandas", rotulo: "Comandas e caixa", descricao: "Atendimento, reservas e fechamento", Icone: ClipboardList },
  { id: "produtos", rotulo: "Disponibilidade", descricao: "Controle do cardápio em tempo real", Icone: Package },
]

export default function DashboardGerente() {
  const { perfil, sair } = useAuth()
  const [saindo, setSaindo] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState("comandas")

  async function encerrarSessao() {
    if (saindo) return
    setSaindo(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      await sair()
    } catch (erro) {
      console.error("Não foi possível encerrar a sessão:", erro)
      alert("Não foi possível sair. Tente novamente.")
    } finally {
      setSaindo(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}logo-espetaria.webp`}
              alt="Nova Espetaria Bar"
              className="h-12 w-14 shrink-0 object-contain sm:h-14 sm:w-20"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-white sm:text-base">Nova Espetaria Bar</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck size={13} className="shrink-0 text-orange-400" />
                <span className="truncate">Painel da gerência</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="max-w-44 truncate text-sm font-semibold text-slate-100">{perfil?.nome || "Gerente"}</p>
              <p className="text-xs text-slate-400">Gerência e caixa</p>
            </div>
            <button
              type="button"
              disabled={saindo}
              onClick={encerrarSessao}
              aria-label="Encerrar sessão"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 transition hover:border-red-500/50 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:opacity-50"
            >
              {saindo ? <RefreshCw size={17} className="animate-spin" /> : <LogOut size={17} />}
              <span className="hidden sm:inline">{saindo ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 pb-10 pt-5 sm:px-6 sm:pt-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Operação do bar</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Central de atendimento</h1>
          <p className="mt-2 text-sm text-slate-400">Acompanhe as comandas e ajuste a disponibilidade dos produtos em um só lugar.</p>
        </div>

        <nav aria-label="Menu da gerência" className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 sm:gap-3 sm:p-2">
          {secoes.map(({ id, rotulo, descricao, Icone }) => {
            const ativa = abaAtiva === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAbaAtiva(id)}
                aria-current={ativa ? "page" : undefined}
                className={`flex min-h-[64px] items-center gap-2 rounded-xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:gap-3 sm:px-4 ${ativa ? "border-orange-500/60 bg-orange-600 text-white shadow-lg shadow-orange-950/30" : "border-transparent bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ativa ? "bg-white/15" : "bg-slate-800"}`}>
                  <Icone size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-tight sm:text-sm">{rotulo}</span>
                  <span className={`mt-1 hidden text-xs sm:block ${ativa ? "text-orange-100" : "text-slate-500"}`}>{descricao}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div id="conteudo-gerencia">
          {abaAtiva === "comandas" ? <ComandasPage /> : <DisponibilidadeProdutosPage />}
        </div>
      </main>
    </div>
  )
}
