import { createContext, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [usuarioAuth, setUsuarioAuth] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erroPerfil, setErroPerfil] = useState("")
  const revisaoRef = useRef(0)

  useEffect(() => {
    let ativo = true

    async function carregarSessao(session, revisao) {
      if (!ativo || revisao !== revisaoRef.current) return
      const user = session?.user ?? null

      setCarregando(true)
      setErroPerfil("")
      setUsuarioAuth(user)
      setPerfil(null)

      if (!user) {
        setCarregando(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .eq("auth_id", user.id)
          .maybeSingle()

        if (!ativo || revisao !== revisaoRef.current) return
        if (error) throw error

        if (!data?.ativo || !["admin", "gerente", "garcom"].includes(data.perfil)) {
          setErroPerfil("Seu usuário não possui um perfil ativo. Contate o administrador.")
        } else {
          setPerfil(data)
        }
      } catch (erro) {
        if (!ativo || revisao !== revisaoRef.current) return
        console.error("Erro ao recuperar perfil:", erro)
        setErroPerfil("Não foi possível carregar seu perfil. Verifique a conexão e atualize a página.")
      } finally {
        if (ativo && revisao === revisaoRef.current) setCarregando(false)
      }
    }

    // Não executar uma consulta Supabase dentro do callback de AuthStateChange:
    // o cliente pode aguardar o callback antes de liberar operações de autenticação.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN" &&
          event !== "SIGNED_OUT" && event !== "USER_UPDATED") return

      const proximoId = session?.user?.id ?? null
      // Um SIGNED_IN repetido não deve interromper uma consulta de perfil em andamento.
      revisaoRef.current += 1
      const revisao = revisaoRef.current
      Promise.resolve().then(() => carregarSessao(session, revisao))
    })

    return () => {
      ativo = false
      revisaoRef.current += 1
      subscription.unsubscribe()
    }
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    setUsuarioAuth(null)
    setPerfil(null)
    setErroPerfil("")
  }

  return (
    <AuthContext.Provider value={{
      usuarioAuth,
      perfil,
      carregando,
      erroPerfil,
      sair,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
