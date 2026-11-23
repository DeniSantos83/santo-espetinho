import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.1";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const respond = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
const invalid = () => respond(401, { erro: "Usuário ou senha inválidos." });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return respond(405, { erro: "Método inválido." });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !secret) return respond(500, { erro: "Serviço indisponível." });
  let usuario: string, senha: string;
  try {
    const body = await req.json();
    usuario = String(body.usuario || "").trim().toLowerCase();
    senha = String(body.senha || "");
  } catch { return invalid(); }
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(usuario) || senha.length < 1 || senha.length > 256) return invalid();
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  // Atomic per-account throttle, executed before looking up any account.
  const keyBytes = new TextEncoder().encode("usuario:" + usuario);
  const digest = await crypto.subtle.digest("SHA-256", keyBytes);
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const { data: allowed, error: limiterError } = await admin.rpc("registrar_tentativa_login", {
    p_chave: key, p_limite: 10,
  });
  if (limiterError || allowed !== true) return respond(429, { erro: "Muitas tentativas. Tente novamente em 15 minutos." });
  const { data: perfil, error: lookupError } = await admin.from("usuarios")
    .select("auth_id, email, ativo").eq("login", usuario).maybeSingle();
  if (lookupError || !perfil?.ativo || !perfil.auth_id) return invalid();
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: perfil.email, password: senha,
  });
  if (error || !data.session || data.user?.id !== perfil.auth_id) return invalid();
  return respond(200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
