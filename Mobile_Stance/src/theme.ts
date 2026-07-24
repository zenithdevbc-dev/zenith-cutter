/**
 * Paleta de marca — espelha as CSS custom properties de
 * `Desktop_Stance/src/renderer/index.css` (light theme), pra dar ao
 * app mobile a mesma identidade visual do desktop em vez do azul/preto
 * genérico do template React Native.
 */
export const colors = {
  background: '#FAFAF8',
  foreground: '#1A1A1F',
  card: '#FFFFFF',
  cardForeground: '#1A1A1F',
  primary: '#A30620',
  primaryHover: '#8E051B',
  primaryActive: '#760418',
  primaryForeground: '#FFFFFF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  muted: '#6B7280',
  statusProduction: '#2563EB',
  statusCompleted: '#16A34A',
  statusPending: '#F59E0B',
  statusDelayed: '#DC2626',
  statusPaused: '#6B7280',
} as const;
