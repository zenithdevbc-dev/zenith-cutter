import { sha256 } from 'js-sha256';

/**
 * PIN de confirmação para ações operacionais (iniciar/pausar/retomar/
 * avançar etapa) — reusa a própria senha de login, mesmo padrão do
 * Desktop_Stance (`src/renderer/lib/pin.ts`). Nunca enviado à rede: só
 * um hash SHA-256 em memória, capturado no login e limpo no logout.
 * RN não tem `crypto.subtle` (Web Crypto) — usa `js-sha256` (puro JS,
 * sem módulo nativo) em vez do polyfill que o desktop usa.
 */
let sessionPinHash: string | null = null;

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 30_000;
let tentativasFalhas = 0;
let bloqueadoAte = 0;

export function setSessionPin(senha: string): void {
  sessionPinHash = sha256(senha);
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

export function verifyPin(candidato: string): boolean {
  if (!sessionPinHash) return false;
  if (Date.now() < bloqueadoAte) return false;

  const ok = sha256(candidato) === sessionPinHash;
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
