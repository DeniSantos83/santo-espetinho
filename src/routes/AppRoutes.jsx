import { Routes, Route, Navigate } from "react-router-dom"

import LoginPage from "../pages/LoginPage"

import DashboardAdmin from "../pages/admin/DashboardAdmin"
import DashboardGerente from "../pages/gerente/DashboardGerente"
import DashboardGarcom from "../pages/garcom/DashboardGarcom"

import { useAuth } from "../hooks/useAuth"

export default function AppRoutes() {
  const { usuarioAuth, perfil, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Carregando...
      </div>
    )
  }

  if (!usuarioAuth) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      {perfil?.perfil === "admin" && (
        <Route path="*" element={<DashboardAdmin />} />
      )}

      {perfil?.perfil === "gerente" && (
        <Route path="*" element={<DashboardGerente />} />
      )}

      {perfil?.perfil === "garcom" && (
        <Route path="*" element={<DashboardGarcom />} />
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}