import { Menu } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"

export default function Header({ titulo }) {
  const { perfil } = useAuth()

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 md:px-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white">{titulo}</h2>
        <p className="text-sm text-slate-400">
          {perfil?.nome} — {perfil?.perfil}
        </p>
      </div>

      <button className="md:hidden text-white">
        <Menu />
      </button>
    </header>
  )
}