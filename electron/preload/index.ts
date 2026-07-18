import { contextBridge, ipcRenderer } from "electron";
import {
  IPC_CHANNELS,
  type DbStatus,
  type SyncStatus,
  type PendingSyncItem,
  type SyncLogEntry,
  type SyncLogRecordInput,
  type LogReportErrorInput,
} from "../../src/shared/ipc";
import type {
  Usuario,
  UsuarioUpdatePatch,
  Cliente,
  ClienteInput,
  ClienteUpdatePatch,
  Produto,
  ProdutoInput,
  ProdutoUpdatePatch,
  Tecido,
  TecidoInput,
  TecidoUpdatePatch,
  MesaCorte,
  MesaCorteInput,
  MesaCorteUpdatePatch,
  ProdutoTamanho,
  ProdutoTamanhoInput,
  ProdutoTamanhoUpdatePatch,
  OrdemCorte,
  OrdemCorteResumo,
  OrdemCorteItem,
  OrdemCorteInput,
  OrdemCorteUpdatePatch,
  OrdemCorteHistoricoEntry,
  Empresa,
  MesaCorteComStatus,
  SessaoProducao,
  SessaoProducaoResumo,
  IniciarProducaoInput,
  ProducaoPerda,
  ProducaoPerdaInput,
  ProducaoObservacao,
  ProducaoObservacaoInput,
  RelatorioProducaoLinha,
  RelatorioPerdaLinha,
} from "../../src/shared/models";

