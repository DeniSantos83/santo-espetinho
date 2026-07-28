import { useEffect, useState } from "react"
import { LogOut, UtensilsCrossed } from "lucide-react"
import { supabase } from "../../lib/supabase"
import ComandaPage from "./comandapage"

export default function DashboardGarcom() {
  const [nomeUsuario, setNomeUsuario] = useState("Garçom")
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    carregarUsuario()
  }, [])

  async function carregarUsuario() {
    try {
      const {
        data: { user },
        error: erroAuth,
      } = await supabase.auth.getUser()

      if (erroAuth || !user) return

      const { data: usuario, error: erroUsuario } = await supabase
        .from("usuarios")
        .select("nome")
        .eq("auth_id", user.id)
        .maybeSingle()

      if (!erroUsuario && usuario?.nome) {
        setNomeUsuario(usuario.nome)
      }
    } catch (erro) {
      console.error("Erro ao carregar usuário:", erro)
    }
  }

  async function sair() {
    if (saindo) return

    setSaindo(true)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      window.location.href = "/"
    } catch (erro) {
      console.error("Erro ao sair:", erro)
      alert("Não foi possível sair do sistema.")
      setSaindo(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-orange-600 p-2.5 text-white">
              <UtensilsCrossed size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate font-bold text-white">
                Santo Espetinho
              </h1>

              <p className="truncate text-xs text-slate-400">
                {nomeUsuario} • Atendimento
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 disabled:opacity-50"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">
              {saindo ? "Saindo..." : "Sair"}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <ComandaPage />
      </main>

      <div className="h-6" />
    </div>
  )
}