import { supabase } from './supabase';

/**
 * Join manual em memória — evita select aninhado do supabase-js (não
 * depende de nomes exatos de foreign key constraint) e evita N+1 (uma
 * query por tabela referenciada, não por linha). Usado por toda a
 * camada de dados do mobile (Produção, Ordens de Corte, Cadastros,
 * Relatórios) que precisa resolver nomes a partir de ids.
 */
export async function mapaPorId(
  tabela: string,
  campos: string,
  ids: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const unicos = Array.from(new Set(ids));
  if (unicos.length === 0) return new Map();
  const { data, error } = await supabase.from(tabela).select(campos).in('id', unicos);
  if (error) throw error;
  return new Map((data ?? []).map((row: any) => [row.id, row]));
}
