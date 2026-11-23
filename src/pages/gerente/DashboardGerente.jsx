import { useState } from "react"
import { ClipboardList, LogOut, RefreshCw, UtensilsCrossed } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import ComandasPage from "../admin/ComandasPage"
import { supabase } from "../../lib/supabase"

export default function DashboardGerente() {
  const { perfil, sair } = useAuth()
  const [saindo, setSaindo] = useState(false)

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
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}logo-espetaria.webp`}
              alt="Nova Espetaria Bar"
              className="h-12 w-16 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">Nova Espetaria Bar</h1>
              <p className="truncate text-xs text-slate-400">
                {perfil?.nome || "Gerente"} • Gerência e caixa
              </p>
            </div>
          </div>
          <button type="button" disabled={saindo} onClick={encerrarSessao}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50">
            {saindo ? <RefreshCw size={18} className="animate-spin" /> : <LogOut size={18} />}
            <span className="hidden sm:inline">{saindo ? "Saindo..." : "Sair"}</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-3 sm:p-6">
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">Operação do bar</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <ClipboardList size={24} className="text-orange-400" /> Comandas e caixa
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Consulte mesas, confira a pré-conta e encerre as comandas após receber o pagamento.
          </p>
        </div>
        <ComandasPage />
      </main>
    </div>
  )
}
