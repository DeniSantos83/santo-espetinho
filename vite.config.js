import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => {
  if (mode === "homologacao") {
    // Em homologação, nunca permita que uma variável herdada do .env
    // aponte acidentalmente para o Supabase de produção.
    const env = loadEnv(mode, process.cwd(), "VITE_")
    let url
    try {
      url = new URL(env.VITE_SUPABASE_URL)
    } catch {
      throw new Error("Homologação: configure VITE_SUPABASE_URL no .env.homologacao.local")
    }
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "54321") {
      throw new Error("Homologação bloqueada: o Supabase deve estar em http://127.0.0.1:54321")
    }
    if (!env.VITE_SUPABASE_ANON_KEY) {
      throw new Error("Homologação: configure VITE_SUPABASE_ANON_KEY no .env.homologacao.local")
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    base: "/santo-espetinho/",
  }
})
