import { createContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [usuarioAuth, setUsuarioAuth] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      setUsuarioAuth(user)

      if (user) {
        carregarPerfil(user)
      } else {
        setPerfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function carregarSessao() {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user ?? null

    setUsuarioAuth(user)

    if (user) {
      await carregarPerfil(user)
    }

    setCarregando(false)
  }

  async function carregarPerfil(user) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_id", user.id)
      .single()

    if (error) {
      console.error("Erro ao carregar perfil:", error)
      setPerfil(null)
      return
    }

    setPerfil(data)
  }

  async function sair() {
    await supabase.auth.signOut()
    setUsuarioAuth(null)
    setPerfil(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuarioAuth,
        perfil,
        carregando,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}