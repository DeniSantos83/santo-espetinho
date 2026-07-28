import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function responder(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return responder({ erro: "Método não permitido." }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return responder(
      { erro: "As variáveis de ambiente da função não estão configuradas." },
      500
    )
  }

  const authorization = req.headers.get("Authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return responder({ erro: "Sessão não informada." }, 401)
  }

  const token = authorization.replace("Bearer ", "").trim()

  const clienteSessao = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const {
    data: { user: usuarioAutenticado },
    error: erroSessao,
  } = await clienteSessao.auth.getUser(token)

  if (erroSessao || !usuarioAutenticado) {
    return responder({ erro: "Sessão inválida ou expirada." }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: cadastroAdmin, error: erroCadastroAdmin } = await admin
    .from("usuarios")
    .select("id, perfil, ativo")
    .eq("auth_id", usuarioAutenticado.id)
    .maybeSingle()

  if (
    erroCadastroAdmin ||
    !cadastroAdmin ||
    cadastroAdmin.perfil !== "admin" ||
    cadastroAdmin.ativo !== true
  ) {
    return responder(
      { erro: "Somente um administrador ativo pode cadastrar usuários." },
      403
    )
  }

  let corpo: {
    nome?: string
    email?: string
    telefone?: string | null
    senha?: string
    perfil?: string
    ativo?: boolean
  }

  try {
    corpo = await req.json()
  } catch {
    return responder({ erro: "Dados enviados em formato inválido." }, 400)
  }

  const nome = corpo.nome?.trim()
  const email = corpo.email?.trim().toLowerCase()
  const telefone = corpo.telefone?.trim() || null
  const senha = corpo.senha ?? ""
  const perfil = corpo.perfil
  const ativo = corpo.ativo !== false

  if (!nome) {
    return responder({ erro: "Informe o nome do usuário." }, 400)
  }

  if (!email) {
    return responder({ erro: "Informe o e-mail do usuário." }, 400)
  }

  if (senha.length < 6) {
    return responder(
      { erro: "A senha inicial deve possuir pelo menos 6 caracteres." },
      400
    )
  }

  if (!["garcom", "gerente"].includes(perfil ?? "")) {
    return responder(
      { erro: "O perfil deve ser garçom ou gerente." },
      400
    )
  }

  const { data: usuarioExistente } = await admin
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (usuarioExistente) {
    return responder({ erro: "Já existe um usuário com esse e-mail." }, 409)
  }

  const { data: authCriado, error: erroAuth } =
    await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        perfil,
      },
    })

  if (erroAuth || !authCriado.user) {
    const mensagem =
      erroAuth?.message?.toLowerCase().includes("already")
        ? "Este e-mail já está cadastrado no acesso do sistema."
        : erroAuth?.message || "Não foi possível criar a conta de acesso."

    return responder({ erro: mensagem }, 400)
  }

  const { data: usuarioCriado, error: erroBanco } = await admin
    .from("usuarios")
    .insert({
      auth_id: authCriado.user.id,
      nome,
      email,
      telefone,
      perfil,
      ativo,
    })
    .select("id, auth_id, nome, email, telefone, perfil, ativo, criado_em")
    .single()

  if (erroBanco) {
    await admin.auth.admin.deleteUser(authCriado.user.id)

    return responder(
      {
        erro:
          erroBanco.message ||
          "A conta de acesso foi criada, mas não foi possível gravar o usuário.",
      },
      400
    )
  }

  return responder(
    {
      sucesso: true,
      usuario: usuarioCriado,
    },
    201
  )
})