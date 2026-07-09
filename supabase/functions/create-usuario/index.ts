// Edge Function: create-usuario
// Roda no ambiente Deno do Supabase, nunca no app desktop. Só ela pode
// criar contas de login — segura a service_role key, que jamais pode ir
// para o cliente distribuído (daria acesso admin total ao banco).
//
// Deploy: supabase functions deploy create-usuario
// Chamada (renderer): supabase.functions.invoke("create-usuario", { body })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUsuarioBody {
  nome: string;
  email: string;
  login: string;
  senha: string;
  papel?: "operador" | "supervisor" | "administrador";
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client com o token de quem chamou, só pra descobrir a identidade dele.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    // Client admin (service_role) para checar permissão e criar o usuário.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("usuarios")
      .select("papel, ativo, empresa_id")
      .eq("id", callerData.user.id)
      .single();

    if (
      profileError ||
      !callerProfile ||
      callerProfile.papel !== "administrador" ||
      !callerProfile.ativo
    ) {
      return json({ error: "Apenas administradores podem criar usuários." }, 403);
    }

    const body: CreateUsuarioBody = await req.json();
    if (
      !body.nome?.trim() ||
      !body.email?.trim() ||
      !body.login?.trim() ||
      !body.senha ||
      body.senha.length < 8
    ) {
      return json(
        {
          error:
            "Dados inválidos: nome, email, login e senha (mínimo 8 caracteres) são obrigatórios.",
        },
        400,
      );
    }

    // Novo usuário sempre herda a empresa de quem o criou — nunca é
    // possível criar um usuário em outra empresa por aqui. Login é a
    // credencial usada para entrar no app (não o e-mail); precisa ser
    // único em todo o sistema (constraint no banco).
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email.trim(),
      password: body.senha,
      email_confirm: true,
      user_metadata: {
        nome: body.nome.trim(),
        empresa_id: callerProfile.empresa_id,
        login: body.login.trim(),
      },
    });

    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Falha ao criar usuário." }, 400);
    }

    // O trigger on_auth_user_created já criou a linha em usuarios com
    // papel padrão 'operador' e a empresa correta; só ajusta o papel se
    // foi pedido 'supervisor' ou 'administrador'.
    const papel =
      body.papel === "administrador" || body.papel === "supervisor" ? body.papel : "operador";
    if (papel !== "operador") {
      await adminClient.from("usuarios").update({ papel }).eq("id", created.user.id);
    }

    const { data: usuario } = await adminClient
      .from("usuarios")
      .select("id, empresa_id, nome, email, login, papel, ativo, criado_em, atualizado_em")
      .eq("id", created.user.id)
      .single();

    return json({ usuario }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
