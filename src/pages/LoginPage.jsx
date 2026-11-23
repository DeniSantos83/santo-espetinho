import { useState } from "react";
import { supabase } from "../lib/supabase";
import logo from "../assets/Santo Espetinho.png";

function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function fazerLogin(e) {
    e.preventDefault();

    setErro("");
    setCarregando(true);

    try {
      const identificador = usuario.trim().toLowerCase();
      if (identificador.includes("@")) {
        // Compatibilidade durante a migração: contas antigas ainda podem
        // acessar usando e-mail, mesmo sem o campo de e-mail na interface.
        const { error: erroEmail } = await supabase.auth.signInWithPassword({
          email: identificador,
          password: senha,
        });
        if (erroEmail) throw erroEmail;
      } else {
        const { data, error } = await supabase.functions.invoke("login-usuario", {
          body: { usuario: identificador, senha },
        });
        if (error || !data?.access_token || !data?.refresh_token)
          throw new Error("Usuário ou senha inválidos.");
        const { error: erroSessao } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (erroSessao) throw erroSessao;
      }
    } catch {
      setErro("Usuário ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
  <div className="min-h-screen bg-black flex items-center justify-center px-4">
    <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-8">

      <div className="text-center mb-8">
        <img
          src={logo}
          alt="Santo Espetinho"
          className="w-[220px] h-auto block mx-auto"
        />

        <h1 className="text-3xl font-bold text-white mt-4">
          
        </h1>

        <p className="text-zinc-400 mt-2">
          Sistema de Gestão de Mesas e Comandas
        </p>
      </div>

      <form onSubmit={fazerLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Usuário
          </label>

          <input
            type="text"
            placeholder="Ex.: moyses"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Senha
          </label>

          <input
            type="password"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        {erro && (
          <div className="rounded-xl bg-red-950/50 border border-red-800 p-3 text-red-300 text-sm">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-8 pt-4 border-t border-zinc-800 text-center">
        <p className="text-xs text-zinc-500">
          Sistema de Gestão de Mesas e Comandas
        </p>

        <p className="text-xs text-zinc-500 mt-1">
          Versão 1.0
        </p>
      </div>

    </div>
  </div>
);
}

export default LoginPage;