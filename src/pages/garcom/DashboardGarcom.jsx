import { useEffect, useState } from "react"
import { BookOpen, ClipboardList, LogOut, UserRound } from "lucide-react"
import { supabase } from "../../lib/supabase"
import logoEspetaria from "../../assets/espetariabar.png"
import ComandaPage from "./ComandaPage"
import CardapioPage from "./CardapioPage"

const abas = [
  { id: "mesas", nome: "Mesas e pedidos", nomeCurto: "Mesas", icone: ClipboardList },
  { id: "cardapio", nome: "Cardápio", nomeCurto: "Cardápio", icone: BookOpen },
]

export default function DashboardGarcom() {
  const [nomeUsuario, setNomeUsuario] = useState("Garçom")
  const [saindo, setSaindo] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState("mesas")

  useEffect(() => {
    let ativo = true

    async function carregarUsuario() {
      try {
        const { data: { user }, error: erroAuth } = await supabase.auth.getUser()
        if (erroAuth || !user || !ativo) return

        const { data: usuario, error: erroUsuario } = await supabase
          .from("usuarios")
          .select("nome")
          .eq("auth_id", user.id)
          .maybeSingle()

        if (ativo && !erroUsuario && usuario?.nome) setNomeUsuario(usuario.nome)
      } catch (erro) {
        console.error("Erro ao carregar usuário:", erro)
      }
    }

    carregarUsuario()
    return () => { ativo = false }
  }, [])

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
    <div className="min-h-screen bg-[#0a101b] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[.08] bg-[#0d1421]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoEspetaria}
              alt="Nova Espetaria Bar"
              className="h-[52px] w-[72px] shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[.13em] text-orange-400">
                Nova Espetaria Bar
              </p>
              <h1 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
                Atendimento
              </h1>
              <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                <UserRound size={12} aria-hidden="true" /> {nomeUsuario}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            aria-label={saindo ? "Saindo do sistema" : "Sair do sistema"}
            title="Sair do sistema"
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-50"
          >
            <LogOut size={18} aria-hidden="true" />
            <span className="hidden text-sm font-semibold sm:inline">{saindo ? "Saindo..." : "Sair"}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-6 sm:pt-6">
        <div className="mb-4 hidden sm:block">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-orange-400">Painel do garçom</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {abaAtiva === "mesas" ? "Mesas e pedidos" : "Cardápio"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {abaAtiva === "mesas" ? "Acompanhe o atendimento e lance os pedidos das mesas." : "Consulte os produtos e os preços disponíveis."}
          </p>
        </div>

        <nav
          aria-label="Navegação do atendimento"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/10 bg-[#101827]/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:static sm:mb-5 sm:inline-grid sm:w-auto sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#121b2b] sm:p-1.5 sm:shadow-none"
        >
          {abas.map(({ id, nome, nomeCurto, icone: Icone }) => {
            const ativo = abaAtiva === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAbaAtiva(id)}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-[54px] min-w-[130px] flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:min-h-11 sm:flex-row sm:gap-2 sm:text-sm ${ativo ? "bg-orange-600 text-white shadow-lg shadow-orange-950/30" : "text-slate-400 hover:bg-white/[.07] hover:text-white"}`}
              >
                <Icone size={20} aria-hidden="true" />
                <span className="sm:hidden">{nomeCurto}</span>
                <span className="hidden sm:inline">{nome}</span>
              </button>
            )
          })}
        </nav>

        <main className="min-w-0 pb-28 sm:pb-8" id="conteudo-atendimento">
          {abaAtiva === "mesas" ? <ComandaPage /> : <CardapioPage />}
        </main>
      </div>
    </div>
  )
}
