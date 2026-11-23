import { Routes, Route, Navigate } from "react-router-dom"

import LoginPage from "../pages/LoginPage"
import DashboardAdmin from "../pages/admin/DashboardAdmin"
import DashboardGerente from "../pages/gerente/DashboardGerente"
import DashboardGarcom from "../pages/garcom/DashboardGarcom"

import { useAuth } from "../hooks/useAuth"

export default function AppRoutes() {
  const { usuarioAuth, perfil, carregando, erroPerfil, sair } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Carregando seu perfil...
      </div>
    )
  }

  if (!usuarioAuth) {
    return <LoginPage />
  }

  if (!perfil) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 text-white flex items-center justify-center">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-slate-900 p-6 text-center">
          <h1 className="text-lg font-bold">Não foi possível abrir o sistema</h1>
          <p role="alert" className="mt-3 text-sm text-slate-300">
            {erroPerfil || "Perfil de usuário não encontrado."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()}
              className="rounded-lg bg-orange-600 px-4 py-2 font-semibold">Tentar novamente</button>
            <button type="button" onClick={sair}
              className="rounded-lg border border-slate-600 px-4 py-2">Sair</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <Routes>
      {perfil.perfil === "admin" && (
        <Route path="*" element={<DashboardAdmin />} />
      )}
      {perfil.perfil === "gerente" && (
        <Route path="*" element={<DashboardGerente />} />
      )}
      {perfil.perfil === "garcom" && (
        <Route path="*" element={<DashboardGarcom />} />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
