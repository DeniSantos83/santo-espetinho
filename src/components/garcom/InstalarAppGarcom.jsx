import { useEffect, useState } from "react"
import { Download, WifiOff, X } from "lucide-react"

const IOS = /iPad|iPhone|iPod/i
const EM_APP = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true

export default function InstalarAppGarcom() {
  const [eventoInstalacao, setEventoInstalacao] = useState(null)
  const [instalado, setInstalado] = useState(() => EM_APP())
  const [ios, setIos] = useState(() => IOS.test(navigator.userAgent))
  const [online, setOnline] = useState(() => navigator.onLine)
  const [dispensado, setDispensado] = useState(false)

  useEffect(() => {
    setIos(IOS.test(navigator.userAgent))
    const url = `${import.meta.env.BASE_URL}garcom.webmanifest`
    let manifest = document.querySelector('link[rel="manifest"]')
    if (!manifest) {
      manifest = document.createElement("link")
      manifest.rel = "manifest"
      document.head.appendChild(manifest)
    }
    manifest.href = url

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]')
    if (!appleIcon) {
      appleIcon = document.createElement("link")
      appleIcon.rel = "apple-touch-icon"
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = `${import.meta.env.BASE_URL}icons/garcom-192.png`

    let theme = document.querySelector('meta[name="theme-color"]')
    if (!theme) {
      theme = document.createElement("meta")
      theme.name = "theme-color"
      document.head.appendChild(theme)
    }
    theme.content = "#101827"

    const instalarDisponivel = (event) => {
      event.preventDefault()
      setEventoInstalacao(event)
    }
    const instaladoAgora = () => {
      setInstalado(true)
      setEventoInstalacao(null)
    }
    const conectar = () => setOnline(true)
    const desconectar = () => setOnline(false)
    window.addEventListener("beforeinstallprompt", instalarDisponivel)
    window.addEventListener("appinstalled", instaladoAgora)
    window.addEventListener("online", conectar)
    window.addEventListener("offline", desconectar)

    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}garcom-sw.js`, {
        scope: import.meta.env.BASE_URL,
      }).catch((erro) => console.error("Não foi possível habilitar o app do garçom:", erro))
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", instalarDisponivel)
      window.removeEventListener("appinstalled", instaladoAgora)
      window.removeEventListener("online", conectar)
      window.removeEventListener("offline", desconectar)
    }
  }, [])

  async function solicitarInstalacao() {
    if (!eventoInstalacao) return
    const prompt = eventoInstalacao
    setEventoInstalacao(null)
    await prompt.prompt()
    await prompt.userChoice
  }

  return (
    <>
      {!online && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          <WifiOff className="mt-0.5 shrink-0" size={18} />
          Sem internet. Não lance pedidos: é necessário estar conectado para salvar no Supabase.
        </div>
      )}
      {!instalado && !dispensado && (eventoInstalacao || ios) && (
        <section aria-label="Instalar aplicativo do garçom" className="mb-4 flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-[#172234] p-4">
          <Download className="mt-1 shrink-0 text-orange-400" size={22} />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">App dos garçons</p>
            <p className="mt-1 text-sm text-slate-300">
              {ios
                ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
                : "Instale no celular para abrir as mesas direto pela tela inicial."}
            </p>
            {eventoInstalacao && (
              <button type="button" onClick={solicitarInstalacao}
                className="mt-3 min-h-11 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-500">
                Instalar aplicativo
              </button>
            )}
          </div>
          <button type="button" onClick={() => setDispensado(true)}
            aria-label="Ocultar aviso de instalação" className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={18}/></button>
        </section>
      )}
    </>
  )
}
