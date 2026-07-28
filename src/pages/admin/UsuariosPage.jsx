import { useEffect, useMemo, useState } from "react"
import {
  CirclePlus,
  Pencil,
  Power,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

const FORMULARIO_INICIAL = {
  nome: "",
  email: "",
  telefone: "",
  senha: "",
  confirmarSenha: "",
  perfil: "garcom",
  ativo: true,
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [usuarioEditando, setUsuarioEditando] = useState(null)

  const [busca, setBusca] = useState("")
  const [filtroPerfil, setFiltroPerfil] = useState("todos")
  const [modalAberto, setModalAberto] = useState(false)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    setCarregando(true)
    setErro("")

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("nome", { ascending: true })

    if (error) {
      console.error("Erro ao carregar usuários:", error)
      setErro("Não foi possível carregar os usuários.")
      setUsuarios([])
    } else {
      setUsuarios(data ?? [])
    }

    setCarregando(false)
  }

  function abrirCadastro() {
    setUsuarioEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function abrirEdicao(usuario) {
    setUsuarioEditando(usuario)

    setFormulario({
      nome: usuario.nome ?? "",
      email: usuario.email ?? "",
      telefone: usuario.telefone ?? "",
      senha: "",
      confirmarSenha: "",
      perfil: usuario.perfil ?? "garcom",
      ativo: usuario.ativo ?? true,
    })

    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setUsuarioEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro("")
  }

  function atualizarCampo(evento) {
    const { name, value, type, checked } = evento.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function salvarUsuario(evento) {
    evento.preventDefault()
    setErro("")
    setMensagem("")

    const nome = formulario.nome.trim()
    const email = formulario.email.trim().toLowerCase()
    const telefone = formulario.telefone.trim()
    const senha = formulario.senha
    const confirmarSenha = formulario.confirmarSenha

    if (!nome) {
      setErro("Informe o nome do usuário.")
      return
    }

    if (!email) {
      setErro("Informe o e-mail do usuário.")
      return
    }

    if (!usuarioEditando) {
      if (senha.length < 6) {
        setErro("A senha inicial deve possuir pelo menos 6 caracteres.")
        return
      }

      if (senha !== confirmarSenha) {
        setErro("A confirmação da senha não confere.")
        return
      }
    }

    setSalvando(true)

    try {
      if (usuarioEditando) {
        const { error } = await supabase
          .from("usuarios")
          .update({
            nome,
            telefone: telefone || null,
            perfil: formulario.perfil,
            ativo: formulario.ativo,
          })
          .eq("id", usuarioEditando.id)

        if (error) throw error

        setMensagem("Usuário atualizado com sucesso.")
      } else {
        const { data, error } = await supabase.functions.invoke(
          "criar-usuario",
          {
            body: {
              nome,
              email,
              telefone: telefone || null,
              senha,
              perfil: formulario.perfil,
              ativo: formulario.ativo,
            },
          }
        )

        if (error) {
          let detalhe = error.message

          try {
            const resposta = await error.context?.json()
            detalhe = resposta?.erro || resposta?.message || detalhe
          } catch {
            // Mantém a mensagem original.
          }

          throw new Error(detalhe)
        }

        if (!data?.sucesso) {
          throw new Error(data?.erro || "Não foi possível cadastrar o usuário.")
        }

        setMensagem(
          `${nome} foi cadastrado com o perfil de ${formatarPerfil(
            formulario.perfil
          )}.`
        )
      }

      setModalAberto(false)
      setUsuarioEditando(null)
      setFormulario(FORMULARIO_INICIAL)
      await carregarUsuarios()
    } catch (erroSalvamento) {
      console.error("Erro ao salvar usuário:", erroSalvamento)
      setErro(
        erroSalvamento.message ||
          "Não foi possível salvar o usuário."
      )
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivacao(usuario) {
    setErro("")
    setMensagem("")

    const novoEstado = !usuario.ativo

    const { error } = await supabase
      .from("usuarios")
      .update({ ativo: novoEstado })
      .eq("id", usuario.id)

    if (error) {
      console.error("Erro ao alterar usuário:", error)
      setErro("Não foi possível alterar o usuário.")
      return
    }

    setMensagem(
      novoEstado
        ? `${usuario.nome} foi ativado.`
        : `${usuario.nome} foi desativado.`
    )

    await carregarUsuarios()
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return usuarios.filter((usuario) => {
      const correspondeBusca =
        !termo ||
        usuario.nome?.toLowerCase().includes(termo) ||
        usuario.email?.toLowerCase().includes(termo)

      const correspondePerfil =
        filtroPerfil === "todos" || usuario.perfil === filtroPerfil

      return correspondeBusca && correspondePerfil
    })
  }, [usuarios, busca, filtroPerfil])

  const totalAtivos = usuarios.filter((usuario) => usuario.ativo).length
  const totalGarcons = usuarios.filter(
    (usuario) => usuario.perfil === "garcom"
  ).length
  const totalGerentes = usuarios.filter(
    (usuario) => usuario.perfil === "gerente"
  ).length

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Usuários</h2>

          <p className="mt-1 text-sm text-slate-400">
            Gerencie administradores, gerentes e garçons.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={carregarUsuarios}
            disabled={carregando}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={carregando ? "animate-spin" : ""}
            />

            Atualizar
          </button>

          <button
            type="button"
            onClick={abrirCadastro}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            <CirclePlus size={20} />
            Novo usuário
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CardResumo titulo="Usuários ativos" valor={totalAtivos} />
        <CardResumo titulo="Gerentes" valor={totalGerentes} />
        <CardResumo titulo="Garçons" valor={totalGarcons} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
          />
        </div>

        <select
          value={filtroPerfil}
          onChange={(evento) => setFiltroPerfil(evento.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
        >
          <option value="todos">Todos os perfis</option>
          <option value="admin">Administradores</option>
          <option value="gerente">Gerentes</option>
          <option value="garcom">Garçons</option>
        </select>
      </div>

      {erro && (
        <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {mensagem}
        </div>
      )}

      {carregando ? (
        <div className="mt-6 flex min-h-48 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
          <RefreshCw className="mr-2 animate-spin" size={20} />
          Carregando usuários...
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="mt-6 flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
          <UserRound size={42} className="text-slate-500" />

          <h3 className="mt-4 text-lg font-bold text-white">
            Nenhum usuário encontrado
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Altere os filtros ou cadastre um novo usuário.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-950/70">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-4">Usuário</th>
                  <th className="px-5 py-4">Perfil</th>
                  <th className="px-5 py-4">Telefone</th>
                  <th className="px-5 py-4">Situação</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{usuario.nome}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {usuario.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase text-blue-300">
                        {formatarPerfil(usuario.perfil)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {usuario.telefone || "Não informado"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          usuario.ativo
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-600 bg-slate-800 text-slate-400"
                        }`}
                      >
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => abrirEdicao(usuario)}
                          className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          title={usuario.ativo ? "Desativar" : "Ativar"}
                          onClick={() => alternarAtivacao(usuario)}
                          className="rounded-lg p-2 text-amber-300 transition hover:bg-amber-500/10"
                        >
                          <Power size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalAberto && (
        <ModalUsuario
          formulario={formulario}
          usuarioEditando={usuarioEditando}
          salvando={salvando}
          erro={erro}
          aoAtualizarCampo={atualizarCampo}
          aoSalvar={salvarUsuario}
          aoFechar={fecharModal}
        />
      )}
    </section>
  )
}

function CardResumo({ titulo, valor }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-white">{valor}</p>
    </div>
  )
}

function ModalUsuario({
  formulario,
  usuarioEditando,
  salvando,
  erro,
  aoAtualizarCampo,
  aoSalvar,
  aoFechar,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              {usuarioEditando ? "Editar usuário" : "Cadastrar usuário"}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Informe os dados de acesso e o perfil.
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={aoSalvar} className="space-y-5 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Nome *
            </label>

            <input
              name="nome"
              type="text"
              value={formulario.nome}
              onChange={aoAtualizarCampo}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              E-mail *
            </label>

            <input
              name="email"
              type="email"
              value={formulario.email}
              onChange={aoAtualizarCampo}
              disabled={Boolean(usuarioEditando)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {!usuarioEditando && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Senha inicial *
                </label>

                <input
                  name="senha"
                  type="password"
                  value={formulario.senha}
                  onChange={aoAtualizarCampo}
                  minLength={6}
                  autoComplete="new-password"
                  required
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Confirmar senha *
                </label>

                <input
                  name="confirmarSenha"
                  type="password"
                  value={formulario.confirmarSenha}
                  onChange={aoAtualizarCampo}
                  minLength={6}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Telefone
            </label>

            <input
              name="telefone"
              type="text"
              value={formulario.telefone}
              onChange={aoAtualizarCampo}
              placeholder="(79) 99999-9999"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Perfil *
            </label>

            <select
              name="perfil"
              value={formulario.perfil}
              onChange={aoAtualizarCampo}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
            >
              <option value="garcom">Garçom</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
            <div>
              <p className="font-medium text-white">Usuário ativo</p>
              <p className="mt-1 text-xs text-slate-400">
                Usuários inativos não poderão utilizar o sistema.
              </p>
            </div>

            <input
              name="ativo"
              type="checkbox"
              checked={formulario.ativo}
              onChange={aoAtualizarCampo}
              className="h-5 w-5 accent-orange-600"
            />
          </label>

          {erro && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {erro}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoFechar}
              disabled={salvando}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
            >
              {salvando
                ? "Salvando..."
                : usuarioEditando
                  ? "Salvar alterações"
                  : "Cadastrar usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatarPerfil(perfil) {
  const nomes = {
    admin: "Administrador",
    gerente: "Gerente",
    garcom: "Garçom",
  }

  return nomes[perfil] ?? perfil
}