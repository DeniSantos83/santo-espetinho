import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  CirclePlus,
  Edit3,
  FolderOpen,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

const FORMULARIO_INICIAL = {
  nome: "",
  descricao: "",
  ordem: 0,
  ativa: true,
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])

  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todas")
  const [modalAberto, setModalAberto] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [processando, setProcessando] = useState(null)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)
    setErro("")

    const [resultadoCategorias, resultadoProdutos] = await Promise.all([
      supabase
        .from("categorias")
        .select("*")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),

      supabase
        .from("produtos")
        .select("id, categoria_id"),
    ])

    if (resultadoCategorias.error) {
      console.error(resultadoCategorias.error)
      setErro("Não foi possível carregar as categorias.")
      setCategorias([])
    } else {
      setCategorias(resultadoCategorias.data ?? [])
    }

    if (resultadoProdutos.error) {
      console.error(resultadoProdutos.error)
      setProdutos([])
    } else {
      setProdutos(resultadoProdutos.data ?? [])
    }

    setCarregando(false)
  }

  function abrirNovaCategoria() {
    setCategoriaEditando(null)

    const maiorOrdem = categorias.reduce(
      (maior, categoria) =>
        Math.max(maior, Number(categoria.ordem ?? 0)),
      0
    )

    setFormulario({
      ...FORMULARIO_INICIAL,
      ordem: maiorOrdem + 1,
    })

    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function abrirEdicao(categoria) {
    setCategoriaEditando(categoria)

    setFormulario({
      nome: categoria.nome ?? "",
      descricao: categoria.descricao ?? "",
      ordem: Number(categoria.ordem ?? 0),
      ativa: categoria.ativa !== false,
    })

    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setCategoriaEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro("")
  }

  function atualizarCampo(evento) {
    const { name, value, type, checked } = evento.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]:
        type === "checkbox"
          ? checked
          : name === "ordem"
            ? Number(value)
            : value,
    }))
  }

  async function salvarCategoria(evento) {
    evento.preventDefault()

    setErro("")
    setMensagem("")

    const nome = formulario.nome.trim()

    if (!nome) {
      setErro("Informe o nome da categoria.")
      return
    }

    setSalvando(true)

    try {
      const categoriaDuplicada = categorias.some(
        (categoria) =>
          categoria.id !== categoriaEditando?.id &&
          normalizarTexto(categoria.nome) === normalizarTexto(nome)
      )

      if (categoriaDuplicada) {
        throw new Error("Já existe uma categoria com esse nome.")
      }

      const dados = {
        nome,
        descricao: formulario.descricao.trim() || null,
        ordem: Number(formulario.ordem ?? 0),
        ativa: Boolean(formulario.ativa),
      }

      if (categoriaEditando) {
        const { error } = await supabase
          .from("categorias")
          .update(dados)
          .eq("id", categoriaEditando.id)

        if (error) throw error

        setMensagem("Categoria atualizada com sucesso.")
      } else {
        const { error } = await supabase
          .from("categorias")
          .insert(dados)

        if (error) {
          if (error.code === "23505") {
            throw new Error("Já existe uma categoria com esse nome.")
          }

          throw error
        }

        setMensagem("Categoria cadastrada com sucesso.")
      }

      setModalAberto(false)
      setCategoriaEditando(null)
      setFormulario(FORMULARIO_INICIAL)

      await carregarDados()
    } catch (erroSalvamento) {
      console.error(erroSalvamento)

      setErro(
        erroSalvamento instanceof Error
          ? erroSalvamento.message
          : "Não foi possível salvar a categoria."
      )
    } finally {
      setSalvando(false)
    }
  }

  async function alternarStatus(categoria) {
    setErro("")
    setMensagem("")
    setProcessando(`status-${categoria.id}`)

    try {
      const novoStatus = categoria.ativa === false

      const { error } = await supabase
        .from("categorias")
        .update({ ativa: novoStatus })
        .eq("id", categoria.id)

      if (error) throw error

      setMensagem(
        novoStatus
          ? "Categoria ativada com sucesso."
          : "Categoria desativada com sucesso."
      )

      await carregarDados()
    } catch (erroStatus) {
      console.error(erroStatus)
      setErro("Não foi possível alterar o status da categoria.")
    } finally {
      setProcessando(null)
    }
  }

  async function excluirCategoria(categoria) {
    const quantidadeProdutos = contarProdutos(categoria.id)

    if (quantidadeProdutos > 0) {
      setErro(
        "Esta categoria possui produtos vinculados. Desative-a em vez de excluir."
      )
      return
    }

    const confirmado = window.confirm(
      `Deseja excluir a categoria “${categoria.nome}”?`
    )

    if (!confirmado) return

    setErro("")
    setMensagem("")
    setProcessando(`excluir-${categoria.id}`)

    try {
      const { error } = await supabase
        .from("categorias")
        .delete()
        .eq("id", categoria.id)

      if (error) throw error

      setMensagem("Categoria excluída com sucesso.")
      await carregarDados()
    } catch (erroExclusao) {
      console.error(erroExclusao)
      setErro(
        "Não foi possível excluir a categoria. Verifique se existem produtos vinculados."
      )
    } finally {
      setProcessando(null)
    }
  }

  function contarProdutos(categoriaId) {
    return produtos.filter(
      (produto) =>
        String(produto.categoria_id) === String(categoriaId)
    ).length
  }

  const categoriasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca)

    return categorias.filter((categoria) => {
      const correspondeBusca =
        !termo ||
        normalizarTexto(categoria.nome).includes(termo) ||
        normalizarTexto(categoria.descricao).includes(termo)

      const correspondeStatus =
        filtroStatus === "todas" ||
        (filtroStatus === "ativas" && categoria.ativa !== false) ||
        (filtroStatus === "inativas" && categoria.ativa === false)

      return correspondeBusca && correspondeStatus
    })
  }, [categorias, busca, filtroStatus])

  const totalAtivas = categorias.filter(
    (categoria) => categoria.ativa !== false
  ).length

  const totalInativas = categorias.length - totalAtivas

  return (
    <section>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
            Cardápio
          </p>

          <h2 className="mt-1 text-3xl font-bold text-white">
            Categorias
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Organize os produtos do cardápio por grupos.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={carregarDados}
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
            onClick={abrirNovaCategoria}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            <CirclePlus size={20} />
            Nova categoria
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardResumo
          titulo="Total"
          valor={categorias.length}
          detalhe="categorias cadastradas"
          classe="text-white"
        />

        <CardResumo
          titulo="Ativas"
          valor={totalAtivas}
          detalhe="visíveis no cardápio"
          classe="text-emerald-300"
        />

        <CardResumo
          titulo="Inativas"
          valor={totalInativas}
          detalhe="ocultas no cardápio"
          classe="text-slate-400"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar categoria..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(evento) => setFiltroStatus(evento.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
          >
            <option value="todas">Todos os status</option>
            <option value="ativas">Somente ativas</option>
            <option value="inativas">Somente inativas</option>
          </select>
        </div>
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
        <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
          <RefreshCw size={20} className="mr-2 animate-spin" />
          Carregando categorias...
        </div>
      ) : categoriasFiltradas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma categoria encontrada"
          texto="Cadastre uma nova categoria ou altere os filtros."
          aoCriar={abrirNovaCategoria}
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categoriasFiltradas.map((categoria) => (
            <CategoriaCard
              key={categoria.id}
              categoria={categoria}
              quantidadeProdutos={contarProdutos(categoria.id)}
              processando={processando}
              aoEditar={() => abrirEdicao(categoria)}
              aoAlternarStatus={() => alternarStatus(categoria)}
              aoExcluir={() => excluirCategoria(categoria)}
            />
          ))}
        </div>
      )}

      {modalAberto && (
        <ModalCategoria
          formulario={formulario}
          editando={Boolean(categoriaEditando)}
          salvando={salvando}
          erro={erro}
          aoAtualizarCampo={atualizarCampo}
          aoSalvar={salvarCategoria}
          aoFechar={fecharModal}
        />
      )}
    </section>
  )
}

