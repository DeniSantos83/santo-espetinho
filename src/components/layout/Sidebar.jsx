import { useEffect } from "react"
import {
  LayoutDashboard, Users, Armchair, Utensils, FolderTree, ClipboardList,
  BarChart3, LogOut, X, ChevronRight, ShieldCheck,
} from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import logoEspetaria from "../../assets/espetariabar.png"

const grupos = [
  {
    titulo: "Visão geral",
    itens: [{ id: "dashboard", nome: "Dashboard", icone: LayoutDashboard }],
  },
  {
    titulo: "Operação",
    itens: [
      { id: "comandas", nome: "Comandas e caixa", icone: ClipboardList },
      { id: "mesas", nome: "Mesas", icone: Armchair },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { id: "produtos", nome: "Produtos", icone: Utensils },
      { id: "categorias", nome: "Categorias", icone: FolderTree },
      { id: "usuarios", nome: "Usuários", icone: Users },
      { id: "relatorios", nome: "Relatórios", icone: BarChart3 },
    ],
  },
]

export default function Sidebar({ paginaAtiva, setPaginaAtiva, aberto = false, aoFechar = () => {} }) {
  const { perfil, sair } = useAuth()

  useEffect(() => {
    if (!aberto) return
    function aoTeclado(evento) { if (evento.key === "Escape") aoFechar() }
    window.addEventListener("keydown", aoTeclado)
    return () => window.removeEventListener("keydown", aoTeclado)
  }, [aberto, aoFechar])

  function navegar(pagina) {
    setPaginaAtiva(pagina)
    aoFechar()
  }

  return (
    <>
      {aberto && (
        <button type="button" aria-label="Fechar menu" onClick={aoFechar}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden" />
      )}
      <aside aria-label="Menu administrativo"
        className={`fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col border-r border-white/[.07] bg-[#0e1421] text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-none ${aberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex min-h-[158px] items-start justify-between border-b border-white/[.07] px-6 pb-5 pt-5">
          <div className="min-w-0">
            <img src={logoEspetaria} alt="Nova Espetaria Bar" className="h-[98px] w-[190px] object-contain object-left" />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.24em] text-slate-500">Gestão do estabelecimento</p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar menu" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"><X size={20}/></button>
        </div>

        <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Páginas">
          {grupos.map(grupo => (
            <div key={grupo.titulo}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-slate-500">{grupo.titulo}</p>
              <div className="space-y-1">
                {grupo.itens.map(item => {
                  const Icone = item.icone
                  const ativo = item.id === paginaAtiva
                  return (
                    <button key={item.id} type="button" onClick={() => navegar(item.id)}
                      aria-current={ativo ? "page" : undefined}
                      className={`group flex min-h-[46px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${ativo ? "border-orange-500/25 bg-orange-500/15 text-orange-300" : "border-transparent text-slate-400 hover:bg-white/[.045] hover:text-white"}`}>
                      <Icone size={19} className={ativo ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300"}/>
                      <span className="min-w-0 flex-1">{item.nome}</span>
                      {ativo && <ChevronRight size={16} className="text-orange-400" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[.07] p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[.035] px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-300"><ShieldCheck size={19}/></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{perfil?.nome || "Administrador"}</p>
              <p className="text-xs capitalize text-slate-500">{perfil?.perfil || "admin"}</p>
            </div>
          </div>
          <button type="button" onClick={sair} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300">
            <LogOut size={18}/> Encerrar sessão
          </button>
        </div>
      </aside>
    </>
  )
}
