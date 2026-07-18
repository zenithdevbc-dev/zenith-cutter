// Edge Function: create-empresa
// Provisiona uma empresa-cliente nova + seu primeiro administrador.
// Só existe pra uso do time Zenith DEV ao fechar um cliente novo — não é
// uma tela de signup público do app. Como não existe nenhum admin ainda
// nesse momento (é o primeiro usuário da empresa), não dá pra exigir
// "chamador autenticado e admin" como em create-usuario; em vez disso,
// exige um segredo compartilhado (EMPRESA_PROVISIONING_SECRET), que só
// o time Zenith DEV conhece.
//
// Deploy: supabase functions deploy create-empresa
// Configurar o segredo: supabase secrets set EMPRESA_PROVISIONING_SECRET=<valor>
// Chamada: POST com header "x-provisioning-secret: <valor>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-provisioning-secret",
};

interface CreateEmpresaBody {
  nome_empresa: string;
  admin_nome: string;
  admin_email: string;
  admin_senha: string;
  admin_login: string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Comparação em tempo constante (achado de auditoria: "!==" normal
// vaza timing proporcional a quantos caracteres iniciais batem,
// permitindo em teoria descobrir o segredo byte a byte). XOR
// acumulado nunca retorna cedo por causa de um byte específico.
function segredoConfere(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

// Código da empresa (pedido do usuário): formato AA00 — 2 letras
// maiúsculas + 2 dígitos, atribuído automaticamente aqui na criação.
// Funciona como segunda credencial no login (resolve_login_email),
// pra não dar pra logar na empresa errada por acidente.
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function gerarCodigoEmpresa(): string {
  const l1 = LETRAS[Math.floor(Math.random() * LETRAS.length)];
  const l2 = LETRAS[Math.floor(Math.random() * LETRAS.length)];
  const n1 = Math.floor(Math.random() * 10);
  const n2 = Math.floor(Math.random() * 10);
  return `${l1}${l2}${n1}${n2}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("EMPRESA_PROVISIONING_SECRET");
    const providedSecret = req.headers.get("x-provisioning-secret");
    if (!expectedSecret || !providedSecret || !segredoConfere(providedSecret, expectedSecret)) {
      return json({ error: "Não autorizado." }, 403);
    }

    const body: CreateEmpresaBody = await req.json();
    if (
      !body.nome_empresa?.trim() ||
      !body.admin_nome?.trim() ||
      !body.admin_email?.trim() ||
      !body.admin_login?.trim() ||
      !body.admin_senha ||
      body.admin_senha.length < 8
    ) {
      return json(
        {
          error:
            "Dados inválidos: nome_empresa, admin_nome, admin_email, admin_login e admin_senha (mínimo 8 caracteres) são obrigatórios.",
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Colisão de código (67.600 combinações possíveis, AA00-ZZ99) é
    // improvável, mas trata mesmo assim: tenta de novo com um código
    // novo em vez de falhar a criação da empresa por causa disso.
    let empresa = null;
    let empresaError = null;
    for (let tentativa = 0; tentativa < 5 && !empresa; tentativa++) {
      const resultado = await adminClient
        .from("empresas")
        .insert({ nome: body.nome_empresa.trim(), codigo: gerarCodigoEmpresa() })
        .select()
        .single();
      if (resultado.error) {
        empresaError = resultado.error;
        if (!resultado.error.message.includes("empresas_codigo_key")) break;
        continue;
      }
      empresa = resultado.data;
    }

    if (empresaError || !empresa) {
      return json({ error: empresaError?.message ?? "Falha ao criar empresa." }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.admin_email.trim(),
      password: body.admin_senha,
      email_confirm: true,
      user_metadata: {
        nome: body.admin_nome.trim(),
        empresa_id: empresa.id,
        login: body.admin_login.trim(),
      },
    });

    if (createError || !created.user) {
      // Reverte a empresa criada pra não deixar lixo órfão sem admin.
      await adminClient.from("empresas").delete().eq("id", empresa.id);
      return json({ error: createError?.message ?? "Falha ao criar administrador." }, 400);
    }

    // Primeiro usuário da empresa é sempre administrador.
    await adminClient
      .from("usuarios")
      .update({ papel: "administrador" })
      .eq("id", created.user.id);

    const { data: usuario } = await adminClient
      .from("usuarios")
      .select("id, empresa_id, nome, email, papel, ativo, criado_em, atualizado_em")
      .eq("id", created.user.id)
      .single();

    return json({ empresa, usuario }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
