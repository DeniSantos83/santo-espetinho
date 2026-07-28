import { useEffect, useState } from "react"
import {
  Armchair,
  CirclePlus,
  Pencil,
  Trash2,
  X,
  Power,
  RefreshCw,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

const FORMULARIO_INICIAL = {
  numero: "",
  nome: "",
  status: "livre",
  ativa: true,
}

export default function MesasPage() {
  const [mesas, setMesas] = useState([])
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [mesaEditando, setMesaEditando] = useState(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarMesas()
  }, [])

  async function carregarMesas() {
    setCarregando(true)
    setErro("")

    const { data, error } = await supabase
      .from("mesas")
      .select("*")
      .order("numero", { ascending: true })

    if (error) {
      console.error("Erro ao carregar mesas:", error)
      setErro("Não foi possível carregar as mesas.")
      setMesas([])
    } else {
      setMesas(data ?? [])
    }

    setCarregando(false)
  }

  function abrirCadastro() {
    setMesaEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function abrirEdicao(mesa) {
    setMesaEditando(mesa)

    setFormulario({
      numero: String(mesa.numero),
      nome: mesa.nome ?? "",
      status: mesa.status ?? "livre",
      ativa: mesa.ativa ?? true,
    })

    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setMesaEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro("")
  }

  function atualizarCampo(evento) {
    const { name, value, type, checked } = evento.target

    setFormulario((formularioAnterior) => ({
      ...formularioAnterior,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function salvarMesa(evento) {
    evento.preventDefault()

    setErro("")
    setMensagem("")

    const numeroConvertido = Number(formulario.numero)

    if (!Number.isInteger(numeroConvertido) || numeroConvertido <= 0) {
      setErro("Informe um número de mesa válido.")
      return
    }

    setSalvando(true)

    const dadosMesa = {
      numero: numeroConvertido,
      nome: formulario.nome.trim() || null,
      status: formulario.status,
      ativa: formulario.ativa,
    }

    let resultado

    if (mesaEditando) {
      resultado = await supabase
        .from("mesas")
        .update(dadosMesa)
        .eq("id", mesaEditando.id)
        .select()
        .single()
    } else {
      resultado = await supabase
        .from("mesas")
        .insert(dadosMesa)
        .select()
        .single()
    }

    if (resultado.error) {
      console.error("Erro ao salvar mesa:", resultado.error)

      if (resultado.error.code === "23505") {
        setErro(`A Mesa ${numeroConvertido} já está cadastrada.`)
      } else {
        setErro("Não foi possível salvar a mesa.")
      }

      setSalvando(false)
      return
    }

    setModalAberto(false)
    setMesaEditando(null)
    setFormulario(FORMULARIO_INICIAL)

    setMensagem(
      mesaEditando
        ? "Mesa atualizada com sucesso."
        : "Mesa cadastrada com sucesso."
    )

    await carregarMesas()
    setSalvando(false)
  }

  async function alternarAtivacao(mesa) {
    setErro("")
    setMensagem("")

    const novoEstado = !mesa.ativa

    const { error } = await supabase
      .from("mesas")
      .update({ ativa: novoEstado })
      .eq("id", mesa.id)

    if (error) {
      console.error("Erro ao alterar mesa:", error)
      setErro("Não foi possível alterar o estado da mesa.")
      return
    }

    setMensagem(
      novoEstado
        ? `Mesa ${mesa.numero} ativada.`
        : `Mesa ${mesa.numero} desativada.`
    )

    await carregarMesas()
  }

  async function excluirMesa(mesa) {
    setErro("")
    setMensagem("")

    if (mesa.status === "ocupada") {
      setErro(
        `A Mesa ${mesa.numero} está ocupada e não pode ser excluída. Feche a comanda primeiro.`
      )
      return
    }

    const confirmado = window.confirm(
      `Deseja realmente excluir a Mesa ${mesa.numero}?`
    )

    if (!confirmado) return

    const { error } = await supabase
      .from("mesas")
      .delete()
      .eq("id", mesa.id)

    if (error) {
      console.error("Erro ao excluir mesa:", error)

      if (error.code === "23503") {
        setErro(
          "Essa mesa possui comandas registradas. Desative a mesa em vez de excluí-la."
        )
      } else {
        setErro("Não foi possível excluir a mesa.")
      }

      return
    }

    setMensagem(`Mesa ${mesa.numero} excluída com sucesso.`)
    await carregarMesas()
  }

  const quantidadeAtivas = mesas.filter((mesa) => mesa.ativa).length
  const quantidadeLivres = mesas.filter(
    (mesa) => mesa.ativa && mesa.status === "livre"
  ).length
  const quantidadeOcupadas = mesas.filter(
    (mesa) => mesa.ativa && mesa.status === "ocupada"
  ).length

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Mesas</h2>

          <p className="mt-1 text-sm text-slate-400">
            Cadastre e gerencie as mesas do estabelecimento.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={carregarMesas}
            disabled={carregando}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
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
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            <CirclePlus size={20} />
            Nova mesa
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CardResumo titulo="Mesas ativas" valor={quantidadeAtivas} />
        <CardResumo titulo="Mesas livres" valor={quantidadeLivres} />
        <CardResumo titulo="Mesas ocupadas" valor={quantidadeOcupadas} />
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
          Carregando mesas...
        </div>
      ) : mesas.length === 0 ? (
        <div className="mt-6 flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
          <Armchair size={42} className="text-slate-500" />

          <h3 className="mt-4 text-lg font-bold text-white">
            Nenhuma mesa cadastrada
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Clique em “Nova mesa” para realizar o primeiro cadastro.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {mesas.map((mesa) => (
            <CardMesa
              key={mesa.id}
              mesa={mesa}
              aoEditar={abrirEdicao}
              aoAlternarAtivacao={alternarAtivacao}
              aoExcluir={excluirMesa}
            />
          ))}
        </div>
      )}

      {modalAberto && (
        <ModalMesa
          formulario={formulario}
          mesaEditando={mesaEditando}
          salvando={salvando}
          erro={erro}
          aoAtualizarCampo={atualizarCampo}
          aoSalvar={salvarMesa}
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

function CardMesa({
  mesa,
  aoEditar,
  aoAlternarAtivacao,
  aoExcluir,
}) {
  const ocupada = mesa.status === "ocupada"

  const estiloStatus = !mesa.ativa
    ? "border-slate-700 bg-slate-800 text-slate-400"
    : ocupada
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"

  const textoStatus = !mesa.ativa
    ? "Desativada"
    : ocupada
      ? "Ocupada"
      : "Livre"

  return (
    <article
      className={`rounded-2xl border bg-slate-900 p-5 transition ${
        mesa.ativa
          ? "border-slate-800 hover:border-orange-500/60"
          : "border-slate-800 opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-800 p-3 text-orange-400">
            <Armchair size={24} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              Mesa {String(mesa.numero).padStart(2, "0")}
            </h3>

            {mesa.nome && (
              <p className="mt-1 text-sm text-slate-400">{mesa.nome}</p>
            )}
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${estiloStatus}`}
        >
          {textoStatus}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => aoEditar(mesa)}
          className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-sm text-blue-300 transition hover:bg-blue-500/10"
        >
          <Pencil size={16} />
          Editar
        </button>

        <button
          type="button"
          onClick={() => aoAlternarAtivacao(mesa)}
          className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-sm text-amber-300 transition hover:bg-amber-500/10"
        >
          <Power size={16} />
          {mesa.ativa ? "Desativar" : "Ativar"}
        </button>

        <button
          type="button"
          onClick={() => aoExcluir(mesa)}
          className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
        >
          <Trash2 size={16} />
          Excluir
        </button>
      </div>
    </article>
  )
}

function ModalMesa({
  formulario,
  mesaEditando,
  salvando,
  erro,
  aoAtualizarCampo,
  aoSalvar,
  aoFechar,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              {mesaEditando ? "Editar mesa" : "Cadastrar mesa"}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Informe os dados da mesa.
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
            <label
              htmlFor="numero"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Número da mesa *
            </label>

            <input
              id="numero"
              name="numero"
              type="number"
              min="1"
              step="1"
              value={formulario.numero}
              onChange={aoAtualizarCampo}
              placeholder="Ex.: 1"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <div>
            <label
              htmlFor="nome"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Nome ou identificação
            </label>

            <input
              id="nome"
              name="nome"
              type="text"
              maxLength={80}
              value={formulario.nome}
              onChange={aoAtualizarCampo}
              placeholder="Ex.: Área externa"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              value={formulario.status}
              onChange={aoAtualizarCampo}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
            >
              <option value="livre">Livre</option>
              <option value="ocupada">Ocupada</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
            <div>
              <p className="font-medium text-white">Mesa ativa</p>

              <p className="mt-1 text-xs text-slate-400">
                Mesas desativadas não devem aparecer para os garçons.
              </p>
            </div>

            <input
              name="ativa"
              type="checkbox"
              checked={formulario.ativa}
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
              className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Salvando..."
                : mesaEditando
                  ? "Salvar alterações"
                  : "Cadastrar mesa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}