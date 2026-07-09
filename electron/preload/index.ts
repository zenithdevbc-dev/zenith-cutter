import { contextBridge, ipcRenderer } from "electron";
import {
  IPC_CHANNELS,
  type DbStatus,
  type SyncStatus,
  type PendingSyncItem,
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
  Empresa,
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
  sync: {
    getStatus: (): Promise<SyncStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncGetStatus),
    listPending: (): Promise<PendingSyncItem[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncListPending),
    markSuccess: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncMarkSuccess, id),
    markError: (id: number, message: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncMarkError, id, message),
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
    createLocal: (input: OrdemCorteInput): Promise<OrdemCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteCreateLocal, input),
    updateLocal: (id: string, patch: OrdemCorteUpdatePatch): Promise<OrdemCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteUpdateLocal, id, patch),
    duplicateLocal: (id: string): Promise<OrdemCorte> =>
      ipcRenderer.invoke(IPC_CHANNELS.ordensCorteDuplicateLocal, id),
  },
  empresas: {
    cache: (empresa: Empresa): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.empresasCache, empresa),
    getLocal: (id: string): Promise<Empresa | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.empresasGetLocal, id),
  },
});
