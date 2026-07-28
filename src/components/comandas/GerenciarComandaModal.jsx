import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

export default function GerenciarComandaModal({
  comanda,
  nomeMesa,
  aoFechar,
  aoAtualizar,
}) {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [itens, setItens] = useState([])

  const [busca, setBusca] = useState("")
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("todas")

  const [produtoComObservacao, setProdutoComObservacao] =
    useState(null)

  const [observacao, setObservacao] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(null)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarDados()
  }, [comanda.id])

  async function carregarDados() {
    setCarregando(true)
    setErro("")

    try {
      const [
        resultadoProdutos,
        resultadoCategorias,
        resultadoItens,
      ] = await Promise.all([
        supabase
          .from("produtos")
          .select(`
            id,
            nome,
            descricao,
            preco,
            ativo,
            categoria_id,
            categorias (
              id,
              nome
            )
          `)
          .eq("ativo", true)
          .order("nome", { ascending: true }),

        supabase
          .from("categorias")
          .select("id, nome, ativa, ordem")
          .eq("ativa", true)
          .order("ordem", { ascending: true })
          .order("nome", { ascending: true }),

        supabase
          .from("comanda_itens")
          .select(`
            id,
            comanda_id,
            produto_id,
            quantidade,
            preco_unitario,
            subtotal,
            observacao,
            criado_em,
            produtos (
              id,
              nome
            )
          `)
          .eq("comanda_id", comanda.id)
          .order("criado_em", { ascending: true }),
      ])

      if (resultadoProdutos.error) {
        throw resultadoProdutos.error
      }

      if (resultadoCategorias.error) {
        throw resultadoCategorias.error
      }

      if (resultadoItens.error) {
        throw resultadoItens.error
      }

      setProdutos(resultadoProdutos.data ?? [])
      setCategorias(resultadoCategorias.data ?? [])
      setItens(resultadoItens.data ?? [])
    } catch (erroCarregamento) {
      console.error("Erro ao carregar dados da comanda:", erroCarregamento)
      setErro("Não foi possível carregar os dados da comanda.")
      setProdutos([])
      setCategorias([])
      setItens([])
    } finally {
      setCarregando(false)
    }
  }

  async function adicionarProduto(produto, observacaoItem = null) {
    setErro("")
    setMensagem("")
    setProcessando(`produto-${produto.id}`)

    try {
      const itemExistente = itens.find(
        (item) =>
          item.produto_id === produto.id &&
          normalizarTexto(item.observacao) ===
            normalizarTexto(observacaoItem)
      )

      if (itemExistente) {
        const { error } = await supabase
          .from("comanda_itens")
          .update({
            quantidade: Number(itemExistente.quantidade) + 1,
          })
          .eq("id", itemExistente.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("comanda_itens")
          .insert({
            comanda_id: comanda.id,
            produto_id: produto.id,
            quantidade: 1,
            preco_unitario: Number(produto.preco),
            observacao: observacaoItem?.trim() || null,
          })

        if (error) throw error
      }

      setMensagem(`${produto.nome} adicionado à comanda.`)

      await carregarDados()
      await atualizarComandaPai()
    } catch (erroAdicao) {
      console.error("Erro ao adicionar produto:", erroAdicao)
      setErro("Não foi possível adicionar o produto.")
    } finally {
      setProcessando(null)
    }
  }

  async function alterarQuantidade(item, novaQuantidade) {
    if (novaQuantidade < 1) {
      await removerItem(item)
      return
    }

    setErro("")
    setMensagem("")
    setProcessando(`item-${item.id}`)

    try {
      const { error } = await supabase
        .from("comanda_itens")
        .update({
          quantidade: novaQuantidade,
        })
        .eq("id", item.id)

      if (error) throw error

      await carregarDados()
      await atualizarComandaPai()
    } catch (erroAlteracao) {
      console.error("Erro ao alterar quantidade:", erroAlteracao)
      setErro("Não foi possível alterar a quantidade.")
    } finally {
      setProcessando(null)
    }
  }

  async function removerItem(item) {
    const confirmado = window.confirm(
      `Deseja remover “${item.produtos?.nome ?? "este produto"}” da comanda?`
    )

    if (!confirmado) return

    setErro("")
    setMensagem("")
    setProcessando(`item-${item.id}`)

    try {
      const { error } = await supabase
        .from("comanda_itens")
        .delete()
        .eq("id", item.id)

      if (error) throw error

      setMensagem("Produto removido da comanda.")

      await carregarDados()
      await atualizarComandaPai()
    } catch (erroRemocao) {
      console.error("Erro ao remover item:", erroRemocao)
      setErro("Não foi possível remover o produto.")
    } finally {
      setProcessando(null)
    }
  }

  function abrirObservacaoProduto(produto) {
    setProdutoComObservacao(produto)
    setObservacao("")
  }

  function fecharObservacaoProduto() {
    setProdutoComObservacao(null)
    setObservacao("")
  }

  async function confirmarProdutoComObservacao(evento) {
    evento.preventDefault()

    if (!produtoComObservacao) return

    await adicionarProduto(
      produtoComObservacao,
      observacao.trim() || null
    )

    fecharObservacaoProduto()
  }

  async function atualizarComandaPai() {
    if (aoAtualizar) {
      await aoAtualizar()
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return produtos.filter((produto) => {
      const correspondeBusca =
        !termo ||
        produto.nome?.toLowerCase().includes(termo) ||
        produto.descricao?.toLowerCase().includes(termo)

      const correspondeCategoria =
        categoriaSelecionada === "todas" ||
        String(produto.categoria_id) === String(categoriaSelecionada)

      return correspondeBusca && correspondeCategoria
    })
  }, [produtos, busca, categoriaSelecionada])

  const produtosPorCategoria = useMemo(() => {
    return produtosFiltrados.reduce((grupos, produto) => {
      const nomeCategoria =
        produto.categorias?.nome ?? "Outros"

      if (!grupos[nomeCategoria]) {
        grupos[nomeCategoria] = []
      }

      grupos[nomeCategoria].push(produto)

      return grupos
    }, {})
  }, [produtosFiltrados])

  const quantidadeTotalItens = itens.reduce(
    (total, item) => total + Number(item.quantidade ?? 0),
    0
  )

  const totalComanda = itens.reduce(
    (total, item) =>
      total +
      Number(
        item.subtotal ??
          Number(item.quantidade) *
            Number(item.preco_unitario)
      ),
    0
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-0 sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden bg-slate-950 sm:h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-slate-700">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-white">
              Gerenciar comanda
            </h2>

            <p className="mt-1 truncate text-sm text-slate-400">
              {nomeMesa}
              {comanda.cliente
                ? ` • Cliente: ${comanda.cliente}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fechar gerenciamento da comanda"
          >
            <X size={24} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_390px]">
          <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={busca}
                onChange={(evento) =>
                  setBusca(evento.target.value)
                }
                placeholder="Pesquisar produto..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
              />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setCategoriaSelecionada("todas")}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  categoriaSelecionada === "todas"
                    ? "border-orange-500 bg-orange-600 text-white"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Todos
              </button>

              {categorias.map((categoria) => (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() =>
                    setCategoriaSelecionada(categoria.id)
                  }
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    String(categoriaSelecionada) ===
                    String(categoria.id)
                      ? "border-orange-500 bg-orange-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {categoria.nome}
                </button>
              ))}
            </div>

            {erro && (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {erro}
              </div>
            )}

            {mensagem && (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {mensagem}
              </div>
            )}

            {carregando ? (
              <div className="mt-6 flex min-h-52 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
                <RefreshCw
                  size={20}
                  className="mr-2 animate-spin"
                />
                Carregando produtos...
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
                <ShoppingCart
                  size={42}
                  className="text-slate-500"
                />

                <h3 className="mt-4 font-bold text-white">
                  Nenhum produto encontrado
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Altere a pesquisa ou a categoria.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-7">
                {Object.entries(produtosPorCategoria).map(
                  ([categoria, produtosCategoria]) => (
                    <section key={categoria}>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                        {categoria}
                      </h3>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                        {produtosCategoria.map((produto) => (
                          <ProdutoCard
                            key={produto.id}
                            produto={produto}
                            processando={
                              processando ===
                              `produto-${produto.id}`
                            }
                            aoAdicionar={() =>
                              adicionarProduto(produto)
                            }
                            aoAdicionarComObservacao={() =>
                              abrirObservacaoProduto(produto)
                            }
                          />
                        ))}
                      </div>
                    </section>
                  )
                )}
              </div>
            )}
          </main>

          <aside className="flex min-h-0 flex-col border-t border-slate-800 bg-slate-900 lg:border-l lg:border-t-0">
            <div className="border-b border-slate-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">
                    Itens da comanda
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {quantidadeTotalItens}{" "}
                    {quantidadeTotalItens === 1
                      ? "produto"
                      : "produtos"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={carregarDados}
                  disabled={carregando}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                  title="Atualizar itens"
                >
                  <RefreshCw
                    size={18}
                    className={carregando ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {itens.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 p-5 text-center">
                  <ShoppingCart
                    size={38}
                    className="text-slate-600"
                  />

                  <p className="mt-3 font-medium text-slate-300">
                    Comanda sem produtos
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Selecione um produto ao lado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {itens.map((item) => (
                    <ItemComanda
                      key={item.id}
                      item={item}
                      processando={
                        processando === `item-${item.id}`
                      }
                      aoDiminuir={() =>
                        alterarQuantidade(
                          item,
                          Number(item.quantidade) - 1
                        )
                      }
                      aoAumentar={() =>
                        alterarQuantidade(
                          item,
                          Number(item.quantidade) + 1
                        )
                      }
                      aoRemover={() => removerItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 bg-slate-950/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-slate-400">
                  Total da comanda
                </span>

                <strong className="text-3xl text-emerald-300">
                  {formatarMoeda(totalComanda)}
                </strong>
              </div>

              <button
                type="button"
                onClick={aoFechar}
                className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-700"
              >
                Concluir lançamento
              </button>
            </div>
          </aside>
        </div>
      </div>

      {produtoComObservacao && (
        <ModalObservacao
          produto={produtoComObservacao}
          observacao={observacao}
          processando={
            processando ===
            `produto-${produtoComObservacao.id}`
          }
          aoAlterarObservacao={setObservacao}
          aoConfirmar={confirmarProdutoComObservacao}
          aoFechar={fecharObservacaoProduto}
        />
      )}
    </div>
  )
}

function ProdutoCard({
  produto,
  processando,
  aoAdicionar,
  aoAdicionarComObservacao,
}) {
  return (
    <article className="group flex min-h-48 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:-translate-y-0.5 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-950/20">
      <div className="flex-1">
        <p className="font-bold text-white">
          {produto.nome}
        </p>

        {produto.descricao ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
            {produto.descricao}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-600">
            Toque para adicionar
          </p>
        )}

        <p className="mt-3 text-lg font-bold text-emerald-300 sm:text-xl">
          {formatarMoeda(produto.preco)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={aoAdicionar}
          disabled={processando}
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-3 font-semibold text-white transition group-hover:bg-orange-700 disabled:opacity-50"
        >
          {processando ? (
            <RefreshCw
              size={17}
              className="animate-spin"
            />
          ) : (
            <Plus size={18} />
          )}

          Adicionar
        </button>

        <button
          type="button"
          onClick={aoAdicionarComObservacao}
          disabled={processando}
          title="Adicionar com observação"
          className="rounded-xl border border-slate-700 px-3 text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          <ChevronDown size={18} />
        </button>
      </div>
    </article>
  )
}

function ItemComanda({
  item,
  processando,
  aoDiminuir,
  aoAumentar,
  aoRemover,
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">
            {item.produtos?.nome ??
              "Produto não encontrado"}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {formatarMoeda(item.preco_unitario)} cada
          </p>
        </div>

        <button
          type="button"
          onClick={aoRemover}
          disabled={processando}
          title="Remover item"
          className="rounded-lg p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 size={17} />
        </button>
      </div>

      {item.observacao && (
        <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {item.observacao}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={aoDiminuir}
            disabled={processando}
            className="rounded-l-xl p-3 text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Minus size={16} />
          </button>

          <span className="min-w-11 border-x border-slate-700 px-2 py-2 text-center font-bold text-white">
            {item.quantidade}
          </span>

          <button
            type="button"
            onClick={aoAumentar}
            disabled={processando}
            className="rounded-r-xl p-3 text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>

        <strong className="text-emerald-300">
          {formatarMoeda(
            item.subtotal ??
              Number(item.quantidade) *
                Number(item.preco_unitario)
          )}
        </strong>
      </div>
    </article>
  )
}

function ModalObservacao({
  produto,
  observacao,
  processando,
  aoAlterarObservacao,
  aoConfirmar,
  aoFechar,
}) {
  const sugestoes = [
    "Sem cebola",
    "Bem passado",
    "Sem gelo",
    "Separado",
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="font-bold text-white">
              Adicionar observação
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              {produto.nome}
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={21} />
          </button>
        </div>

        <form onSubmit={aoConfirmar} className="p-5">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Observação do item
          </label>

          <textarea
            rows="4"
            value={observacao}
            onChange={(evento) =>
              aoAlterarObservacao(evento.target.value)
            }
            placeholder="Ex.: sem cebola, bem passado, sem gelo..."
            maxLength={250}
            autoFocus
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {sugestoes.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                onClick={() =>
                  aoAlterarObservacao(sugestao)
                }
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-orange-500 hover:text-orange-300"
              >
                {sugestao}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoFechar}
              disabled={processando}
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={processando}
              className="rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              {processando
                ? "Adicionando..."
                : "Adicionar"}
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

function normalizarTexto(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
}