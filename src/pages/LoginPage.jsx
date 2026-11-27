import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";

import logo from "../assets/espetariabar.png";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function fazerLogin(evento) {
    evento.preventDefault();
    if (carregando) return;

    setErro("");
    setCarregando(true);

    try {
      const identificador = usuario.trim().toLowerCase();
      if (identificador.includes("@")) {
        // Preserva o acesso por e-mail de contas anteriores à migração.
        const { error: erroEmail } = await supabase.auth.signInWithPassword({
          email: identificador,
          password: senha,
        });
        if (erroEmail) throw erroEmail;
      } else {
        // Preserva a autenticação atual por nome de usuário.
        const { data, error } = await supabase.functions.invoke("login-usuario", {
          body: { usuario: identificador, senha },
        });
        if (error) {
          // Preserva a natureza da falha: rede, resposta HTTP ou autenticação.
          // Não tratar indisponibilidade do serviço como senha incorreta.
          if (error.name === "FunctionsFetchError" || error.name === "FunctionsRelayError") {
            throw new Error("Não foi possível acessar o servidor de login. Verifique a rede, firewall ou proxy.");
          }
          const status = error.context?.status;
          if (status === 429) {
            throw new Error("Muitas tentativas. Tente novamente em 15 minutos.");
          }
          if (status === 401 || status === 400) {
            throw new Error("Usuário ou senha inválidos.");
          }
          throw new Error("Serviço de login indisponível. Verifique sua conexão e tente novamente.");
        }
        if (!data?.access_token || !data?.refresh_token) {
          throw new Error("O servidor não devolveu uma sessão válida.");
        }
        const { error: erroSessao } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (erroSessao) throw erroSessao;
      }
    } catch (falha) {
      console.error("Falha ao autenticar:", falha);
      const mensagem = String(falha?.message ?? "");
      if (/Failed to fetch|NetworkError|ERR_|fetch failed|network request failed/i.test(mensagem)) {
        setErro("Falha de conexão com o Supabase. Verifique firewall, proxy ou acesso à rede.");
      } else if (/Invalid login credentials|Email not confirmed|Usuário ou senha inválidos/i.test(mensagem)) {
        setErro("Usuário ou senha inválidos. Confira os dados e tente novamente.");
      } else {
        setErro(mensagem || "Não foi possível concluir o login.");
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080a0e] text-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,540px)]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#171b23] via-[#10131a] to-[#0b0c10] p-10 lg:flex xl:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-orange-600/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 bottom-1/4 h-96 w-96 rounded-full bg-orange-600/5 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
            <ShieldCheck size={15} /> Plataforma de gestão
          </div>
        </div>
        <div className="relative max-w-xl">
          <img src={logo} alt="Nova Espetaria Bar" className="mb-9 h-auto w-full max-w-[390px] object-contain xl:max-w-[440px]" />
          <p className="text-sm font-semibold uppercase tracking-[0.23em] text-orange-400">Organização no atendimento</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            Tudo o que sua operação precisa, em um só lugar.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
            Controle de mesas, pedidos e comandas com praticidade para toda a equipe.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">Nova Espetaria Bar · Sistema de gestão</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center lg:hidden">
            <img src={logo} alt="Nova Espetaria Bar" className="mx-auto mb-5 h-auto w-52 max-w-full object-contain sm:w-60" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Sistema de gestão</p>
          </div>

          <div className="mb-8">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400">
              <LockKeyhole size={13} className="text-orange-400" /> Acesso restrito à equipe
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Acesse sua conta</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Entre com suas credenciais para continuar o atendimento.
            </p>
          </div>

          <form onSubmit={fazerLogin} className="space-y-5">
            <div>
              <label htmlFor="login-usuario" className="mb-2 block text-sm font-semibold text-slate-200">Usuário</label>
              <div className="relative">
                <UserRound aria-hidden="true" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="login-usuario" name="usuario" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  placeholder="Digite seu usuário" value={usuario} onChange={(e) => { setUsuario(e.target.value); if (erro) setErro(""); }}
                  disabled={carregando} required autoFocus
                  className="min-h-14 w-full rounded-2xl border border-slate-700/80 bg-[#151922] py-3 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60" />
              </div>
            </div>

            <div>
              <label htmlFor="login-senha" className="mb-2 block text-sm font-semibold text-slate-200">Senha</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="login-senha" name="senha" type={mostrarSenha ? "text" : "password"} autoComplete="current-password"
                  placeholder="Digite sua senha" value={senha} onChange={(e) => { setSenha(e.target.value); if (erro) setErro(""); }}
                  disabled={carregando} required
                  className="min-h-14 w-full rounded-2xl border border-slate-700/80 bg-[#151922] py-3 pl-12 pr-14 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60" />
                <button type="button" onClick={() => setMostrarSenha((atual) => !atual)} disabled={carregando}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} aria-pressed={mostrarSenha}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-50">
                  {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {erro && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200">
                {erro}
              </div>
            )}

            <button type="submit" disabled={carregando}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-base font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-wait disabled:opacity-60">
              {carregando ? (
                <><span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Entrando...</>
              ) : (
                <>Entrar no sistema <ArrowRight size={19} /></>
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-slate-800/90 pt-6 text-center text-xs leading-relaxed text-slate-500">
            Acesso exclusivo para colaboradores autorizados.
          </p>
        </div>
      </main>
    </div>
  );
}
