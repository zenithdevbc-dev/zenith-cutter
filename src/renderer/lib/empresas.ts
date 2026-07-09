import { supabase } from "./supabase";
import type { Empresa, Usuario } from "@shared/models";

export interface CreateEmpresaInput {
  nome_empresa: string;
  admin_nome: string;
  admin_email: string;
  admin_login: string;
  admin_senha: string;
  provisioning_secret: string;
}

/**
 * Provisiona uma empresa-cliente nova + seu primeiro administrador.
 * Uso interno Zenith DEV — não existe sessão autenticada nesse momento,
 * então a autorização é o segredo compartilhado (x-provisioning-secret),
 * nunca um papel de usuário. Ver supabase/functions/create-empresa.
 */
export async function createEmpresa(
  input: CreateEmpresaInput,
): Promise<{ empresa: Empresa; usuario: Usuario }> {
  if (!supabase) {
    throw new Error("Supabase não está configurado neste ambiente.");
  }

  const { provisioning_secret, ...body } = input;

  const { data, error } = await supabase.functions.invoke<{
    empresa: Empresa;
    usuario: Usuario;
  }>("create-empresa", {
    body,
    headers: { "x-provisioning-secret": provisioning_secret },
  });

  if (error || !data?.empresa || !data?.usuario) {
    throw new Error(error?.message ?? "Falha ao provisionar empresa.");
  }

  return data;
}
