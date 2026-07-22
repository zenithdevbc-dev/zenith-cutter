/**
 * Gera um UUID v4. Hermes (motor JS do React Native) não implementa
 * `crypto.randomUUID()` (Web Crypto) como o Chromium do Electron —
 * mesma razão pela qual o PIN usa `js-sha256` em vez de
 * `crypto.subtle` (ver src/lib/pin.ts). Toda tabela do Supabase usada
 * pelo módulo de Produção tem `id uuid primary key` sem default (o
 * app sempre gera o id, mesmo padrão do desktop via
 * `crypto.randomUUID()`) — sem isso, o insert falha com "null value
 * in column id".
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
