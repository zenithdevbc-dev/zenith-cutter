import { useSyncExternalStore } from "react";
import { runSync, type SyncResult } from "./sync";
import type { SyncLogTrigger } from "@shared/ipc";

export interface SyncManagerState {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  errorCount: number;
  lastSyncAt: string | null;
  lastResult: SyncResult | null;
  backoffMs: number;
}

const BASE_INTERVAL_MS = 30_000;
const MAX_INTERVAL_MS = 5 * 60_000;

let state: SyncManagerState = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  pendingCount: 0,
  errorCount: 0,
  lastSyncAt: null,
  lastResult: null,
  backoffMs: BASE_INTERVAL_MS,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<SyncManagerState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

async function refreshCounts() {
  const [status, errors] = await Promise.all([
    window.zenith.sync.getStatus(),
    window.zenith.sync.listErrors(),
  ]);
  setState({ pendingCount: status.pendingCount, errorCount: errors.length });
}

function scheduleNext() {
  clearTimer();
  if (!started) return;
  timer = setTimeout(() => {
    void syncNow("auto");
  }, state.backoffMs);
}

async function syncNow(trigger: SyncLogTrigger): Promise<SyncResult | null> {
  if (state.syncing) return null;
  if (!state.online) {
    await refreshCounts();
    scheduleNext();
    return null;
  }

  setState({ syncing: true });
  let result: SyncResult;
  try {
    result = await runSync();
  } catch {
    result = { attempted: 0, synced: 0, failed: 0 };
  }

  // Falha total num lote não-vazio é o sinal de que o problema é de
  // conectividade (Supabase inalcançável), não de dado — nesse caso o
  // loop automático recua (backoff), pra não martelar a rede. Qualquer
  // sucesso (parcial ou total) reseta pro intervalo base.
  const isConnectivityFailure = result.attempted > 0 && result.synced === 0 && result.failed === result.attempted;
  const nextBackoff = isConnectivityFailure
    ? Math.min(state.backoffMs * 2, MAX_INTERVAL_MS)
    : BASE_INTERVAL_MS;

  await window.zenith.sync.logRecord({
    trigger,
    attempted: result.attempted,
    synced: result.synced,
    failed: result.failed,
  });

  setState({
    syncing: false,
    lastSyncAt: new Date().toISOString(),
    lastResult: result,
    backoffMs: nextBackoff,
  });
  await refreshCounts();
  scheduleNext();
  return result;
}

function handleOnline() {
  setState({ online: true, backoffMs: BASE_INTERVAL_MS });
  void syncNow("reconexao");
}

function handleOffline() {
  setState({ online: false });
  clearTimer();
}

function start() {
  if (started) return;
  started = true;
  setState({ online: navigator.onLine, backoffMs: BASE_INTERVAL_MS });
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  void syncNow("login");
}

function stop() {
  started = false;
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
  clearTimer();
  setState({
    syncing: false,
    pendingCount: 0,
    errorCount: 0,
    lastSyncAt: null,
    lastResult: null,
    backoffMs: BASE_INTERVAL_MS,
  });
}

async function retryError(id: number) {
  await window.zenith.sync.resetError(id);
  await syncNow("manual");
}

async function retryAllErrors() {
  const errors = await window.zenith.sync.listErrors();
  await Promise.all(errors.map((item) => window.zenith.sync.resetError(item.id)));
  await syncNow("manual");
}

export const syncManager = {
  start,
  stop,
  syncNow,
  retryError,
  retryAllErrors,
};

export function useSyncStatus(): SyncManagerState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