function CategoriaCard({
  categoria,
  quantidadeProdutos,
  processando,
  aoEditar,
  aoAlternarStatus,
  aoExcluir,
}) {
  const ativa = categoria.ativa !== false
  const alterandoStatus =
    processando === `status-${categoria.id}`
  const excluindo =
    processando === `excluir-${categoria.id}`

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl">
      <div
        className={`h-1.5 ${
          ativa ? "bg-emerald-500" : "bg-slate-600"
        }`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`rounded-xl p-3 ${
                ativa
                  ? "bg-orange-500/10 text-orange-300"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              <FolderOpen size={24} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-white">
                {categoria.nome}
              </h3>

              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ordem {Number(categoria.ordem ?? 0)}
              </p>
            </div>
          </div>

          <StatusCategoria ativa={ativa} />
        </div>

        <p className="mt-4 min-h-10 text-sm leading-relaxed text-slate-400">
          {categoria.descricao || "Nenhuma descrição informada."}
        </p>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Produtos vinculados
          </p>

          <p className="mt-1 text-xl font-bold text-white">
            {quantidadeProdutos}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={aoEditar}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <Edit3 size={17} />
            Editar
          </button>

          <button
            type="button"
            onClick={aoAlternarStatus}
            disabled={alterandoStatus}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 font-semibold transition disabled:opacity-50 ${
              ativa
                ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {alterandoStatus ? (
              <RefreshCw size={17} className="animate-spin" />
            ) : ativa ? (
              <ToggleRight size={19} />
            ) : (
              <ToggleLeft size={19} />
            )}

            {ativa ? "Desativar" : "Ativar"}
          </button>
        </div>

        <button
          type="button"
          onClick={aoExcluir}
          disabled={excluindo || quantidadeProdutos > 0}
          title={
            quantidadeProdutos > 0
              ? "Desative a categoria, pois existem produtos vinculados."
              : "Excluir categoria"
          }
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {excluindo ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}

          Excluir categoria
        </button>
      </div>
    </article>
  )
}

function StatusCategoria({ ativa }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
        ativa
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-slate-600 bg-slate-800 text-slate-400"
      }`}
    >
      {ativa ? "Ativa" : "Inativa"}
    </span>
  )
}

