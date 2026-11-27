// O Chrome verifica a instalação antes do login. Guardamos o evento para a área do garçom.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault()
  window.__espetariaInstallPrompt = event
  window.dispatchEvent(new Event("espetaria-install-ready"))
})

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}garcom-sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch((erro) => console.error("Falha no registro do PWA:", erro))
  })
}

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import "./index.css"
import App from "./App.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
