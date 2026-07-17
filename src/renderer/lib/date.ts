/**
 * Formata uma data ISO (YYYY-MM-DD, sem horário) para DD/MM/AAAA via
 * manipulação de string — nunca via `new Date(iso)`, que interpreta a
 * string como UTC meia-noite e pode exibir o dia anterior dependendo
 * do fuso horário do usuário.
 */
export function formatDataISO(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}
