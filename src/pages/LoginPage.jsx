import { useState } from "react"
import { supabase } from "../lib/supabase"
import logo from "../assets/Santo Espetinho.png"

function LoginPage() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState("")

  async function fazerLogin(e) {
    e.preventDefault()
    setErro("")
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro("E-mail ou senha inválidos.")
      setCarregando(false)
      return
    }

    setCarregando(false)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 p-8">

        <div className="text-center mb-8">

          <img
            src={logo}
            alt="Santo Espetinho"
            className="w-120 mx-auto mb-5"
          />

          <h1 className="text-3xl font-bold text-gray-800">
            
          </h1>

          <p className="text-gray-500 mt-2">
            Gestão de Mesas e Comandas
          </p>

        </div>

        <form onSubmit={fazerLogin} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail
            </label>

            <input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>

            <input
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-orange-600 py-3 text-lg font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

        </form>

        <div className="mt-8 border-t pt-4 text-center">

          <p className="text-xs text-gray-400">
            Sistema de Gestão de Mesas e Comandas
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Versão 1.0
          </p>

        </div>

      </div>
    </div>
  )
}

export default LoginPage