import { Menu, ShieldCheck } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"

const subtitulos = {
  "Dashboard": "Acompanhe o movimento e os indicadores do bar",
  "Comandas": "Controle de mesas, pedidos e fechamento de contas",
  "Mesas": "Organize os espaços de atendimento",
  "Produtos": "Gerencie o cardápio e os preços",
  "Categorias": "Organize os itens do cardápio",
  "Usuários": "Equipe e permissões de acesso",
  "Relatórios": "Análise das vendas e da operação",
}

export default function Header({ titulo, aoAbrirMenu = () => {} }) {
  const { perfil } = useAuth()
  return (
    <header className="sticky top-0 z-30 border-b border-white/[.07] bg-[#0a101b]/95 px-4 py-4 backdrop-blur-xl sm:px-6 xl:px-8">
      <div className="flex min-h-[48px] items-center gap-3">
        <button type="button" onClick={aoAbrirMenu} aria-label="Abrir menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 lg:hidden"><Menu size={21}/></button>
        <div className="min-w-0 flex-1">
          <p className="hidden text-[10px] font-bold uppercase tracking-[.22em] text-orange-400 sm:block">Nova Espetaria Bar / Administrativo</p>
          <h1 className="truncate text-xl font-bold tracking-tight text-white sm:mt-1 sm:text-2xl">{titulo}</h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{subtitulos[titulo] || "Painel de gestão"}</p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[.06] px-3 py-2 text-xs font-semibold text-emerald-300 md:flex"><ShieldCheck size={14}/> Ambiente administrativo</div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/25 bg-orange-500/15 font-bold text-orange-300" title={perfil?.nome || "Administrador"}>
          {(perfil?.nome || "A").trim().charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
