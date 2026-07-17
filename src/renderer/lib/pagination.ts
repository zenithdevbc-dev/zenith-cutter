export function paginar<T>(linhas: T[], pagina: number, porPagina: number): T[] {
  const inicio = (pagina - 1) * porPagina;
  return linhas.slice(inicio, inicio + porPagina);
}

export function totalPaginas(totalLinhas: number, porPagina: number): number {
  return Math.max(1, Math.ceil(totalLinhas / porPagina));
}
