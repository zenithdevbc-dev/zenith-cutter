import type { DbStatus, SyncStatus, PendingSyncItem } from "@shared/ipc";
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
} from "@shared/models";

declare global {
  interface Window {
    zenith: {
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      db: {
        getStatus: () => Promise<DbStatus>;
      };
      sync: {
        getStatus: () => Promise<SyncStatus>;
        listPending: () => Promise<PendingSyncItem[]>;
        markSuccess: (id: number) => Promise<void>;
        markError: (id: number, message: string) => Promise<void>;
      };
      updater: {
        onUpdateDownloaded: (callback: () => void) => () => void;
        quitAndInstall: () => Promise<void>;
      };
      usuarios: {
        listLocal: () => Promise<Usuario[]>;
        cache: (usuarios: Usuario[]) => Promise<void>;
        updateLocal: (id: string, patch: UsuarioUpdatePatch) => Promise<Usuario>;
      };
      clientes: {
        listLocal: () => Promise<Cliente[]>;
        createLocal: (input: ClienteInput) => Promise<Cliente>;
        updateLocal: (id: string, patch: ClienteUpdatePatch) => Promise<Cliente>;
      };
      produtos: {
        listLocal: () => Promise<Produto[]>;
        createLocal: (input: ProdutoInput) => Promise<Produto>;
        updateLocal: (id: string, patch: ProdutoUpdatePatch) => Promise<Produto>;
      };
      tecidos: {
        listLocal: () => Promise<Tecido[]>;
        createLocal: (input: TecidoInput) => Promise<Tecido>;
        updateLocal: (id: string, patch: TecidoUpdatePatch) => Promise<Tecido>;
      };
      mesasCorte: {
        listLocal: () => Promise<MesaCorte[]>;
        createLocal: (input: MesaCorteInput) => Promise<MesaCorte>;
        updateLocal: (id: string, patch: MesaCorteUpdatePatch) => Promise<MesaCorte>;
      };
      produtoTamanhos: {
        listLocal: (produtoId: string) => Promise<ProdutoTamanho[]>;
        createLocal: (input: ProdutoTamanhoInput) => Promise<ProdutoTamanho>;
        updateLocal: (id: string, patch: ProdutoTamanhoUpdatePatch) => Promise<ProdutoTamanho>;
        reorderLocal: (orderedIds: string[]) => Promise<ProdutoTamanho[]>;
      };
      ordensCorte: {
        listLocal: () => Promise<OrdemCorteResumo[]>;
        itensListLocal: (ordemId: string) => Promise<OrdemCorteItem[]>;
        createLocal: (input: OrdemCorteInput, usuarioId: string) => Promise<OrdemCorte>;
        updateLocal: (
          id: string,
          patch: OrdemCorteUpdatePatch,
          usuarioId: string,
        ) => Promise<OrdemCorte>;
        duplicateLocal: (id: string, usuarioId: string) => Promise<OrdemCorte>;
        historicoListLocal: (ordemId: string) => Promise<OrdemCorteHistoricoEntry[]>;
      };
      empresas: {
        cache: (empresa: Empresa) => Promise<void>;
        getLocal: (id: string) => Promise<Empresa | null>;
      };
    };
  }
}

export {};
