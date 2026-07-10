/**
 * PIN de confirmação para ações operacionais (criar/editar/cancelar/
 * duplicar Ordem de Corte) — reusa a própria senha de login "pra
 * facilitar" (pedido do usuário), mas nunca é enviado à rede: fica só
 * um hash SHA-256 em memória, capturado no login e limpo no logout.
 * Verificação 100% local — funciona offline, igual o resto de Ordens
 * de Corte (CLAUDE.md 3.2).
 */
let sessionPinHash: string | null = null;

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setSessionPin(senha: string): Promise<void> {
  sessionPinHash = await sha256(senha);
}

export function clearSessionPin(): void {
  sessionPinHash = null;
}

export async function verifyPin(candidato: string): Promise<boolean> {
  if (!sessionPinHash) return false;
  return (await sha256(candidato)) === sessionPinHash;
}
