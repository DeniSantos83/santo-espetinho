import { useEffect, useMemo, useState } from "react"
import {
  CirclePlus,
  Pencil,
  Trash2,
  X,
  Power,
  RefreshCw,
  Search,
  Utensils,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

const FORMULARIO_INICIAL = {
  nome: "",
  categoria_id: "",
  preco: "",
  descricao: "",
  ativo: true,
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [produtoEditando, setProdutoEditando] = useState(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [busca, setBusca] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("todas")
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)
    setErro("")

    const [resultadoProdutos, resultadoCategorias] = await Promise.all([
      supabase
        .from("produtos")
        .select(`
          *,
          categorias (
            id,
            nome
          )
        `)
        .order("nome", { ascending: true }),

      supabase
        .from("categorias")
        .select("*")
        .eq("ativa", true)
        .order("nome", { ascending: true }),
    ])

    if (resultadoProdutos.error) {
      console.error(resultadoProdutos.error)
      setErro("Não foi possível carregar os produtos.")
      setProdutos([])
    } else {
      setProdutos(resultadoProdutos.data ?? [])
    }

    if (resultadoCategorias.error) {
      console.error(resultadoCategorias.error)
      setErro("Não foi possível carregar as categorias.")
      setCategorias([])
    } else {
      setCategorias(resultadoCategorias.data ?? [])
    }

    setCarregando(false)
  }

  function abrirCadastro() {
    setProdutoEditando(null)

    setFormulario({
      ...FORMULARIO_INICIAL,
      categoria_id: categorias[0]?.id ?? "",
    })

    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function abrirEdicao(produto) {
    setProdutoEditando(produto)

    setFormulario({
      nome: produto.nome ?? "",
      categoria_id: produto.categoria_id ?? "",
      preco: formatarValorParaCampo(produto.preco),
      descricao: produto.descricao ?? "",
      ativo: produto.ativo ?? true,
    })

    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setProdutoEditando(null)
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

  async function salvarProduto(evento) {
    evento.preventDefault()
    setErro("")
    setMensagem("")

    const nome = formulario.nome.trim()
    const preco = converterValorParaNumero(formulario.preco)

    if (!nome) {
      setErro("Informe o nome do produto.")
      return
    }

    if (!formulario.categoria_id) {
      setErro("Selecione uma categoria.")
      return
    }

    if (!Number.isFinite(preco) || preco < 0) {
      setErro("Informe um preço válido.")
      return
    }

    setSalvando(true)

    const dadosProduto = {
      nome,
      categoria_id: formulario.categoria_id,
      preco,
      descricao: formulario.descricao.trim() || null,
      ativo: formulario.ativo,
    }

    let resultado

    if (produtoEditando) {
      resultado = await supabase
        .from("produtos")
        .update(dadosProduto)
        .eq("id", produtoEditando.id)
        .select()
        .single()
    } else {
      resultado = await supabase
        .from("produtos")
        .insert(dadosProduto)
        .select()
        .single()
    }

    if (resultado.error) {
      console.error(resultado.error)
      setErro("Não foi possível salvar o produto.")
      setSalvando(false)
      return
    }

    const estavaEditando = Boolean(produtoEditando)

    setModalAberto(false)
    setProdutoEditando(null)
    setFormulario(FORMULARIO_INICIAL)

    setMensagem(
      estavaEditando
        ? "Produto atualizado com sucesso."
        : "Produto cadastrado com sucesso."
    )

    await carregarDados()
    setSalvando(false)
  }

  async function alternarAtivacao(produto) {
    setErro("")
    setMensagem("")

    const novoEstado = !produto.ativo

    const { error } = await supabase
      .from("produtos")
      .update({ ativo: novoEstado })
      .eq("id", produto.id)

    if (error) {
      console.error(error)
      setErro("Não foi possível alterar o produto.")
      return
    }

    setMensagem(
      novoEstado
        ? `${produto.nome} foi ativado.`
        : `${produto.nome} foi desativado.`
    )

    await carregarDados()
  }

  async function excluirProduto(produto) {
    setErro("")
    setMensagem("")

    const confirmado = window.confirm(
      `Deseja realmente excluir o produto “${produto.nome}”?`
    )

    if (!confirmado) return

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", produto.id)

    if (error) {
      console.error(error)

      if (error.code === "23503") {
        setErro(
          "Este produto já possui pedidos registrados. Desative-o em vez de excluir."
        )
      } else {
        setErro("Não foi possível excluir o produto.")
      }

      return
    }

    setMensagem("Produto excluído com sucesso.")
    await carregarDados()
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return produtos.filter((produto) => {
      const correspondeBusca =
        !termo ||
        produto.nome.toLowerCase().includes(termo) ||
        produto.descricao?.toLowerCase().includes(termo)

      const correspondeCategoria =
        filtroCategoria === "todas" ||
        produto.categoria_id === filtroCategoria

      return correspondeBusca && correspondeCategoria
    })
  }, [produtos, busca, filtroCategoria])

  const quantidadeAtivos = produtos.filter((produto) => produto.ativo).length
  const quantidadeInativos = produtos.length - quantidadeAtivos

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Produtos</h2>
          <p className="mt-1 text-sm text-slate-400">
            Cadastre espetinhos, bebidas, petiscos e outros itens.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={carregarDados}
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
            disabled={categorias.length === 0}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CirclePlus size={20} />
            Novo produto
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CardResumo titulo="Total de produtos" valor={produtos.length} />
        <CardResumo titulo="Produtos ativos" valor={quantidadeAtivos} />
        <CardResumo titulo="Produtos inativos" valor={quantidadeInativos} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_260px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(evento) => setFiltroCategoria(evento.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
        >
          <option value="todas">Todas as categorias</option>

          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
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
          Carregando produtos...
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="mt-6 flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
          <Utensils size={42} className="text-slate-500" />

          <h3 className="mt-4 text-lg font-bold text-white">
            Nenhum produto encontrado
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Cadastre um produto ou altere os filtros da pesquisa.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-950/70">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-4">Produto</th>
                  <th className="px-5 py-4">Categoria</th>
                  <th className="px-5 py-4">Preço</th>
                  <th className="px-5 py-4">Situação</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {produtosFiltrados.map((produto) => (
                  <tr key={produto.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{produto.nome}</p>

                      {produto.descricao && (
                        <p className="mt-1 max-w-md text-sm text-slate-400">
                          {produto.descricao}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {produto.categorias?.nome ?? "Sem categoria"}
                    </td>

                    <td className="px-5 py-4 font-semibold text-emerald-300">
                      {formatarMoeda(produto.preco)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          produto.ativo
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-600 bg-slate-800 text-slate-400"
                        }`}
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <BotaoAcao
                          titulo="Editar"
                          onClick={() => abrirEdicao(produto)}
                        >
                          <Pencil size={17} />
                        </BotaoAcao>

                        <BotaoAcao
                          titulo={produto.ativo ? "Desativar" : "Ativar"}
                          onClick={() => alternarAtivacao(produto)}
                        >
                          <Power size={17} />
                        </BotaoAcao>

                        <BotaoAcao
                          titulo="Excluir"
                          onClick={() => excluirProduto(produto)}
                          perigo
                        >
                          <Trash2 size={17} />
                        </BotaoAcao>
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
        <ModalProduto
          formulario={formulario}
          categorias={categorias}
          produtoEditando={produtoEditando}
          salvando={salvando}
          erro={erro}
          aoAtualizarCampo={atualizarCampo}
          aoSalvar={salvarProduto}
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

function BotaoAcao({ titulo, onClick, perigo = false, children }) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        perigo
          ? "text-red-300 hover:bg-red-500/10"
          : "text-slate-300 hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  )
}

function ModalProduto({
  formulario,
  categorias,
  produtoEditando,
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
              {produtoEditando ? "Editar produto" : "Cadastrar produto"}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Informe os dados do item vendido.
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
              Nome do produto *
            </label>

            <input
              name="nome"
              type="text"
              maxLength={120}
              value={formulario.nome}
              onChange={aoAtualizarCampo}
              placeholder="Ex.: Espetinho de carne"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Categoria *
              </label>

              <select
                name="categoria_id"
                value={formulario.categoria_id}
                onChange={aoAtualizarCampo}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              >
                <option value="">Selecione</option>

                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Preço *
              </label>

              <input
                name="preco"
                type="text"
                inputMode="decimal"
                value={formulario.preco}
                onChange={aoAtualizarCampo}
                placeholder="Ex.: 8,00"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Descrição
            </label>

            <textarea
              name="descricao"
              rows="3"
              maxLength={300}
              value={formulario.descricao}
              onChange={aoAtualizarCampo}
              placeholder="Informações opcionais sobre o produto"
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
            <div>
              <p className="font-medium text-white">Produto ativo</p>
              <p className="mt-1 text-xs text-slate-400">
                Produtos inativos não aparecerão para os garçons.
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
                : produtoEditando
                  ? "Salvar alterações"
                  : "Cadastrar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function converterValorParaNumero(valor) {
  const texto = String(valor ?? "").trim()

  if (!texto) return Number.NaN

  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto

  return Number(normalizado)
}

function formatarValorParaCampo(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}