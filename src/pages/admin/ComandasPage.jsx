import { useEffect, useMemo, useState } from "react"
import {
  Armchair,
  CalendarClock,
  CalendarPlus,
  ArrowRightLeft,
  Ban,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Clock3,
  ClipboardList,
  History,
  Package,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  UserCog,
  UserRound,
  Users,
  Unlink,
  X,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import GerenciarComandaModal from "../../components/comandas/GerenciarComandaModal"
import FecharComandaModal from "../../components/comandas/FecharComandaModal"

const FORMULARIO_INICIAL = {
  mesa_id: "",
  cliente: "",
  observacoes: "",
}

const FORMULARIO_RESERVA_INICIAL = {
  mesa_id: "",
  cliente: "",
  telefone: "",
  data_hora: "",
  quantidade_pessoas: 2,
  observacoes: "",
}

export default function ComandasPage() {
  const [comandas, setComandas] = useState([])
  const [mesas, setMesas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [itens, setItens] = useState([])
  const [reservas, setReservas] = useState([])

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [modalAberto, setModalAberto] = useState(false)
  const [comandaExpandida, setComandaExpandida] = useState(null)
  const [comandaGerenciada, setComandaGerenciada] = useState(null)
  const [comandaParaFechar, setComandaParaFechar] = useState(null)
  const [comandaPreConta, setComandaPreConta] = useState(null)
  const [comandaParaTransferir, setComandaParaTransferir] = useState(null)
  const [mesaDestinoId, setMesaDestinoId] = useState("")
  const [transferindo, setTransferindo] = useState(false)
  const [comandaParaJuntar, setComandaParaJuntar] = useState(null)
  const [comandaSecundariaId, setComandaSecundariaId] = useState("")
  const [juntandoMesas, setJuntandoMesas] = useState(false)
  const [separandoMesaId, setSeparandoMesaId] = useState(null)
  const [modalReservaAberto, setModalReservaAberto] = useState(false)
  const [formularioReserva, setFormularioReserva] = useState(FORMULARIO_RESERVA_INICIAL)
  const [salvandoReserva, setSalvandoReserva] = useState(false)
  const [reservaParaAtender, setReservaParaAtender] = useState(null)
  const [comandaParaTrocarResponsavel, setComandaParaTrocarResponsavel] = useState(null)
  const [novoResponsavelId, setNovoResponsavelId] = useState("")
  const [trocandoResponsavel, setTrocandoResponsavel] = useState(false)

  const [visualizacao, setVisualizacao] = useState("mesas")
  const [busca, setBusca] = useState("")
  const [filtroMesas, setFiltroMesas] = useState("todas")
  const [agora, setAgora] = useState(Date.now())

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAgora(Date.now())
    }, 60000)

    return () => window.clearInterval(intervalo)
  }, [])

  async function carregarDados() {
    setCarregando(true)
    setErro("")

    try {
      const [
        resultadoComandas,
        resultadoMesas,
        resultadoUsuarios,
        resultadoItens,
        resultadoReservas,
      ] = await Promise.all([
        supabase
          .from("comandas")
          .select("*")
          .order("aberta_em", { ascending: false }),

        supabase
          .from("mesas")
          .select("*")
          .order("numero", { ascending: true }),

        supabase
          .from("usuarios")
          .select("id, nome, email, perfil"),

        supabase
          .from("comanda_itens")
          .select(`
            *,
            produtos (
              id,
              nome
            )
          `)
          .order("criado_em", { ascending: true }),

        supabase
          .from("reservas_mesas")
          .select("*")
          .in("status", ["ativa"])
          .order("data_hora", { ascending: true }),
      ])

      if (resultadoComandas.error) throw resultadoComandas.error
      if (resultadoMesas.error) throw resultadoMesas.error
      if (resultadoUsuarios.error) throw resultadoUsuarios.error
      if (resultadoItens.error) throw resultadoItens.error
      if (resultadoReservas.error) throw resultadoReservas.error

      setComandas(resultadoComandas.data ?? [])
      setMesas(resultadoMesas.data ?? [])
      setUsuarios(resultadoUsuarios.data ?? [])
      setItens(resultadoItens.data ?? [])
      setReservas(resultadoReservas.data ?? [])
    } catch (erroCarregamento) {
      console.error("Erro ao carregar comandas:", erroCarregamento)
      setErro("Não foi possível carregar os dados das comandas.")
    } finally {
      setCarregando(false)
    }
  }

  function abrirNovaComanda(mesaId = "") {
    const primeiraMesaLivre = mesasLivres[0]

    setFormulario({
      ...FORMULARIO_INICIAL,
      mesa_id: mesaId || primeiraMesaLivre?.id || "",
    })

    setErro("")
    setMensagem("")
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setFormulario(FORMULARIO_INICIAL)
    setReservaParaAtender(null)
    setErro("")
  }

  function abrirModalReserva(mesaId = "") {
    const primeiraMesaDisponivel = mesasDisponiveisParaReserva[0]
    const dataPadrao = new Date(Date.now() + 60 * 60 * 1000)
    dataPadrao.setMinutes(Math.ceil(dataPadrao.getMinutes() / 15) * 15, 0, 0)

    setFormularioReserva({
      ...FORMULARIO_RESERVA_INICIAL,
      mesa_id: mesaId || primeiraMesaDisponivel?.id || "",
      data_hora: formatarDataHoraInput(dataPadrao),
    })
    setErro("")
    setMensagem("")
    setModalReservaAberto(true)
  }

  function fecharModalReserva() {
    if (salvandoReserva) return
    setModalReservaAberto(false)
    setFormularioReserva(FORMULARIO_RESERVA_INICIAL)
    setErro("")
  }

  function atualizarCampoReserva(evento) {
    const { name, value } = evento.target
    setFormularioReserva((anterior) => ({
      ...anterior,
      [name]: name === "quantidade_pessoas" ? Number(value) : value,
    }))
  }

  async function criarReserva(evento) {
    evento.preventDefault()
    setErro("")
    setMensagem("")

    if (!formularioReserva.mesa_id || !formularioReserva.cliente.trim() || !formularioReserva.data_hora) {
      setErro("Informe a mesa, o cliente e a data da reserva.")
      return
    }

    if (new Date(formularioReserva.data_hora).getTime() <= Date.now()) {
      setErro("A reserva precisa ser marcada para uma data e horário futuros.")
      return
    }

    setSalvandoReserva(true)
    try {
      const usuarioAtual = await obterUsuarioAtual()
      const { error: erroReserva } = await supabase.from("reservas_mesas").insert({
        mesa_id: formularioReserva.mesa_id,
        cliente: formularioReserva.cliente.trim(),
        telefone: formularioReserva.telefone.trim() || null,
        data_hora: new Date(formularioReserva.data_hora).toISOString(),
        quantidade_pessoas: Math.max(Number(formularioReserva.quantidade_pessoas) || 1, 1),
        observacoes: formularioReserva.observacoes.trim() || null,
        usuario_id: usuarioAtual.id,
        status: "ativa",
      })
      if (erroReserva) throw erroReserva

      setModalReservaAberto(false)
      setFormularioReserva(FORMULARIO_RESERVA_INICIAL)
      setMensagem("Reserva criada com sucesso.")
      await carregarDados()
    } catch (erroCriacaoReserva) {
      console.error("Erro ao criar reserva:", erroCriacaoReserva)
      setErro(erroCriacaoReserva?.message || "Não foi possível criar a reserva.")
    } finally {
      setSalvandoReserva(false)
    }
  }

  async function cancelarReserva(reserva) {
    const confirmado = window.confirm(`Deseja cancelar a reserva de ${reserva.cliente}?`)
    if (!confirmado) return

    try {
      const { error } = await supabase
        .from("reservas_mesas")
        .update({ status: "cancelada", cancelada_em: new Date().toISOString() })
        .eq("id", reserva.id)
      if (error) throw error
      setMensagem("Reserva cancelada e mesa disponibilizada.")
      await carregarDados()
    } catch (erroCancelamento) {
      console.error("Erro ao cancelar reserva:", erroCancelamento)
      setErro("Não foi possível cancelar a reserva.")
    }
  }

  function iniciarAtendimentoReserva(reserva) {
    setReservaParaAtender(reserva)
    setFormulario({
      ...FORMULARIO_INICIAL,
      mesa_id: reserva.mesa_id,
      cliente: reserva.cliente,
      observacoes: reserva.observacoes || "",
    })
    setErro("")
    setModalAberto(true)
  }

  function atualizarCampo(evento) {
    const { name, value } = evento.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  async function obterUsuarioAtual() {
    const {
      data: { user },
      error: erroAuth,
    } = await supabase.auth.getUser()

    if (erroAuth || !user) {
      throw new Error("Não foi possível identificar o usuário conectado.")
    }

    const { data: usuario, error: erroUsuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("auth_id", user.id)
      .single()

    if (erroUsuario || !usuario) {
      throw new Error("Perfil do usuário conectado não encontrado.")
    }

    return usuario
  }

  async function criarComanda(evento) {
    evento.preventDefault()

    setErro("")
    setMensagem("")

    if (!formulario.mesa_id) {
      setErro("Selecione uma mesa.")
      return
    }

    setSalvando(true)

    try {
      const usuarioAtual = await obterUsuarioAtual()

      const { data: novaComanda, error: erroComanda } = await supabase
        .from("comandas")
        .insert({
          mesa_id: formulario.mesa_id,
          usuario_id: usuarioAtual.id,
          cliente: formulario.cliente.trim() || null,
          observacoes: formulario.observacoes.trim() || null,
          status: "aberta",
          total: 0,
          subtotal_consumo: 0,
          total_acrescimos: 0,
          total_descontos: 0,
          total_final: 0,
          quantidade_pessoas: 1,
          valor_por_pessoa: 0,
          aberta_em: new Date().toISOString(),
        })
        .select()
        .single()

      if (erroComanda) {
        if (erroComanda.code === "23505") {
          throw new Error("Esta mesa já possui uma comanda aberta.")
        }

        throw erroComanda
      }

      const { error: erroMesa } = await supabase
        .from("mesas")
        .update({ status: "ocupada" })
        .eq("id", formulario.mesa_id)

      if (erroMesa) {
        console.error(
          "A comanda foi criada, mas a mesa não foi atualizada:",
          erroMesa
        )
      }

      setModalAberto(false)
      setFormulario(FORMULARIO_INICIAL)
      if (reservaParaAtender && reservaParaAtender.mesa_id === formulario.mesa_id) {
        const { error: erroReserva } = await supabase
          .from("reservas_mesas")
          .update({ status: "atendida", atendida_em: new Date().toISOString() })
          .eq("id", reservaParaAtender.id)

        if (erroReserva) {
          console.error("Comanda aberta, mas a reserva não foi finalizada:", erroReserva)
        }
      }

      setReservaParaAtender(null)
      setMensagem("Comanda aberta com sucesso.")

      await carregarDados()

      if (novaComanda) {
        setComandaGerenciada(novaComanda)
      }
    } catch (erroCriacao) {
      console.error("Erro ao criar comanda:", erroCriacao)

      setErro(
        erroCriacao instanceof Error
          ? erroCriacao.message
          : "Não foi possível abrir a comanda."
      )
    } finally {
      setSalvando(false)
    }
  }

  async function cancelarComanda(comanda) {
    setErro("")
    setMensagem("")

    const itensDaComanda = obterItensDaComanda(comanda.id)

    if (itensDaComanda.length > 0) {
      setErro(
        "Esta comanda possui produtos lançados. Remova os itens antes de cancelar."
      )
      return
    }

    const confirmado = window.confirm(
      `Deseja cancelar a comanda da ${nomeDaMesa(comanda.mesa_id)}?`
    )

    if (!confirmado) return

    try {
      const { error: erroComanda } = await supabase
        .from("comandas")
        .update({
          status: "cancelada",
          fechada_em: new Date().toISOString(),
        })
        .eq("id", comanda.id)

      if (erroComanda) throw erroComanda

      const { error: erroMesa } = await supabase
        .from("mesas")
        .update({ status: "livre" })
        .eq("id", comanda.mesa_id)

      if (erroMesa) {
        console.error("Erro ao liberar mesa:", erroMesa)
      }

      setMensagem("Comanda cancelada e mesa liberada.")
      await carregarDados()
    } catch (erroCancelamento) {
      console.error("Erro ao cancelar comanda:", erroCancelamento)
      setErro("Não foi possível cancelar a comanda.")
    }
  }

  function abrirGerenciamento(comanda) {
    setErro("")
    setMensagem("")
    setComandaGerenciada(comanda)
  }

  async function fecharGerenciamento() {
    setComandaGerenciada(null)
    await carregarDados()
  }

  function abrirFechamento(comanda) {
    setErro("")
    setMensagem("")
    setComandaParaFechar(comanda)
  }

  async function fecharModalFechamento() {
    setComandaParaFechar(null)
    await carregarDados()
  }

  async function finalizarFechamento() {
    const mesaPrincipalId = comandaParaFechar?.mesa_id

    if (mesaPrincipalId) {
      const { error: erroLiberarGrupo } = await supabase
        .from("mesas")
        .update({
          status: "livre",
          mesa_principal_id: null,
          grupo_mesas_id: null,
        })
        .or(`id.eq.${mesaPrincipalId},grupo_mesas_id.eq.${mesaPrincipalId}`)

      if (erroLiberarGrupo) {
        console.error("Erro ao liberar mesas do grupo:", erroLiberarGrupo)
      }
    }

    setComandaParaFechar(null)
    setMensagem("Conta fechada e todas as mesas do grupo foram liberadas.")
    await carregarDados()
  }

  function abrirPreConta(comanda) {
    setErro("")
    setMensagem("")
    setComandaPreConta(comanda)
  }

  function fecharPreConta() {
    setComandaPreConta(null)
  }

  function abrirTransferencia(comanda) {
    const destinosDisponiveis = mesasLivres.filter(
      (mesa) => mesa.id !== comanda.mesa_id
    )

    setErro("")
    setMensagem("")
    setComandaParaTransferir(comanda)
    setMesaDestinoId(destinosDisponiveis[0]?.id ?? "")
  }

  function fecharTransferencia() {
    if (transferindo) return

    setComandaParaTransferir(null)
    setMesaDestinoId("")
  }

  function abrirTrocaResponsavel(comanda) {
    setErro("")
    setMensagem("")
    setComandaParaTrocarResponsavel(comanda)
    setNovoResponsavelId(comanda.usuario_id ?? "")
  }

  function fecharTrocaResponsavel() {
    if (trocandoResponsavel) return
    setComandaParaTrocarResponsavel(null)
    setNovoResponsavelId("")
  }

  async function trocarResponsavel(evento) {
    evento.preventDefault()

    if (!comandaParaTrocarResponsavel) return

    setErro("")
    setMensagem("")

    if (!novoResponsavelId) {
      setErro("Selecione o novo responsável pela comanda.")
      return
    }

    if (novoResponsavelId === comandaParaTrocarResponsavel.usuario_id) {
      setErro("Selecione um responsável diferente do atual.")
      return
    }

    setTrocandoResponsavel(true)

    try {
      const novoResponsavel = usuarios.find(
        (usuario) => usuario.id === novoResponsavelId
      )

      if (!novoResponsavel) {
        throw new Error("O usuário selecionado não foi encontrado.")
      }

      const { data: comandaAtualizada, error: erroAtualizacao } = await supabase
        .from("comandas")
        .update({ usuario_id: novoResponsavelId })
        .eq("id", comandaParaTrocarResponsavel.id)
        .eq("status", "aberta")
        .select("id")
        .maybeSingle()

      if (erroAtualizacao) throw erroAtualizacao

      if (!comandaAtualizada) {
        throw new Error("A comanda não está mais aberta ou foi alterada por outro usuário.")
      }

      setComandaParaTrocarResponsavel(null)
      setNovoResponsavelId("")
      setMensagem(`Responsável alterado para ${novoResponsavel.nome}.`)
      await carregarDados()
    } catch (erroTroca) {
      console.error("Erro ao trocar responsável:", erroTroca)
      setErro(
        erroTroca instanceof Error
          ? erroTroca.message
          : "Não foi possível trocar o responsável pela comanda."
      )
    } finally {
      setTrocandoResponsavel(false)
    }
  }

  async function transferirComanda(evento) {
    evento.preventDefault()

    if (!comandaParaTransferir) return

    setErro("")
    setMensagem("")

    if (!mesaDestinoId) {
      setErro("Selecione uma mesa livre para receber a comanda.")
      return
    }

    if (mesaDestinoId === comandaParaTransferir.mesa_id) {
      setErro("Selecione uma mesa diferente da mesa atual.")
      return
    }

    setTransferindo(true)

    const mesaOrigemId = comandaParaTransferir.mesa_id
    let mesaDestinoReservada = false

    try {
      const { data: destino, error: erroDestino } = await supabase
        .from("mesas")
        .select("id, numero, nome, status, ativa")
        .eq("id", mesaDestinoId)
        .single()

      if (erroDestino || !destino) {
        throw new Error("A mesa de destino não foi encontrada.")
      }

      if (destino.ativa === false) {
        throw new Error("A mesa de destino está desativada.")
      }

      const { data: comandaExistente, error: erroConsultaComanda } =
        await supabase
          .from("comandas")
          .select("id")
          .eq("mesa_id", mesaDestinoId)
          .eq("status", "aberta")
          .maybeSingle()

      if (erroConsultaComanda) throw erroConsultaComanda

      if (comandaExistente) {
        throw new Error("A mesa selecionada já possui uma comanda aberta.")
      }

      const { data: mesaReservada, error: erroReservarDestino } =
        await supabase
          .from("mesas")
          .update({ status: "ocupada" })
          .eq("id", mesaDestinoId)
          .eq("ativa", true)
          .eq("status", "livre")
          .select("id")
          .maybeSingle()

      if (erroReservarDestino) throw erroReservarDestino

      if (!mesaReservada) {
        throw new Error(
          "A mesa de destino deixou de estar disponível. Atualize o painel e tente novamente."
        )
      }

      mesaDestinoReservada = true

      const { data: comandaTransferida, error: erroTransferencia } =
        await supabase
          .from("comandas")
          .update({ mesa_id: mesaDestinoId })
          .eq("id", comandaParaTransferir.id)
          .eq("mesa_id", mesaOrigemId)
          .eq("status", "aberta")
          .select("id")
          .maybeSingle()

      if (erroTransferencia) throw erroTransferencia

      if (!comandaTransferida) {
        throw new Error(
          "A comanda foi alterada por outro usuário. Atualize o painel e tente novamente."
        )
      }

      const { error: erroLiberarOrigem } = await supabase
        .from("mesas")
        .update({ status: "livre" })
        .eq("id", mesaOrigemId)

      if (erroLiberarOrigem) {
        console.error("Erro ao liberar mesa de origem:", erroLiberarOrigem)
      }

      const nomeOrigem = nomeDaMesa(mesaOrigemId)
      const nomeDestino = nomeDaMesa(mesaDestinoId)

      setComandaParaTransferir(null)
      setMesaDestinoId("")
      setMensagem(`Comanda transferida de ${nomeOrigem} para ${nomeDestino}.`)

      await carregarDados()
    } catch (erroTransferencia) {
      console.error("Erro ao transferir comanda:", erroTransferencia)

      if (mesaDestinoReservada) {
        await supabase
          .from("mesas")
          .update({ status: "livre" })
          .eq("id", mesaDestinoId)
      }

      setErro(
        erroTransferencia instanceof Error
          ? erroTransferencia.message
          : "Não foi possível transferir a comanda."
      )
    } finally {
      setTransferindo(false)
    }
  }

  function abrirJuncao(comanda) {
    const comandasDisponiveis = comandas.filter(
      (item) =>
        item.status === "aberta" &&
        item.id !== comanda.id &&
        !mesas.find((mesa) => mesa.id === item.mesa_id)?.mesa_principal_id
    )

    setErro("")
    setMensagem("")
    setComandaParaJuntar(comanda)
    setComandaSecundariaId(comandasDisponiveis[0]?.id ?? "")
  }

  function fecharJuncao() {
    if (juntandoMesas) return

    setComandaParaJuntar(null)
    setComandaSecundariaId("")
  }

  async function juntarMesas(evento) {
    evento.preventDefault()

    if (!comandaParaJuntar || !comandaSecundariaId) {
      setErro("Selecione a mesa que será juntada.")
      return
    }

    setErro("")
    setMensagem("")
    setJuntandoMesas(true)

    try {
      const comandaSecundaria = comandas.find(
        (item) => item.id === comandaSecundariaId
      )

      if (!comandaSecundaria || comandaSecundaria.status !== "aberta") {
        throw new Error("A comanda selecionada não está mais disponível.")
      }

      const mesaPrincipalId = comandaParaJuntar.mesa_id
      const mesaSecundariaId = comandaSecundaria.mesa_id

      if (mesaPrincipalId === mesaSecundariaId) {
        throw new Error("Selecione outra mesa para realizar a junção.")
      }

      const { error: erroItens } = await supabase
        .from("comanda_itens")
        .update({ comanda_id: comandaParaJuntar.id })
        .eq("comanda_id", comandaSecundaria.id)

      if (erroItens) throw erroItens

      const { error: erroAjustes } = await supabase
        .from("comanda_ajustes")
        .update({ comanda_id: comandaParaJuntar.id })
        .eq("comanda_id", comandaSecundaria.id)

      if (erroAjustes) throw erroAjustes

      const observacaoUniao = `Comanda unificada com ${nomeDaMesa(
        mesaPrincipalId
      )} em ${new Date().toLocaleString("pt-BR")}.`

      const observacoesAnteriores = comandaSecundaria.observacoes?.trim()
      const { error: erroComandaSecundaria } = await supabase
        .from("comandas")
        .update({
          status: "cancelada",
          fechada_em: new Date().toISOString(),
          observacoes: observacoesAnteriores
            ? `${observacoesAnteriores}\n${observacaoUniao}`
            : observacaoUniao,
        })
        .eq("id", comandaSecundaria.id)
        .eq("status", "aberta")

      if (erroComandaSecundaria) throw erroComandaSecundaria

      const { error: erroMesaPrincipal } = await supabase
        .from("mesas")
        .update({
          status: "ocupada",
          mesa_principal_id: null,
          grupo_mesas_id: mesaPrincipalId,
        })
        .eq("id", mesaPrincipalId)

      if (erroMesaPrincipal) throw erroMesaPrincipal

      const { error: erroMesaSecundaria } = await supabase
        .from("mesas")
        .update({
          status: "ocupada",
          mesa_principal_id: mesaPrincipalId,
          grupo_mesas_id: mesaPrincipalId,
        })
        .eq("id", mesaSecundariaId)

      if (erroMesaSecundaria) throw erroMesaSecundaria

      setComandaParaJuntar(null)
      setComandaSecundariaId("")
      setMensagem(
        `${nomeDaMesa(mesaSecundariaId)} foi juntada a ${nomeDaMesa(
          mesaPrincipalId
        )}. Os pedidos agora estão em uma única comanda.`
      )

      await carregarDados()
    } catch (erroJuncao) {
      console.error("Erro ao juntar mesas:", erroJuncao)
      setErro(
        erroJuncao instanceof Error
          ? erroJuncao.message
          : "Não foi possível juntar as mesas."
      )
    } finally {
      setJuntandoMesas(false)
    }
  }

  async function separarMesaDoGrupo(mesa) {
    if (!mesa?.mesa_principal_id) return

    const mesaPrincipalId = mesa.mesa_principal_id
    const confirmado = window.confirm(
      `Deseja separar ${nomeDaMesa(mesa.id)} do grupo? A mesa ficará livre, mas os pedidos já unificados continuarão na comanda principal.`
    )

    if (!confirmado) return

    setErro("")
    setMensagem("")
    setSeparandoMesaId(mesa.id)

    try {
      const { data: mesaSeparada, error: erroSeparacao } = await supabase
        .from("mesas")
        .update({
          status: "livre",
          mesa_principal_id: null,
          grupo_mesas_id: null,
        })
        .eq("id", mesa.id)
        .eq("mesa_principal_id", mesaPrincipalId)
        .select("id")
        .maybeSingle()

      if (erroSeparacao) throw erroSeparacao

      if (!mesaSeparada) {
        throw new Error(
          "A mesa já foi alterada por outro usuário. Atualize o painel e tente novamente."
        )
      }

      const { data: mesasRestantes, error: erroConsultaGrupo } = await supabase
        .from("mesas")
        .select("id")
        .eq("mesa_principal_id", mesaPrincipalId)
        .limit(1)

      if (erroConsultaGrupo) throw erroConsultaGrupo

      if (!mesasRestantes || mesasRestantes.length === 0) {
        const { error: erroLimparPrincipal } = await supabase
          .from("mesas")
          .update({ grupo_mesas_id: null })
          .eq("id", mesaPrincipalId)

        if (erroLimparPrincipal) throw erroLimparPrincipal
      }

      setMensagem(
        `${nomeDaMesa(mesa.id)} foi separada e está livre. Os pedidos já unificados permanecem em ${nomeDaMesa(mesaPrincipalId)}.`
      )

      await carregarDados()
    } catch (erroSeparacao) {
      console.error("Erro ao separar mesa:", erroSeparacao)
      setErro(
        erroSeparacao instanceof Error
          ? erroSeparacao.message
          : "Não foi possível separar a mesa."
      )
    } finally {
      setSeparandoMesaId(null)
    }
  }

  function obterItensDaComanda(comandaId) {
    return itens.filter((item) => item.comanda_id === comandaId)
  }

  function calcularQuantidadeItens(comandaId) {
    return obterItensDaComanda(comandaId).reduce(
      (total, item) => total + Number(item.quantidade ?? 0),
      0
    )
  }

  function calcularTotalConsumo(comandaId) {
    return obterItensDaComanda(comandaId).reduce((total, item) => {
      const subtotal =
        item.subtotal ??
        Number(item.quantidade ?? 0) *
          Number(item.preco_unitario ?? 0)

      return total + Number(subtotal)
    }, 0)
  }

  function obterTotalExibido(comanda) {
    const totalConsumo = calcularTotalConsumo(comanda.id)

    if (comanda.status === "fechada") {
      return Number(comanda.total_final ?? comanda.total ?? totalConsumo)
    }

    const totalFinal = Number(comanda.total_final)

    return Number.isFinite(totalFinal) && totalFinal > 0
      ? totalFinal
      : totalConsumo
  }

  function nomeDaMesa(mesaId) {
    const mesa = mesas.find((item) => item.id === mesaId)

    if (!mesa) return "Mesa não encontrada"

    return `Mesa ${mesa.numero}${mesa.nome ? ` — ${mesa.nome}` : ""}`
  }

  function nomeDoUsuario(usuarioId) {
    const usuario = usuarios.find((item) => item.id === usuarioId)
    return usuario?.nome ?? "Não identificado"
  }

  function obterComandaAbertaDaMesa(mesaId) {
    return comandas.find(
      (comanda) =>
        comanda.mesa_id === mesaId &&
        comanda.status === "aberta"
    )
  }

  const mesasAtivas = useMemo(
    () => mesas.filter((mesa) => mesa.ativa !== false),
    [mesas]
  )

  const idsMesasOcupadas = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.status === "aberta")
      .map((comanda) => comanda.mesa_id)
  }, [comandas])

  function obterReservaAtivaDaMesa(mesaId) {
    return reservas.find((reserva) => reserva.mesa_id === mesaId && reserva.status === "ativa")
  }

  const idsMesasReservadas = useMemo(
    () => reservas.filter((reserva) => reserva.status === "ativa").map((reserva) => reserva.mesa_id),
    [reservas]
  )

  const mesasDisponiveisParaReserva = useMemo(() => {
    return mesasAtivas.filter(
      (mesa) =>
        !idsMesasOcupadas.includes(mesa.id) &&
        !idsMesasReservadas.includes(mesa.id) &&
        !mesa.mesa_principal_id &&
        !mesa.grupo_mesas_id
    )
  }, [mesasAtivas, idsMesasOcupadas, idsMesasReservadas])

  const mesasLivres = useMemo(() => {
    return mesasAtivas.filter(
      (mesa) =>
        !idsMesasOcupadas.includes(mesa.id) &&
        !idsMesasReservadas.includes(mesa.id) &&
        !mesa.mesa_principal_id &&
        !mesa.grupo_mesas_id
    )
  }, [mesasAtivas, idsMesasOcupadas, idsMesasReservadas])

  const mesasDisponiveisParaComanda = useMemo(() => {
    if (!reservaParaAtender) return mesasLivres

    const mesaReservada = mesasAtivas.find(
      (mesa) => mesa.id === reservaParaAtender.mesa_id
    )

    if (!mesaReservada) return mesasLivres

    return [
      mesaReservada,
      ...mesasLivres.filter((mesa) => mesa.id !== mesaReservada.id),
    ]
  }, [mesasLivres, mesasAtivas, reservaParaAtender])

  const mesasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return mesasAtivas.filter((mesa) => {
      const comanda = obterComandaAbertaDaMesa(mesa.id)
      const ocupada = Boolean(comanda || mesa.mesa_principal_id)
      const reservada = Boolean(obterReservaAtivaDaMesa(mesa.id))

      const textoMesa = `mesa ${mesa.numero} ${mesa.nome ?? ""}`.toLowerCase()
      const cliente = comanda?.cliente?.toLowerCase() ?? ""

      const correspondeBusca =
        !termo ||
        textoMesa.includes(termo) ||
        cliente.includes(termo)

      const correspondeFiltro =
        filtroMesas === "todas" ||
        (filtroMesas === "livres" && !ocupada && !reservada) ||
        (filtroMesas === "ocupadas" && ocupada) ||
        (filtroMesas === "reservadas" && reservada)

      return correspondeBusca && correspondeFiltro
    })
  }, [mesasAtivas, comandas, reservas, busca, filtroMesas])

  const comandasHistorico = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return comandas.filter((comanda) => {
      if (comanda.status === "aberta") return false

      const mesa = nomeDaMesa(comanda.mesa_id).toLowerCase()
      const cliente = comanda.cliente?.toLowerCase() ?? ""

      return !termo || mesa.includes(termo) || cliente.includes(termo)
    })
  }, [comandas, busca, mesas])

  const totalAbertas = idsMesasOcupadas.length
  const totalReservadas = idsMesasReservadas.length
  const totalLivres = Math.max(mesasAtivas.length - totalAbertas - totalReservadas, 0)

  const valorComandasAbertas = comandas
    .filter((comanda) => comanda.status === "aberta")
    .reduce((total, comanda) => total + obterTotalExibido(comanda), 0)

  return (
    <section>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
            Atendimento
          </p>

          <h2 className="mt-1 text-3xl font-bold text-white">
            Painel de mesas
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Abra comandas, lance pedidos e acompanhe o salão em tempo real.
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
            onClick={() => abrirModalReserva()}
            disabled={mesasDisponiveisParaReserva.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-5 py-3 font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarPlus size={20} />
            Nova reserva
          </button>

          <button
            type="button"
            onClick={() => abrirNovaComanda()}
            disabled={mesasLivres.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CirclePlus size={20} />
            Abrir comanda
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardResumo
          titulo="Mesas livres"
          valor={totalLivres}
          detalhe={`de ${mesasAtivas.length} mesas`}
          tipo="livre"
        />

        <CardResumo
          titulo="Mesas ocupadas"
          valor={totalAbertas}
          detalhe="com atendimento"
          tipo="ocupada"
        />

        <CardResumo
          titulo="Valor em aberto"
          valor={formatarMoeda(valorComandasAbertas)}
          detalhe="consumo atual"
          tipo="valor"
        />

        <CardResumo
          titulo="Mesas reservadas"
          valor={totalReservadas}
          detalhe="aguardando clientes"
          tipo="reservada"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-xl bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setVisualizacao("mesas")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                visualizacao === "mesas"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Armchair size={17} />
              Mesas
            </button>

            <button
              type="button"
              onClick={() => setVisualizacao("historico")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                visualizacao === "historico"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <History size={17} />
              Histórico
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:max-w-2xl">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar mesa ou cliente..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
              />
            </div>

            {visualizacao === "mesas" && (
              <select
                value={filtroMesas}
                onChange={(evento) => setFiltroMesas(evento.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              >
                <option value="todas">Todas as mesas</option>
                <option value="livres">Somente livres</option>
                <option value="ocupadas">Somente ocupadas</option>
                <option value="reservadas">Somente reservadas</option>
              </select>
            )}
          </div>
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
          Carregando salão...
        </div>
      ) : visualizacao === "mesas" ? (
        <PainelMesas
          mesas={mesasFiltradas}
          agora={agora}
          obterComanda={obterComandaAbertaDaMesa}
          obterTotal={obterTotalExibido}
          calcularQuantidadeItens={calcularQuantidadeItens}
          aoAbrirComanda={abrirNovaComanda}
          aoGerenciar={abrirGerenciamento}
          aoFecharConta={abrirFechamento}
          aoPreConta={abrirPreConta}
          aoTransferir={abrirTransferencia}
          aoJuntar={abrirJuncao}
          aoTrocarResponsavel={abrirTrocaResponsavel}
          nomeDoUsuario={nomeDoUsuario}
          aoSeparar={separarMesaDoGrupo}
          separandoMesaId={separandoMesaId}
          obterReserva={obterReservaAtivaDaMesa}
          aoReservar={abrirModalReserva}
          aoAtenderReserva={iniciarAtendimentoReserva}
          aoCancelarReserva={cancelarReserva}
          aoCancelar={cancelarComanda}
        />
      ) : (
        <HistoricoComandas
          comandas={comandasHistorico}
          comandaExpandida={comandaExpandida}
          setComandaExpandida={setComandaExpandida}
          obterItensDaComanda={obterItensDaComanda}
          obterTotalExibido={obterTotalExibido}
          calcularTotalConsumo={calcularTotalConsumo}
          nomeDaMesa={nomeDaMesa}
          nomeDoUsuario={nomeDoUsuario}
        />
      )}

      {modalAberto && (
        <ModalNovaComanda
          formulario={formulario}
          mesasLivres={mesasDisponiveisParaComanda}
          salvando={salvando}
          erro={erro}
          aoAtualizarCampo={atualizarCampo}
          aoSalvar={criarComanda}
          aoFechar={fecharModal}
        />
      )}

      {comandaGerenciada && (
        <GerenciarComandaModal
          comanda={comandaGerenciada}
          nomeMesa={nomeDaMesa(comandaGerenciada.mesa_id)}
          aoAtualizar={carregarDados}
          aoFechar={fecharGerenciamento}
        />
      )}

      {comandaParaFechar && (
        <FecharComandaModal
          comanda={comandaParaFechar}
          nomeMesa={nomeDaMesa(comandaParaFechar.mesa_id)}
          aoFechar={fecharModalFechamento}
          aoFinalizar={finalizarFechamento}
        />
      )}

      {comandaPreConta && (
        <ModalPreConta
          comanda={comandaPreConta}
          nomeMesa={nomeDaMesa(comandaPreConta.mesa_id)}
          itens={obterItensDaComanda(comandaPreConta.id)}
          aoFechar={fecharPreConta}
        />
      )}

      {comandaParaTransferir && (
        <ModalTransferirComanda
          comanda={comandaParaTransferir}
          nomeMesaOrigem={nomeDaMesa(comandaParaTransferir.mesa_id)}
          mesasLivres={mesasLivres.filter(
            (mesa) => mesa.id !== comandaParaTransferir.mesa_id
          )}
          mesaDestinoId={mesaDestinoId}
          transferindo={transferindo}
          erro={erro}
          aoSelecionarMesa={setMesaDestinoId}
          aoConfirmar={transferirComanda}
          aoFechar={fecharTransferencia}
        />
      )}

      {modalReservaAberto && (
        <ModalReservaMesa
          formulario={formularioReserva}
          mesasDisponiveis={mesasDisponiveisParaReserva}
          salvando={salvandoReserva}
          erro={erro}
          aoAtualizar={atualizarCampoReserva}
          aoSalvar={criarReserva}
          aoFechar={fecharModalReserva}
        />
      )}

      {comandaParaTrocarResponsavel && (
        <ModalTrocarResponsavel
          comanda={comandaParaTrocarResponsavel}
          nomeMesa={nomeDaMesa(comandaParaTrocarResponsavel.mesa_id)}
          responsavelAtual={nomeDoUsuario(comandaParaTrocarResponsavel.usuario_id)}
          usuarios={usuarios}
          novoResponsavelId={novoResponsavelId}
          trocando={trocandoResponsavel}
          erro={erro}
          aoSelecionar={setNovoResponsavelId}
          aoConfirmar={trocarResponsavel}
          aoFechar={fecharTrocaResponsavel}
        />
      )}

      {comandaParaJuntar && (
        <ModalJuntarMesas
          comandaPrincipal={comandaParaJuntar}
          nomeMesaPrincipal={nomeDaMesa(comandaParaJuntar.mesa_id)}
          comandasDisponiveis={comandas.filter(
            (item) =>
              item.status === "aberta" &&
              item.id !== comandaParaJuntar.id &&
              !mesas.find((mesa) => mesa.id === item.mesa_id)?.mesa_principal_id
          )}
          comandaSecundariaId={comandaSecundariaId}
          nomeDaMesa={nomeDaMesa}
          obterTotal={obterTotalExibido}
          juntando={juntandoMesas}
          erro={erro}
          aoSelecionar={setComandaSecundariaId}
          aoConfirmar={juntarMesas}
          aoFechar={fecharJuncao}
        />
      )}
    </section>
  )
}

function PainelMesas({
  mesas,
  agora,
  obterComanda,
  obterTotal,
  calcularQuantidadeItens,
  aoAbrirComanda,
  aoGerenciar,
  aoFecharConta,
  aoPreConta,
  aoTransferir,
  aoJuntar,
  aoTrocarResponsavel,
  nomeDoUsuario,
  aoSeparar,
  separandoMesaId,
  obterReserva,
  aoReservar,
  aoAtenderReserva,
  aoCancelarReserva,
  aoCancelar,
}) {
  if (mesas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma mesa encontrada"
        texto="Altere a busca ou o filtro para visualizar outras mesas."
      />
    )
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {mesas.map((mesa) => {
        const comanda = obterComanda(mesa.id)

        if (mesa.mesa_principal_id) {
          const comandaPrincipal = obterComanda(mesa.mesa_principal_id)

          return (
            <MesaAgrupadaCard
              key={mesa.id}
              mesa={mesa}
              mesaPrincipalId={mesa.mesa_principal_id}
              comanda={comandaPrincipal}
              obterTotal={obterTotal}
              calcularQuantidadeItens={calcularQuantidadeItens}
              aoGerenciar={() => comandaPrincipal && aoGerenciar(comandaPrincipal)}
              aoSeparar={() => aoSeparar(mesa)}
              separando={separandoMesaId === mesa.id}
            />
          )
        }

        const reserva = obterReserva(mesa.id)

        if (!comanda && reserva) {
          return (
            <MesaReservadaCard
              key={mesa.id}
              mesa={mesa}
              reserva={reserva}
              aoAtender={() => aoAtenderReserva(reserva)}
              aoCancelar={() => aoCancelarReserva(reserva)}
            />
          )
        }

        if (!comanda) {
          return (
            <MesaLivreCard
              key={mesa.id}
              mesa={mesa}
              aoAbrir={() => aoAbrirComanda(mesa.id)}
              aoReservar={() => aoReservar(mesa.id)}
            />
          )
        }

        return (
          <MesaOcupadaCard
            key={mesa.id}
            mesa={mesa}
            comanda={comanda}
            agora={agora}
            quantidadeItens={calcularQuantidadeItens(comanda.id)}
            total={obterTotal(comanda)}
            aoGerenciar={() => aoGerenciar(comanda)}
            aoFecharConta={() => aoFecharConta(comanda)}
            aoPreConta={() => aoPreConta(comanda)}
            aoTransferir={() => aoTransferir(comanda)}
            aoJuntar={() => aoJuntar(comanda)}
            aoTrocarResponsavel={() => aoTrocarResponsavel(comanda)}
            nomeResponsavel={nomeDoUsuario(comanda.usuario_id)}
            aoCancelar={() => aoCancelar(comanda)}
          />
        )
      })}
    </div>
  )
}

function MesaLivreCard({ mesa, aoAbrir, aoReservar }) {
  return (
    <article className="group flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-emerald-500/25 bg-slate-900 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20">
      <div className="h-1.5 bg-emerald-500" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              Livre
            </p>

            <h3 className="mt-2 text-2xl font-bold text-white">
              Mesa {mesa.numero}
            </h3>

            {mesa.nome && (
              <p className="mt-1 text-sm text-slate-400">{mesa.nome}</p>
            )}
          </div>

          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
            <Armchair size={27} />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-7">
          <div className="text-center">
            <p className="text-sm text-slate-500">Disponível para atendimento</p>
            <p className="mt-2 text-lg font-semibold text-slate-300">
              Toque para abrir
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={aoReservar}
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 px-3 py-3.5 font-bold text-sky-300 transition hover:bg-sky-500/10"
          >
            <CalendarPlus size={18} />
            Reservar
          </button>

          <button
            type="button"
            onClick={aoAbrir}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3.5 font-bold text-white transition hover:bg-emerald-700"
          >
            <CirclePlus size={18} />
            Abrir
          </button>
        </div>
      </div>
    </article>
  )
}

function MesaAgrupadaCard({
  mesa,
  mesaPrincipalId,
  comanda,
  obterTotal,
  calcularQuantidadeItens,
  aoGerenciar,
  aoSeparar,
  separando,
}) {
  return (
    <article className="flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-violet-500/30 bg-slate-900">
      <div className="h-1.5 bg-violet-500" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
              Mesa agrupada
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              Mesa {mesa.numero}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Atendimento vinculado à mesa principal.
            </p>
          </div>

          <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
            <Users size={27} />
          </div>
        </div>

        <div className="my-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-950/70 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Itens do grupo
            </p>
            <p className="mt-2 text-xl font-bold text-white">
              {comanda ? calcularQuantidadeItens(comanda.id) : 0}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Total do grupo
            </p>
            <p className="mt-2 text-xl font-bold text-emerald-300">
              {formatarMoeda(comanda ? obterTotal(comanda) : 0)}
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={aoGerenciar}
            disabled={!comanda || separando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 font-bold text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            <ShoppingCart size={18} />
            Abrir comanda principal
          </button>

          <button
            type="button"
            onClick={aoSeparar}
            disabled={separando}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {separando ? (
              <>
                <RefreshCw size={17} className="animate-spin" />
                Separando...
              </>
            ) : (
              <>
                <Unlink size={17} />
                Separar mesa do grupo
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

function MesaReservadaCard({ mesa, reserva, aoAtender, aoCancelar }) {
  const atrasada = new Date(reserva.data_hora).getTime() < Date.now()

  return (
    <article className="group flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-900 transition hover:-translate-y-0.5 hover:border-sky-500/60 hover:shadow-xl hover:shadow-sky-950/20">
      <div className="h-1.5 bg-sky-500" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-400">Reservada</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Mesa {mesa.numero}</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <UserRound size={15} />
              <span className="truncate font-semibold">{reserva.cliente}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
            <CalendarClock size={27} />
          </div>
        </div>

        <div className="my-5 space-y-2 rounded-xl bg-slate-950/70 p-3 text-sm">
          <p className={atrasada ? "font-semibold text-red-300" : "font-semibold text-sky-300"}>
            {formatarDataHora(reserva.data_hora)}{atrasada ? " — horário ultrapassado" : ""}
          </p>
          <p className="text-slate-400">{reserva.quantidade_pessoas || 1} pessoa(s)</p>
          {reserva.telefone && (
            <p className="flex items-center gap-2 text-slate-400"><Phone size={14} /> {reserva.telefone}</p>
          )}
          {reserva.observacoes && <p className="line-clamp-2 text-xs text-slate-500">{reserva.observacoes}</p>}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <button type="button" onClick={aoCancelar} className="rounded-xl border border-red-500/30 px-3 py-3 font-semibold text-red-300 transition hover:bg-red-500/10">Cancelar</button>
          <button type="button" onClick={aoAtender} className="rounded-xl bg-sky-600 px-3 py-3 font-bold text-white transition hover:bg-sky-700">Atender</button>
        </div>
      </div>
    </article>
  )
}

function MesaOcupadaCard({
  mesa,
  comanda,
  agora,
  quantidadeItens,
  total,
  aoGerenciar,
  aoFecharConta,
  aoPreConta,
  aoTransferir,
  aoJuntar,
  aoTrocarResponsavel,
  nomeResponsavel,
  aoCancelar,
}) {
  const tempo = calcularTempoAberta(comanda.aberta_em, agora)
  const semItens = quantidadeItens === 0

  return (
    <article className="group flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-orange-500/30 bg-slate-900 transition hover:-translate-y-0.5 hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-950/20">
      <div className="h-1.5 bg-orange-500" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
              Ocupada
            </p>

            <h3 className="mt-2 text-2xl font-bold text-white">
              Mesa {mesa.numero}
            </h3>

            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <UserRound size={15} />

              <span className="truncate">
                {comanda.cliente || "Cliente não informado"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <UserCog size={14} />
              <span className="truncate">Responsável: {nomeResponsavel}</span>
            </div>
          </div>

          <TempoMesa tempo={tempo} />
        </div>

        <div className="my-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-950/70 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Package size={16} />
              <span className="text-xs font-semibold uppercase">Itens</span>
            </div>

            <p className="mt-2 text-xl font-bold text-white">
              {quantidadeItens}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Total
            </p>

            <p className="mt-2 text-xl font-bold text-emerald-300">
              {formatarMoeda(total)}
            </p>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={aoGerenciar}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-3 font-bold text-white transition hover:bg-orange-700"
          >
            <ShoppingCart size={18} />
            Pedido
          </button>

          <button
            type="button"
            onClick={aoFecharConta}
            disabled={semItens}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ReceiptText size={18} />
            Fechar
          </button>
        </div>

        <button
          type="button"
          onClick={aoPreConta}
          disabled={semItens}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer size={17} />
          Ver pré-conta
        </button>

        <button
          type="button"
          onClick={aoTransferir}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 px-3 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/10"
        >
          <ArrowRightLeft size={17} />
          Transferir mesa
        </button>

        <button
          type="button"
          onClick={aoJuntar}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 px-3 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/10"
        >
          <Users size={17} />
          Juntar mesas
        </button>

        <button
          type="button"
          onClick={aoTrocarResponsavel}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 px-3 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10"
        >
          <UserCog size={17} />
          Trocar responsável
        </button>

        {semItens && (
          <button
            type="button"
            onClick={aoCancelar}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
          >
            <Ban size={16} />
            Cancelar comanda vazia
          </button>
        )}
      </div>
    </article>
  )
}

function TempoMesa({ tempo }) {
  const classe =
    tempo.minutosTotais >= 120
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : tempo.minutosTotais >= 60
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-slate-700 bg-slate-950 text-slate-300"

  return (
    <div className={`rounded-xl border px-3 py-2 text-right ${classe}`}>
      <div className="flex items-center justify-end gap-1.5 text-xs">
        <Clock3 size={14} />
        Aberta há
      </div>

      <p className="mt-1 font-bold">{tempo.texto}</p>
    </div>
  )
}

function HistoricoComandas({
  comandas,
  comandaExpandida,
  setComandaExpandida,
  obterItensDaComanda,
  obterTotalExibido,
  calcularTotalConsumo,
  nomeDaMesa,
  nomeDoUsuario,
}) {
  if (comandas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma comanda no histórico"
        texto="As comandas fechadas e canceladas aparecerão aqui."
      />
    )
  }

  return (
    <div className="mt-6 space-y-4">
      {comandas.map((comanda) => {
        const itensComanda = obterItensDaComanda(comanda.id)
        const expandida = comandaExpandida === comanda.id
        const totalExibido = obterTotalExibido(comanda)

        return (
          <article
            key={comanda.id}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
          >
            <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-5">
                <Informacao
                  titulo="Mesa"
                  valor={nomeDaMesa(comanda.mesa_id)}
                />

                <Informacao
                  titulo="Cliente"
                  valor={comanda.cliente || "Não informado"}
                />

                <Informacao
                  titulo="Responsável"
                  valor={nomeDoUsuario(comanda.usuario_id)}
                />

                <Informacao
                  titulo="Fechamento"
                  valor={formatarDataHora(comanda.fechada_em)}
                />

                <Informacao
                  titulo="Total final"
                  valor={formatarMoeda(totalExibido)}
                  destaque
                />
              </div>

              <div className="flex items-center gap-2">
                <StatusComanda status={comanda.status} />

                <button
                  type="button"
                  onClick={() =>
                    setComandaExpandida(expandida ? null : comanda.id)
                  }
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  {expandida ? (
                    <>
                      Ocultar
                      <ChevronUp size={17} />
                    </>
                  ) : (
                    <>
                      Ver itens
                      <ChevronDown size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {expandida && (
              <DetalhesHistorico
                comanda={comanda}
                itens={itensComanda}
                totalConsumo={calcularTotalConsumo(comanda.id)}
                totalFinal={totalExibido}
              />
            )}
          </article>
        )
      })}
    </div>
  )
}

function DetalhesHistorico({
  comanda,
  itens,
  totalConsumo,
  totalFinal,
}) {
  return (
    <div className="border-t border-slate-800 bg-slate-950/40 p-5">
      {comanda.observacoes && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Observações
          </p>

          <p className="mt-1 text-sm text-slate-300">
            {comanda.observacoes}
          </p>
        </div>
      )}

      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhum produto lançado nesta comanda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="pb-3">Produto</th>
                <th className="pb-3">Quantidade</th>
                <th className="pb-3">Preço</th>
                <th className="pb-3 text-right">Subtotal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-white">
                    {item.produtos?.nome ?? "Produto não encontrado"}

                    {item.observacao && (
                      <p className="mt-1 text-xs text-amber-300">
                        {item.observacao}
                      </p>
                    )}
                  </td>

                  <td className="py-3 text-slate-300">
                    {item.quantidade}
                  </td>

                  <td className="py-3 text-slate-300">
                    {formatarMoeda(item.preco_unitario)}
                  </td>

                  <td className="py-3 text-right font-semibold text-emerald-300">
                    {formatarMoeda(
                      item.subtotal ??
                        Number(item.quantidade) *
                          Number(item.preco_unitario)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 ml-auto max-w-sm space-y-2 border-t border-slate-800 pt-4">
        <LinhaTotal titulo="Consumo" valor={totalConsumo} />

        <LinhaTotal
          titulo="Acréscimos"
          valor={Number(comanda.total_acrescimos ?? 0)}
          prefixo="+"
          classeValor="text-orange-300"
        />

        <LinhaTotal
          titulo="Descontos"
          valor={Number(comanda.total_descontos ?? 0)}
          prefixo="-"
          classeValor="text-blue-300"
        />

        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <span className="font-semibold text-slate-300">Total final</span>

          <strong className="text-2xl text-emerald-300">
            {formatarMoeda(totalFinal)}
          </strong>
        </div>

        {Number(comanda.quantidade_pessoas ?? 1) > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {comanda.quantidade_pessoas} pessoas
            </span>

            <strong className="text-orange-300">
              {formatarMoeda(comanda.valor_por_pessoa)} por pessoa
            </strong>
          </div>
        )}
      </div>
    </div>
  )
}

function EstadoVazio({ titulo, texto }) {
  return (
    <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
      <ClipboardList size={44} className="text-slate-500" />

      <h3 className="mt-4 text-lg font-bold text-white">{titulo}</h3>
      <p className="mt-1 text-sm text-slate-400">{texto}</p>
    </div>
  )
}

function CardResumo({ titulo, valor, detalhe, tipo }) {
  const estilos = {
    livre: "text-emerald-300",
    ocupada: "text-orange-300",
    valor: "text-amber-300",
    fechada: "text-sky-300",
    reservada: "text-sky-300",
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </p>

      <p className={`mt-2 text-2xl font-bold sm:text-3xl ${estilos[tipo]}`}>
        {valor}
      </p>

      <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
    </div>
  )
}

function LinhaTotal({
  titulo,
  valor,
  prefixo = "",
  classeValor = "text-white",
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{titulo}</span>

      <strong className={classeValor}>
        {prefixo && Number(valor) > 0 ? `${prefixo} ` : ""}
        {formatarMoeda(valor)}
      </strong>
    </div>
  )
}

function Informacao({ titulo, valor, destaque = false }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">
        {titulo}
      </p>

      <p
        className={`mt-1 font-semibold ${
          destaque ? "text-emerald-300" : "text-white"
        }`}
      >
        {valor}
      </p>
    </div>
  )
}

function StatusComanda({ status }) {
  const estilos = {
    aberta:
      "border-orange-500/40 bg-orange-500/10 text-orange-300",
    fechada:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    cancelada:
      "border-red-500/40 bg-red-500/10 text-red-300",
  }

  const nomes = {
    aberta: "Aberta",
    fechada: "Fechada",
    cancelada: "Cancelada",
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        estilos[status] ?? estilos.aberta
      }`}
    >
      {nomes[status] ?? status}
    </span>
  )
}

function ModalReservaMesa({ formulario, mesasDisponiveis, salvando, erro, aoAtualizar, aoSalvar, aoFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">Reservar mesa</h3>
            <p className="mt-1 text-sm text-slate-400">Registre o cliente, a data e o horário da reserva.</p>
          </div>
          <button type="button" onClick={aoFechar} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X size={22} /></button>
        </div>

        <form onSubmit={aoSalvar} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Mesa *</label>
              <select name="mesa_id" value={formulario.mesa_id} onChange={aoAtualizar} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500">
                <option value="">Selecione</option>
                {mesasDisponiveis.map((mesa) => <option key={mesa.id} value={mesa.id}>Mesa {mesa.numero}{mesa.nome ? ` — ${mesa.nome}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Data e horário *</label>
              <input type="datetime-local" name="data_hora" value={formulario.data_hora} onChange={aoAtualizar} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Cliente *</label>
            <input name="cliente" value={formulario.cliente} onChange={aoAtualizar} required maxLength={120} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Telefone</label>
              <input name="telefone" value={formulario.telefone} onChange={aoAtualizar} maxLength={30} placeholder="(79) 99999-9999" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Quantidade de pessoas</label>
              <input type="number" name="quantidade_pessoas" min="1" max="50" value={formulario.quantidade_pessoas} onChange={aoAtualizar} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Observações</label>
            <textarea name="observacoes" rows="3" value={formulario.observacoes} onChange={aoAtualizar} maxLength={300} className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500" />
          </div>

          {erro && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erro}</div>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={aoFechar} disabled={salvando} className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={salvando || mesasDisponiveis.length === 0} className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50">{salvando ? "Salvando..." : "Confirmar reserva"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalNovaComanda({
  formulario,
  mesasLivres,
  salvando,
  erro,
  aoAtualizarCampo,
  aoSalvar,
  aoFechar,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              Abrir comanda
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Escolha a mesa que receberá os pedidos.
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
              Mesa *
            </label>

            <select
              name="mesa_id"
              value={formulario.mesa_id}
              onChange={aoAtualizarCampo}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
            >
              <option value="">Selecione uma mesa</option>

              {mesasLivres.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  Mesa {mesa.numero}
                  {mesa.nome ? ` — ${mesa.nome}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Nome do cliente
            </label>

            <input
              name="cliente"
              type="text"
              value={formulario.cliente}
              onChange={aoAtualizarCampo}
              placeholder="Opcional"
              maxLength={120}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Observações
            </label>

            <textarea
              name="observacoes"
              rows="3"
              value={formulario.observacoes}
              onChange={aoAtualizarCampo}
              placeholder="Informações opcionais sobre a comanda"
              maxLength={300}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />
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
              disabled={salvando || mesasLivres.length === 0}
              className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              {salvando ? "Abrindo..." : "Abrir comanda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function ModalPreConta({
  comanda,
  nomeMesa,
  itens,
  aoFechar,
}) {
  const [ajustes, setAjustes] = useState([])
  const [carregandoAjustes, setCarregandoAjustes] = useState(true)
  const [erroAjustes, setErroAjustes] = useState("")

  useEffect(() => {
    let ativo = true

    async function carregarAjustes() {
      setCarregandoAjustes(true)
      setErroAjustes("")

      const { data, error } = await supabase
        .from("comanda_ajustes")
        .select("id, tipo, descricao, valor")
        .eq("comanda_id", comanda.id)
        .order("criado_em", { ascending: true })

      if (!ativo) return

      if (error) {
        console.error("Erro ao carregar ajustes da pré-conta:", error)
        setErroAjustes("Não foi possível carregar acréscimos e descontos.")
        setAjustes([])
      } else {
        setAjustes(data ?? [])
      }

      setCarregandoAjustes(false)
    }

    carregarAjustes()

    return () => {
      ativo = false
    }
  }, [comanda.id])

  const subtotal = itens.reduce((total, item) => {
    const valor =
      item.subtotal ??
      Number(item.quantidade ?? 0) * Number(item.preco_unitario ?? 0)

    return total + Number(valor)
  }, 0)

  const totalAcrescimos = ajustes
    .filter((ajuste) => ajuste.tipo === "acrescimo")
    .reduce((total, ajuste) => total + Number(ajuste.valor ?? 0), 0)

  const totalDescontos = ajustes
    .filter((ajuste) => ajuste.tipo === "desconto")
    .reduce((total, ajuste) => total + Number(ajuste.valor ?? 0), 0)

  const totalFinal = Math.max(
    subtotal + totalAcrescimos - totalDescontos,
    0
  )

  function imprimirPreConta() {
    const janela = window.open("", "_blank", "width=420,height=720")

    if (!janela) {
      window.alert(
        "O navegador bloqueou a janela de impressão. Libere os pop-ups e tente novamente."
      )
      return
    }

    const linhasItens = itens
      .map((item) => {
        const nome = escaparHtml(
          item.produtos?.nome ?? "Produto não encontrado"
        )
        const observacao = item.observacao
          ? `<div class="obs">${escaparHtml(item.observacao)}</div>`
          : ""
        const valor =
          item.subtotal ??
          Number(item.quantidade ?? 0) * Number(item.preco_unitario ?? 0)

        return `
          <tr>
            <td>${item.quantidade}x ${nome}${observacao}</td>
            <td class="direita">${formatarMoeda(valor)}</td>
          </tr>
        `
      })
      .join("")

    const linhasAjustes = ajustes
      .map((ajuste) => {
        const sinal = ajuste.tipo === "desconto" ? "-" : "+"
        return `
          <tr>
            <td>${escaparHtml(ajuste.descricao)}</td>
            <td class="direita">${sinal} ${formatarMoeda(ajuste.valor)}</td>
          </tr>
        `
      })
      .join("")

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Pré-conta - ${escaparHtml(nomeMesa)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 18px;
              font-family: Arial, sans-serif;
              color: #111;
              background: #fff;
              font-size: 13px;
            }
            h1 { margin: 0; text-align: center; font-size: 20px; }
            .subtitulo { margin-top: 4px; text-align: center; }
            .linha { border-top: 1px dashed #333; margin: 14px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 5px 0; vertical-align: top; }
            .direita { text-align: right; white-space: nowrap; padding-left: 12px; }
            .obs { margin: 2px 0 0 14px; font-size: 11px; color: #555; }
            .totais td { padding: 4px 0; }
            .total-final { font-size: 18px; font-weight: bold; }
            .rodape { margin-top: 16px; text-align: center; font-size: 11px; }
            @media print {
              body { padding: 0; }
              @page { size: 80mm auto; margin: 6mm; }
            }
          </style>
        </head>
        <body>
          <h1>Santo Espetinho</h1>
          <div class="subtitulo">PRÉ-CONTA — NÃO É DOCUMENTO FISCAL</div>
          <div class="linha"></div>
          <strong>${escaparHtml(nomeMesa)}</strong><br />
          ${
            comanda.cliente
              ? `Cliente: ${escaparHtml(comanda.cliente)}<br />`
              : ""
          }
          Abertura: ${formatarDataHora(comanda.aberta_em)}
          <div class="linha"></div>
          <table>${linhasItens}</table>
          ${linhasAjustes ? `<div class="linha"></div><table>${linhasAjustes}</table>` : ""}
          <div class="linha"></div>
          <table class="totais">
            <tr><td>Consumo</td><td class="direita">${formatarMoeda(subtotal)}</td></tr>
            ${totalAcrescimos > 0 ? `<tr><td>Acréscimos</td><td class="direita">+ ${formatarMoeda(totalAcrescimos)}</td></tr>` : ""}
            ${totalDescontos > 0 ? `<tr><td>Descontos</td><td class="direita">- ${formatarMoeda(totalDescontos)}</td></tr>` : ""}
            <tr class="total-final"><td>Total</td><td class="direita">${formatarMoeda(totalFinal)}</td></tr>
          </table>
          <div class="rodape">Impresso em ${new Date().toLocaleString("pt-BR")}</div>
          <script>
            window.onload = function () {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `)

    janela.document.close()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Printer size={21} className="text-amber-300" />
              <h3 className="text-xl font-bold text-white">Pré-conta</h3>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {nomeMesa}
              {comanda.cliente ? ` • ${comanda.cliente}` : ""}
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-slate-800 bg-white p-5 text-slate-950">
            <div className="text-center">
              <h4 className="text-xl font-bold">Santo Espetinho</h4>
              <p className="mt-1 text-xs font-semibold">
                PRÉ-CONTA — NÃO É DOCUMENTO FISCAL
              </p>
            </div>

            <div className="my-4 border-t border-dashed border-slate-400" />

            <div className="text-sm">
              <p className="font-bold">{nomeMesa}</p>
              {comanda.cliente && <p>Cliente: {comanda.cliente}</p>}
              <p>Abertura: {formatarDataHora(comanda.aberta_em)}</p>
            </div>

            <div className="my-4 border-t border-dashed border-slate-400" />

            <div className="space-y-3 text-sm">
              {itens.map((item) => {
                const valor =
                  item.subtotal ??
                  Number(item.quantidade ?? 0) *
                    Number(item.preco_unitario ?? 0)

                return (
                  <div key={item.id}>
                    <div className="flex justify-between gap-4">
                      <span>
                        {item.quantidade}x {item.produtos?.nome ?? "Produto"}
                      </span>
                      <strong>{formatarMoeda(valor)}</strong>
                    </div>
                    {item.observacao && (
                      <p className="ml-4 mt-1 text-xs text-slate-500">
                        {item.observacao}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {carregandoAjustes ? (
              <p className="mt-4 text-sm text-slate-500">
                Carregando ajustes...
              </p>
            ) : ajustes.length > 0 ? (
              <>
                <div className="my-4 border-t border-dashed border-slate-400" />
                <div className="space-y-2 text-sm">
                  {ajustes.map((ajuste) => (
                    <div key={ajuste.id} className="flex justify-between gap-4">
                      <span>{ajuste.descricao}</span>
                      <strong>
                        {ajuste.tipo === "desconto" ? "-" : "+"}{" "}
                        {formatarMoeda(ajuste.valor)}
                      </strong>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {erroAjustes && (
              <p className="mt-4 text-sm font-semibold text-red-700">
                {erroAjustes}
              </p>
            )}

            <div className="my-4 border-t border-dashed border-slate-400" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Consumo</span>
                <strong>{formatarMoeda(subtotal)}</strong>
              </div>
              {totalAcrescimos > 0 && (
                <div className="flex justify-between">
                  <span>Acréscimos</span>
                  <strong>+ {formatarMoeda(totalAcrescimos)}</strong>
                </div>
              )}
              {totalDescontos > 0 && (
                <div className="flex justify-between">
                  <span>Descontos</span>
                  <strong>- {formatarMoeda(totalDescontos)}</strong>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-400 pt-3 text-xl">
                <span className="font-bold">Total</span>
                <strong>{formatarMoeda(totalFinal)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950/50 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={imprimirPreConta}
            disabled={carregandoAjustes}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            <Printer size={18} />
            Imprimir pré-conta
          </button>
        </div>
      </div>
    </div>
  )
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function ModalTrocarResponsavel({
  nomeMesa,
  responsavelAtual,
  usuarios,
  novoResponsavelId,
  trocando,
  erro,
  aoSelecionar,
  aoConfirmar,
  aoFechar,
}) {
  const usuariosOrdenados = [...usuarios].sort((a, b) =>
    (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR")
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">Trocar responsável</h3>
            <p className="mt-1 text-sm text-slate-400">{nomeMesa}</p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={trocando}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={aoConfirmar} className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Responsável atual</p>
            <p className="mt-1 font-semibold text-white">{responsavelAtual}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Novo responsável *
            </label>
            <select
              value={novoResponsavelId}
              onChange={(evento) => aoSelecionar(evento.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
            >
              <option value="">Selecione um usuário</option>
              {usuariosOrdenados.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}{usuario.perfil ? ` — ${formatarPerfil(usuario.perfil)}` : ""}
                </option>
              ))}
            </select>
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
              disabled={trocando}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={trocando || !novoResponsavelId}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
            >
              {trocando ? <RefreshCw size={17} className="animate-spin" /> : <UserCog size={17} />}
              {trocando ? "Alterando..." : "Confirmar troca"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalTransferirComanda({
  comanda,
  nomeMesaOrigem,
  mesasLivres,
  mesaDestinoId,
  transferindo,
  erro,
  aoSelecionarMesa,
  aoConfirmar,
  aoFechar,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={21} className="text-sky-300" />
              <h3 className="text-xl font-bold text-white">
                Transferir comanda
              </h3>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Mova todos os pedidos de {nomeMesaOrigem} para uma mesa livre.
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            disabled={transferindo}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={aoConfirmar} className="space-y-5 p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Origem
              </p>
              <p className="mt-1 font-bold text-orange-300">
                {nomeMesaOrigem}
              </p>
            </div>

            <ArrowRightLeft size={22} className="text-slate-500" />

            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Destino
              </p>
              <p className="mt-1 font-bold text-sky-300">
                {mesasLivres.find((mesa) => mesa.id === mesaDestinoId)
                  ? `Mesa ${
                      mesasLivres.find((mesa) => mesa.id === mesaDestinoId)
                        .numero
                    }`
                  : "Selecione"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Mesa de destino *
            </label>

            <select
              value={mesaDestinoId}
              onChange={(evento) => aoSelecionarMesa(evento.target.value)}
              required
              disabled={transferindo || mesasLivres.length === 0}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500 disabled:opacity-50"
            >
              <option value="">Selecione uma mesa livre</option>

              {mesasLivres.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  Mesa {mesa.numero}
                  {mesa.nome ? ` — ${mesa.nome}` : ""}
                </option>
              ))}
            </select>
          </div>

          {mesasLivres.length === 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Não existe outra mesa livre e ativa para receber esta comanda.
            </div>
          )}

          {erro && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {erro}
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
            Os produtos, valores, cliente e horário de abertura permanecerão na
            mesma comanda. Apenas a mesa será alterada.
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoFechar}
              disabled={transferindo}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={transferindo || !mesaDestinoId || mesasLivres.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {transferindo ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRightLeft size={18} />
                  Confirmar transferência
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalJuntarMesas({
  nomeMesaPrincipal,
  comandasDisponiveis,
  comandaSecundariaId,
  nomeDaMesa,
  obterTotal,
  juntando,
  erro,
  aoSelecionar,
  aoConfirmar,
  aoFechar,
}) {
  const selecionada = comandasDisponiveis.find(
    (item) => item.id === comandaSecundariaId
  )

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Users size={21} className="text-violet-300" />
              <h3 className="text-xl font-bold text-white">Juntar mesas</h3>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {nomeMesaPrincipal} continuará como mesa principal.
            </p>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            disabled={juntando}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={aoConfirmar} className="space-y-5 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Mesa que será adicionada ao grupo *
            </label>
            <select
              value={comandaSecundariaId}
              onChange={(evento) => aoSelecionar(evento.target.value)}
              required
              disabled={juntando || comandasDisponiveis.length === 0}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-500 disabled:opacity-50"
            >
              <option value="">Selecione uma mesa ocupada</option>
              {comandasDisponiveis.map((comanda) => (
                <option key={comanda.id} value={comanda.id}>
                  {nomeDaMesa(comanda.mesa_id)} — {formatarMoeda(obterTotal(comanda))}
                </option>
              ))}
            </select>
          </div>

          {selecionada && (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
              <p className="text-xs font-semibold uppercase text-violet-300">
                Resultado da união
              </p>
              <p className="mt-2 font-bold text-white">
                {nomeMesaPrincipal} + {nomeDaMesa(selecionada.mesa_id)}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Os pedidos da mesa selecionada serão movidos para a comanda principal.
              </p>
            </div>
          )}

          {comandasDisponiveis.length === 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Não existe outra mesa ocupada disponível para realizar a junção.
            </div>
          )}

          {erro && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {erro}
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
            A segunda comanda será encerrada como unificada. Seus produtos e ajustes passarão para a mesa principal. Ao fechar a conta principal, todas as mesas do grupo serão liberadas.
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoFechar}
              disabled={juntando}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={juntando || !comandaSecundariaId || comandasDisponiveis.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {juntando ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Juntando...
                </>
              ) : (
                <>
                  <Users size={18} />
                  Confirmar união
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatarDataHoraInput(data) {
  const pad = (valor) => String(valor).padStart(2, "0")
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`
}

function formatarPerfil(perfil) {
  const nomes = {
    admin: "Administrador",
    gerente: "Gerente",
    garcom: "Garçom",
    "garçom": "Garçom",
  }
  return nomes[String(perfil ?? "").toLowerCase()] ?? perfil
}

function calcularTempoAberta(dataAbertura, agora) {
  if (!dataAbertura) {
    return {
      texto: "—",
      minutosTotais: 0,
    }
  }

  const inicio = new Date(dataAbertura).getTime()
  const diferenca = Math.max(agora - inicio, 0)
  const minutosTotais = Math.floor(diferenca / 60000)

  const horas = Math.floor(minutosTotais / 60)
  const minutos = minutosTotais % 60

  if (horas === 0) {
    return {
      texto: `${minutos}min`,
      minutosTotais,
    }
  }

  return {
    texto: `${horas}h ${String(minutos).padStart(2, "0")}min`,
    minutosTotais,
  }
}

function formatarDataHora(valor) {
  if (!valor) return "Não informado"

  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}