function CardResumo({ titulo, valor, detalhe, classe }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </p>

      <p className={`mt-2 text-3xl font-bold ${classe}`}>
        {valor}
      </p>

      <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
    </div>
  )
}

function EstadoVazio({ titulo, texto, aoCriar }) {
  return (
    <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
      <FolderOpen size={44} className="text-slate-500" />

      <h3 className="mt-4 text-lg font-bold text-white">
        {titulo}
      </h3>

      <p className="mt-1 text-sm text-slate-400">{texto}</p>

      <button
        type="button"
        onClick={aoCriar}
        className="mt-5 flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700"
      >
        <CirclePlus size={18} />
        Criar categoria
      </button>
    </div>
  )
}

function ModalCategoria({
  formulario,
  editando,
  salvando,
  erro,
  aoAtualizarCampo,
  aoSalvar,
  aoFechar,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              {editando ? "Editar categoria" : "Nova categoria"}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Organize os produtos exibidos no lançamento de pedidos.
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
              Nome da categoria *
            </label>

            <input
              name="nome"
              type="text"
              value={formulario.nome}
              onChange={aoAtualizarCampo}
              placeholder="Ex.: Sobremesas"
              maxLength={100}
              required
              autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Descrição
            </label>

            <textarea
              name="descricao"
              rows="3"
              value={formulario.descricao}
              onChange={aoAtualizarCampo}
              placeholder="Ex.: Doces, sobremesas e opções para finalizar o pedido"
              maxLength={250}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Ordem de exibição
              </label>

              <input
                name="ordem"
                type="number"
                min="0"
                step="1"
                value={formulario.ordem}
                onChange={aoAtualizarCampo}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              />

              <p className="mt-2 text-xs text-slate-500">
                Categorias com número menor aparecem primeiro.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-300">
                Status
              </p>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">
                    Categoria ativa
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Exibir no cardápio
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
            </div>
          </div>

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
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {editando ? "Salvar alterações" : "Cadastrar categoria"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function normalizarTexto(texto) {
  return String(texto ?? "").trim().toLowerCase()
}