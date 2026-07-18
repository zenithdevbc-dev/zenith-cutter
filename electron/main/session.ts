// Falha crítica de auditoria: nenhuma leitura do SQLite local filtrava
// por empresa_id — o banco local é um único arquivo por instalação/
// máquina, sem isolamento nenhum entre empresas diferentes que já
// logaram ali. Um usuário da Empresa B logando numa máquina que antes
// rodou pra Empresa A via ver/usar dados de A (clientes, produtos,
// ordens, etc.), porque nada no SQL excluía essas linhas.
//
// Este módulo guarda, só em memória do processo main, a empresa_id do
// usuário autenticado agora — setado pelo renderer logo após resolver
// a sessão (auth-context.tsx), limpo no logout. Toda leitura local nos
// repositórios passa a filtrar por esse valor, então mesmo que o
// SQLite ainda tenha linhas de outra empresa (nunca purgadas), elas
// nunca voltam pra UI.
let currentEmpresaId: string | null = null;

export function setCurrentEmpresaId(empresaId: string): void {
  currentEmpresaId = empresaId;
}

export function clearCurrentEmpresaId(): void {
  currentEmpresaId = null;
}

/**
 * Lança se chamado antes do login resolver a empresa — nenhuma leitura
 * local de dado de negócio deveria acontecer nesse momento (a UI só
 * mostra essas páginas depois de autenticado).
 */
export function getCurrentEmpresaId(): string {
  if (!currentEmpresaId) {
    throw new Error("Nenhuma empresa autenticada nesta sessão local.");
  }
  return currentEmpresaId;
}
