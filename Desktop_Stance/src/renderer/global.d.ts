import type {
  DbStatus,
  SyncStatus,
  PendingSyncItem,
  SyncLogEntry,
  SyncLogRecordInput,
  LogReportErrorInput,
  BackupRestoreResult,
} from "@shared/ipc";
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
  Banca,
  BancaInput,
  BancaUpdatePatch,
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
      log: {
        reportError: (entry: LogReportErrorInput) => Promise<void>;
      };
      backup: {
        run: () => Promise<string | null>;
        restore: () => Promise<BackupRestoreResult>;
      };
      sync: {
        getStatus: () => Promise<SyncStatus>;
        listPending: () => Promise<PendingSyncItem[]>;
        markSuccess: (id: number) => Promise<void>;
        markError: (id: number, message: string) => Promise<void>;
        listErrors: () => Promise<PendingSyncItem[]>;
        resetError: (id: number) => Promise<void>;
        logRecord: (entry: SyncLogRecordInput) => Promise<void>;
        logList: (limit?: number) => Promise<SyncLogEntry[]>;
      };
      updater: {
        onUpdateAvailable: (callback: () => void) => () => void;
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
        cacheLocal: (clientes: Cliente[]) => Promise<void>;
      };
      produtos: {
        listLocal: () => Promise<Produto[]>;
        createLocal: (input: ProdutoInput) => Promise<Produto>;
        updateLocal: (id: string, patch: ProdutoUpdatePatch) => Promise<Produto>;
        cacheLocal: (produtos: Produto[]) => Promise<void>;
      };
      tecidos: {
        listLocal: () => Promise<Tecido[]>;
        createLocal: (input: TecidoInput) => Promise<Tecido>;
        updateLocal: (id: string, patch: TecidoUpdatePatch) => Promise<Tecido>;
        cacheLocal: (tecidos: Tecido[]) => Promise<void>;
      };
      mesasCorte: {
        listLocal: () => Promise<MesaCorte[]>;
        createLocal: (input: MesaCorteInput) => Promise<MesaCorte>;
        updateLocal: (id: string, patch: MesaCorteUpdatePatch) => Promise<MesaCorte>;
        cacheLocal: (mesas: MesaCorte[]) => Promise<void>;
      };
      bancas: {
        listLocal: () => Promise<Banca[]>;
        createLocal: (input: BancaInput) => Promise<Banca>;
        updateLocal: (id: string, patch: BancaUpdatePatch) => Promise<Banca>;
        cacheLocal: (bancas: Banca[]) => Promise<void>;
      };
      produtoTamanhos: {
        listLocal: (produtoId: string) => Promise<ProdutoTamanho[]>;
        createLocal: (input: ProdutoTamanhoInput) => Promise<ProdutoTamanho>;
        updateLocal: (id: string, patch: ProdutoTamanhoUpdatePatch) => Promise<ProdutoTamanho>;
        reorderLocal: (orderedIds: string[]) => Promise<ProdutoTamanho[]>;
        cacheLocal: (tamanhos: ProdutoTamanho[]) => Promise<void>;
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
        nextNumeroLocal: (empresaId: string) => Promise<number>;
        atribuirMesaLocal: (
          ordemId: string,
          mesaAtribuidaId: string | null,
          usuarioId: string,
        ) => Promise<OrdemCorteResumo>;
        arquivarLocal: (ordemId: string, usuarioId: string) => Promise<OrdemCorteResumo>;
        cacheLocal: (ordens: OrdemCorte[]) => Promise<void>;
        itensCacheLocal: (itens: OrdemCorteItem[]) => Promise<void>;
        historicoCacheLocal: (entradas: OrdemCorteHistoricoEntry[]) => Promise<void>;
      };
      filaProducao: {
        listLocal: () => Promise<OrdemCorteResumo[]>;
        reorderLocal: (orderedIds: string[], usuarioId: string) => Promise<OrdemCorteResumo[]>;
      };
      producao: {
        listMesasLocal: () => Promise<MesaCorteComStatus[]>;
        iniciarLocal: (
          input: IniciarProducaoInput,
          usuarioId: string,
        ) => Promise<SessaoProducao>;
        listSessoesAtivasLocal: () => Promise<SessaoProducaoResumo[]>;
        avancarEtapaLocal: (ordemId: string, usuarioId: string) => Promise<OrdemCorte>;
        pausarLocal: (ordemId: string, usuarioId: string) => Promise<SessaoProducao>;
        retomarLocal: (ordemId: string, usuarioId: string) => Promise<SessaoProducao>;
        perdasListLocal: (sessaoId: string) => Promise<ProducaoPerda[]>;
        perdasListPorOrdemLocal: (ordemId: string) => Promise<ProducaoPerda[]>;
        perdasRegistrarLocal: (
          input: ProducaoPerdaInput,
          usuarioId: string,
        ) => Promise<ProducaoPerda>;
        observacoesListLocal: (sessaoId: string) => Promise<ProducaoObservacao[]>;
        observacoesRegistrarLocal: (
          input: ProducaoObservacaoInput,
          usuarioId: string,
        ) => Promise<ProducaoObservacao>;
        sessoesCacheLocal: (sessoes: SessaoProducao[]) => Promise<void>;
        perdasCacheLocal: (perdas: ProducaoPerda[]) => Promise<void>;
        observacoesCacheLocal: (observacoes: ProducaoObservacao[]) => Promise<void>;
      };
      empresas: {
        cache: (empresa: Empresa) => Promise<void>;
        getLocal: (id: string) => Promise<Empresa | null>;
      };
      session: {
        setEmpresaLocal: (empresaId: string) => Promise<void>;
        clearEmpresaLocal: () => Promise<void>;
      };
      relatorios: {
        producaoListLocal: () => Promise<RelatorioProducaoLinha[]>;
        perdasListLocal: () => Promise<RelatorioPerdaLinha[]>;
      };
    };
  }
}

export {};
