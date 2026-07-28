import {
  LayoutDashboard,
  Users,
  Armchair,
  Utensils,
  FolderTree,
  ClipboardList,
  BarChart3,
  LogOut,
} from "lucide-react"
import { useAuth } from "../../hooks/useAuth"

export default function Sidebar({
  paginaAtiva,
  setPaginaAtiva,
}) {
  const { perfil, sair } = useAuth()

  const menusAdmin = [
    {
      id: "dashboard",
      nome: "Dashboard",
      icone: LayoutDashboard,
    },
    {
      id: "usuarios",
      nome: "Usuários",
      icone: Users,
    },
    {
      id: "mesas",
      nome: "Mesas",
      icone: Armchair,
    },
    {
      id: "produtos",
      nome: "Produtos",
      icone: Utensils,
    },
    {
      id: "categorias",
      nome: "Categorias",
      icone: FolderTree,
    },
    {
      id: "comandas",
      nome: "Comandas",
      icone: ClipboardList,
    },
    {
      id: "relatorios",
      nome: "Relatórios",
      icone: BarChart3,
    },
  ]

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-slate-800 bg-slate-950 p-4 text-white md:flex">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-orange-500">
          Comandas Bar
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          {perfil?.nome}
        </p>

        <p className="text-xs uppercase text-slate-500">
          {perfil?.perfil}
        </p>
      </div>

      <nav className="flex-1 space-y-2">
        {menusAdmin.map((item) => {
          const Icone = item.icone
          const ativo = paginaAtiva === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPaginaAtiva(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                ativo
                  ? "bg-orange-600 text-white"
                  : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              <Icone size={20} />
              <span>{item.nome}</span>
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={sair}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-red-300 transition hover:bg-red-500/10"
      >
        <LogOut size={20} />
        Sair
      </button>
    </aside>
  )
}