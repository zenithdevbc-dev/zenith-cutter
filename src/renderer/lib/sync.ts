import { supabase } from "./supabase";
import type { PendingSyncItem } from "@shared/ipc";

export interface SyncResult {
  attempted: number;
  synced: number;
  failed: number;
}

// ordens_corte carrega "itens" no payload de update (pra saber que a
// grade da ordem mudou), mas itens não é coluna da tabela — os itens em
// si já viajam como entradas próprias (insert/delete) em
// ordem_corte_itens. Sem isso, o Postgrest rejeita o update inteiro.
const EXTRA_PAYLOAD_FIELDS: Partial<Record<string, string[]>> = {
  ordens_corte: ["itens"],
};

function sanitizePayload(tableName: string, payload: unknown): Record<string, unknown> {
  const clean = { ...(payload as Record<string, unknown>) };
  for (const field of EXTRA_PAYLOAD_FIELDS[tableName] ?? []) {
    delete clean[field];
  }
  return clean;
}

async function pushItem(item: PendingSyncItem): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase não configurado." };

  const payload = sanitizePayload(item.tableName, item.payload);

  if (item.operation === "insert") {
    const { error } = await supabase.from(item.tableName).upsert(payload, { onConflict: "id" });
    return { error: error?.message ?? null };
  }

  if (item.operation === "update") {
    const { error } = await supabase.from(item.tableName).update(payload).eq("id", item.recordId);
    return { error: error?.message ?? null };
  }

  // delete
  const { error } = await supabase.from(item.tableName).delete().eq("id", item.recordId);
  return { error: error?.message ?? null };
}

/**
 * Processa a fila de sincronização pendente, uma vez, em ordem
 * cronológica (garante que dependências como cliente/produto/tecido
 * cheguem no Supabase antes da ordem de corte que os referencia).
 * Cada item é isolado: uma falha não trava os demais. Chamada manual
 * (botão) ou automática (logo após o login) — não há retry em segundo
 * plano/detecção de rede ainda (isso é o restante do Sprint 6).
 */
export async function runSync(): Promise<SyncResult> {
  const result: SyncResult = { attempted: 0, synced: 0, failed: 0 };
  if (!supabase) return result;

  const pending = await window.zenith.sync.listPending();
  for (const item of pending) {
    result.attempted += 1;
    try {
      const { error } = await pushItem(item);
      if (error) {
        await window.zenith.sync.markError(item.id, error);
        result.failed += 1;
      } else {
        await window.zenith.sync.markSuccess(item.id);
        result.synced += 1;
      }
    } catch (err) {
      await window.zenith.sync.markError(
        item.id,
        err instanceof Error ? err.message : "Erro desconhecido.",
      );
      result.failed += 1;
    }
  }
  return result;
}
