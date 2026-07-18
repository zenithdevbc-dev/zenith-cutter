import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Pode ser `null` quando o projeto Supabase ainda não foi configurado
 * (.env ausente). O app deve continuar funcionando offline mesmo assim —
 * nunca depender deste client no caminho crítico de produção.
 */
// persistSession: false — login não sobrevive ao fechamento da janela;
// cada abertura do app exige novo login (nunca fica sessão salva em disco).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;
