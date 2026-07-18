import { supabase } from "./supabase";
import type { Usuario, UsuarioUpdatePatch } from "@shared/models";

export interface CreateUsuarioInput {
  nome: string;
  email: string;
  login: string;
  senha: string;
  papel?: Usuario["papel"];
}

/**
 * Busca o roster no Supabase (fonte da verdade) e atualiza o cache local
 * de passagem. Se não houver rede/config, cai para o último cache local
 * conhecido — a lista continua utilizável offline, só que desatualizada.
 */
export async function listUsuarios(): Promise<Usuario[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("nome", { ascending: true });

    if (!error && data) {
      const usuarios = data as Usuario[];
      await window.zenith.usuarios.cache(usuarios);
      return usuarios;
    }
  }

  return window.zenith.usuarios.listLocal();
}

/**
 * Cria a conta de login + perfil via Edge Function (service_role fica só
 * no servidor). Só funciona online — criar um usuário novo não é uma
 * operação que faça sentido enfileirar para depois.
 */
export async function createUsuario(input: CreateUsuarioInput): Promise<Usuario> {
  if (!supabase) {
    throw new Error("Supabase não está configurado neste ambiente.");
  }

  const { data, error } = await supabase.functions.invoke<{ usuario: Usuario }>(
    "create-usuario",
    { body: input },
  );

  if (error || !data?.usuario) {
    throw new Error(error?.message ?? "Falha ao criar usuário.");
  }

  await window.zenith.usuarios.cache([data.usuario]);
  return data.usuario;
}

/**
 * Atualiza nome/papel/ativo. Tenta direto no Supabase (comum, online);
 * se falhar por falta de conexão, grava local e enfileira para sync
 * (o motor de envio de fato é o Sprint 6) — a edição nunca se perde.
 */
export async function updateUsuario(
  id: string,
  patch: UsuarioUpdatePatch,
): Promise<Usuario> {
  if (supabase) {
    const { data, error } = await supabase
      .from("usuarios")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      const usuario = data as Usuario;
      await window.zenith.usuarios.cache([usuario]);
      return usuario;
    }
  }

  return window.zenith.usuarios.updateLocal(id, patch);
}
