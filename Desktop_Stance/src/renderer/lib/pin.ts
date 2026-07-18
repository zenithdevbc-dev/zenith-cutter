/**
 * PIN de confirmação para ações operacionais (criar/editar/cancelar/
 * duplicar Ordem de Corte) — reusa a própria senha de login "pra
 * facilitar" (pedido do usuário), mas nunca é enviado à rede: fica só
 * um hash SHA-256 em memória, capturado no login e limpo no logout.
 * Verificação 100% local — funciona offline, igual o resto de Ordens
 * de Corte (CLAUDE.md 3.2).
 */
let sessionPinHash: string | null = null;

// Limite de tentativas (achado de auditoria: verifyPin não tinha
// nenhum, permitindo adivinhação ilimitada por quem tiver acesso
// físico a uma sessão desbloqueada). Reseta a cada login/logout junto
// com o próprio hash.
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 30_000;
let tentativasFalhas = 0;
let bloqueadoAte = 0;

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setSessionPin(senha: string): Promise<void> {
  sessionPinHash = await sha256(senha);
  tentativasFalhas = 0;
  bloqueadoAte = 0;
}

export function clearSessionPin(): void {
  sessionPinHash = null;
  tentativasFalhas = 0;
  bloqueadoAte = 0;
}

export function pinBloqueadoRestanteMs(): number {
  return Math.max(0, bloqueadoAte - Date.now());
}

export async function verifyPin(candidato: string): Promise<boolean> {
  if (!sessionPinHash) return false;
  if (Date.now() < bloqueadoAte) return false;

  const ok = (await sha256(candidato)) === sessionPinHash;
  if (ok) {
    tentativasFalhas = 0;
    bloqueadoAte = 0;
  } else {
    tentativasFalhas += 1;
    if (tentativasFalhas >= MAX_TENTATIVAS) {
      bloqueadoAte = Date.now() + BLOQUEIO_MS;
      tentativasFalhas = 0;
    }
  }
  return ok;
}
