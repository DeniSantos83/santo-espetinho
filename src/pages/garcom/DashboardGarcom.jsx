import { useEffect, useState } from "react"
import { BookOpen, ClipboardList, LogOut } from "lucide-react"
import { supabase } from "../../lib/supabase"
import ComandaPage from "./ComandaPage";
import CardapioPage from "./CardapioPage";

export default function DashboardGarcom() {
  const [nomeUsuario, setNomeUsuario] = useState("Garçom")
  const [saindo, setSaindo] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState("mesas")

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

      window.location.href = import.meta.env.BASE_URL
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
            <img src={`${import.meta.env.BASE_URL}logo-espetaria.webp`} alt="Nova Espetaria Bar" className="h-12 w-16 shrink-0 rounded-lg object-cover" />

            <div className="min-w-0">
              <h1 className="truncate font-bold text-white">
                Nova Espetaria Bar
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

      <main className="mx-auto max-w-7xl px-3 py-4 sm:p-6">
        <nav aria-label="Menu do garçom" className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-1.5 sm:max-w-md">
          <button type="button" onClick={() => setAbaAtiva("mesas")}
            aria-current={abaAtiva === "mesas" ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${abaAtiva === "mesas" ? "bg-orange-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <ClipboardList size={18} /> Mesas e pedidos
          </button>
          <button type="button" onClick={() => setAbaAtiva("cardapio")}
            aria-current={abaAtiva === "cardapio" ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${abaAtiva === "cardapio" ? "bg-orange-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <BookOpen size={18} /> Cardápio
          </button>
        </nav>
        {abaAtiva === "mesas" ? <ComandaPage /> : <CardapioPage />}
      </main>

      <div className="h-6" />
    </div>
  )
}