contextBridge.exposeInMainWorld("zenith", {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  db: {
    getStatus: (): Promise<DbStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.dbGetStatus),
  },
  log: {
    reportError: (entry: LogReportErrorInput): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.logReportError, entry),
  },
  backup: {
    run: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.backupRun),
  },
  sync: {
    getStatus: (): Promise<SyncStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncGetStatus),
    listPending: (): Promise<PendingSyncItem[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncListPending),
    markSuccess: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncMarkSuccess, id),
    markError: (id: number, message: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncMarkError, id, message),
    listErrors: (): Promise<PendingSyncItem[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncListErrors),
    resetError: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncResetError, id),
    logRecord: (entry: SyncLogRecordInput): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncLogRecord, entry),
    logList: (limit?: number): Promise<SyncLogEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncLogList, limit),
  },
  updater: {
    onUpdateDownloaded: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.updaterUpdateDownloaded, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.updaterUpdateDownloaded, listener);
    },
    quitAndInstall: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.updaterQuitAndInstall),
  },
  usuarios: {
    listLocal: (): Promise<Usuario[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.usuariosListLocal),
    cache: (usuarios: Usuario[]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.usuariosCache, usuarios),
    updateLocal: (id: string, patch: UsuarioUpdatePatch): Promise<Usuario> =>
      ipcRenderer.invoke(IPC_CHANNELS.usuariosUpdateLocal, id, patch),
  },
  clientes: {
    listLocal: (): Promise<Cliente[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesListLocal),
    createLocal: (input: ClienteInput): Promise<Cliente> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesCreateLocal, input),
    updateLocal: (id: string, patch: ClienteUpdatePatch): Promise<Cliente> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesUpdateLocal, id, patch),
  },
  produtos: {
    listLocal: (): Promise<Produto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.produtosListLocal),
    createLocal: (input: ProdutoInput): Promise<Produto> =>
      ipcRenderer.invoke(IPC_CHANNELS.produtosCreateLocal, input),
    updateLocal: (id: string, patch: ProdutoUpdatePatch): Promise<Produto> =>
      ipcRenderer.invoke(IPC_CHANNELS.produtosUpdateLocal, id, patch),
  },
  tecidos: {
    listLocal: (): Promise<Tecido[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.tecidosListLocal),
    createLocal: (input: TecidoInput): Promise<Tecido> =>
      ipcRenderer.invoke(IPC_CHANNELS.tecidosCreateLocal, input),
    updateLocal: (id: string, patch: TecidoUpdatePatch): Promise<Tecido> =>
      ipcRenderer.invoke(IPC_CHANNELS.tecidosUpdateLocal, id, patch),
  },
  mesasCorte: {
    listLocal: (): Promise<MesaCorte[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.mesasCorteListLocal),
    createLocal: (input: MesaCorteInput): Promise<MesaCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.mesasCorteCreateLocal, input),
    updateLocal: (id: string, patch: MesaCorteUpdatePatch): Promise<MesaCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.mesasCorteUpdateLocal, id, patch),
  },
  produtoTamanhos: {
    listLocal: (produtoId: string): Promise<ProdutoTamanho[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.produtoTamanhosListLocal, produtoId),
    createLocal: (input: ProdutoTamanhoInput): Promise<ProdutoTamanho> =>
      ipcRenderer.invoke(IPC_CHANNELS.produtoTamanhosCreateLocal, input),
    updateLocal: (id: string, patch: ProdutoTamanhoUpdatePatch): Promise<ProdutoTamanho> =>
      ipcRenderer.invoke(IPC_CHANNELS.produtoTamanhosUpdateLocal, id, patch),
    reorderLocal: (orderedIds: string[]): Promise<ProdutoTamanho[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.produtoTamanhosReorderLocal, orderedIds),
  },
  ordensCorte: {
    listLocal: (): Promise<OrdemCorteResumo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteListLocal),
    itensListLocal: (ordemId: string): Promise<OrdemCorteItem[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteItensListLocal, ordemId),
    createLocal: (input: OrdemCorteInput, usuarioId: string): Promise<OrdemCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteCreateLocal, input, usuarioId),
    updateLocal: (
      id: string,
      patch: OrdemCorteUpdatePatch,
      usuarioId: string,
    ): Promise<OrdemCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteUpdateLocal, id, patch, usuarioId),
    duplicateLocal: (id: string, usuarioId: string): Promise<OrdemCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteDuplicateLocal, id, usuarioId),
    historicoListLocal: (ordemId: string): Promise<OrdemCorteHistoricoEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteHistoricoListLocal, ordemId),
    nextNumeroLocal: (empresaId: string): Promise<number> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteNextNumeroLocal, empresaId),
    atribuirMesaLocal: (
      ordemId: string,
      mesaAtribuidaId: string | null,
      usuarioId: string,
    ): Promise<OrdemCorteResumo> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ordensCorteAtribuirMesaLocal,
        ordemId,
        mesaAtribuidaId,
        usuarioId,
      ),
  },
  filaProducao: {
    listLocal: (): Promise<OrdemCorteResumo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.filaProducaoListLocal),
    reorderLocal: (orderedIds: string[]): Promise<OrdemCorteResumo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.filaProducaoReorderLocal, orderedIds),
  },
  producao: {
    listMesasLocal: (): Promise<MesaCorteComStatus[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoMesasListLocal),
    iniciarLocal: (input: IniciarProducaoInput, usuarioId: string): Promise<SessaoProducao> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoIniciarLocal, input, usuarioId),
    listSessoesAtivasLocal: (): Promise<SessaoProducaoResumo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoSessoesAtivasListLocal),
    avancarEtapaLocal: (ordemId: string, usuarioId: string): Promise<OrdemCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoAvancarEtapaLocal, ordemId, usuarioId),
    pausarLocal: (ordemId: string, usuarioId: string): Promise<SessaoProducao> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoPausarLocal, ordemId, usuarioId),
    retomarLocal: (ordemId: string, usuarioId: string): Promise<SessaoProducao> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoRetomarLocal, ordemId, usuarioId),
    perdasListLocal: (sessaoId: string): Promise<ProducaoPerda[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoPerdasListLocal, sessaoId),
    perdasListPorOrdemLocal: (ordemId: string): Promise<ProducaoPerda[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoPerdasListPorOrdemLocal, ordemId),
    perdasRegistrarLocal: (
      input: ProducaoPerdaInput,
      usuarioId: string,
    ): Promise<ProducaoPerda> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoPerdasRegistrarLocal, input, usuarioId),
    observacoesListLocal: (sessaoId: string): Promise<ProducaoObservacao[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoObservacoesListLocal, sessaoId),
    observacoesRegistrarLocal: (
      input: ProducaoObservacaoInput,
      usuarioId: string,
    ): Promise<ProducaoObservacao> =>
      ipcRenderer.invoke(IPC_CHANNELS.producaoObservacoesRegistrarLocal, input, usuarioId),
  },
  empresas: {
    cache: (empresa: Empresa): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.empresasCache, empresa),
    getLocal: (id: string): Promise<Empresa | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.empresasGetLocal, id),
  },
  relatorios: {
    producaoListLocal: (): Promise<RelatorioProducaoLinha[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.relatoriosProducaoListLocal),
    perdasListLocal: (): Promise<RelatorioPerdaLinha[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.relatoriosPerdasListLocal),
  },
});
