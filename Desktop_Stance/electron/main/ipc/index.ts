import { ipcMain, app } from "electron";
import path from "node:path";
import {
  IPC_CHANNELS,
  type DbStatus,
  type SyncStatus,
  type PendingSyncItem,
  type SyncLogEntry,
  type SyncLogRecordInput,
  type LogReportErrorInput,
  type BackupRestoreResult,
} from "../../../src/shared/ipc";
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
} from "../../../src/shared/models";
import { getDb, getSchemaVersion } from "../db";
import {
  getPendingSyncCount,
  listPendingSync,
  markSyncSuccess,
  markSyncError,
  listErrorSync,
  resetSyncError,
} from "../sync/queue";
import { recordSyncLog, listSyncLog } from "../sync/log";
import { logRendererError } from "../log";
import { runBackup, restoreBackup } from "../backup";
import { quitAndInstall } from "../updater";
import {
  listUsuariosLocal,
  cacheUsuarios,
  updateUsuarioLocal,
} from "../db/repositories/usuarios";
import {
  listClientesLocal,
  createClienteLocal,
  updateClienteLocal,
} from "../db/repositories/clientes";
import {
  listProdutosLocal,
  createProdutoLocal,
  updateProdutoLocal,
} from "../db/repositories/produtos";
import {
  listTecidosLocal,
  createTecidoLocal,
  updateTecidoLocal,
} from "../db/repositories/tecidos";
import {
  listMesasCorteLocal,
  createMesaCorteLocal,
  updateMesaCorteLocal,
} from "../db/repositories/mesasCorte";
import {
  listBancasLocal,
  createBancaLocal,
  updateBancaLocal,
} from "../db/repositories/bancas";
import {
  listProdutoTamanhosLocal,
  createProdutoTamanhoLocal,
  updateProdutoTamanhoLocal,
  reorderProdutoTamanhosLocal,
} from "../db/repositories/produtoTamanhos";
import {
  listOrdensCorteLocal,
  listOrdemCorteItensLocal,
  createOrdemCorteLocal,
  updateOrdemCorteLocal,
  duplicateOrdemCorteLocal,
  listOrdemCorteHistoricoLocal,
  getNextOrdemCorteNumeroLocal,
  atribuirMesaFilaLocal,
} from "../db/repositories/ordensCorte";
import { cacheEmpresa, getEmpresaLocal } from "../db/repositories/empresas";
import { setCurrentEmpresaId, clearCurrentEmpresaId } from "../session";
import { listRelatorioProducaoLocal, listRelatorioPerdasLocal } from "../db/repositories/relatorios";
import {
  listFilaProducaoLocal,
  reorderFilaProducaoLocal,
} from "../db/repositories/filaProducao";
import {
  listMesasComStatusLocal,
  iniciarProducaoLocal,
  listSessoesAtivasLocal,
  avancarEtapaOrdemLocal,
  pausarProducaoLocal,
  retomarProducaoLocal,
  listProducaoPerdasLocal,
  listProducaoPerdasPorOrdemLocal,
  registrarProducaoPerdaLocal,
  listProducaoObservacoesLocal,
  registrarProducaoObservacaoLocal,
} from "../db/repositories/producao";

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.dbGetStatus, (): DbStatus => {
    return {
      path: path.join(app.getPath("userData"), "zenith-cutter.sqlite"),
      schemaVersion: getSchemaVersion(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.logReportError, (_event, { message, stack }: LogReportErrorInput) => {
    logRendererError(message, stack);
  });

  ipcMain.handle(IPC_CHANNELS.backupRun, (): Promise<string | null> => {
    return runBackup();
  });

  ipcMain.handle(IPC_CHANNELS.backupRestore, (): Promise<BackupRestoreResult> => {
    return restoreBackup();
  });

  ipcMain.handle(IPC_CHANNELS.syncGetStatus, (): SyncStatus => {
    return {
      pendingCount: getPendingSyncCount(getDb()),
    };
  });

  ipcMain.handle(IPC_CHANNELS.syncListPending, (): PendingSyncItem[] => {
    return listPendingSync(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.syncMarkSuccess, (_event, id: number) => {
    markSyncSuccess(getDb(), id);
  });

  ipcMain.handle(IPC_CHANNELS.syncMarkError, (_event, id: number, message: string) => {
    markSyncError(getDb(), id, message);
  });

  ipcMain.handle(IPC_CHANNELS.syncListErrors, (): PendingSyncItem[] => {
    return listErrorSync(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.syncResetError, (_event, id: number) => {
    resetSyncError(getDb(), id);
  });

  ipcMain.handle(
    IPC_CHANNELS.syncLogRecord,
    (_event, entry: SyncLogRecordInput) => {
      recordSyncLog(getDb(), entry);
    },
  );

  ipcMain.handle(IPC_CHANNELS.syncLogList, (_event, limit?: number): SyncLogEntry[] => {
    return listSyncLog(getDb(), limit);
  });

  ipcMain.handle(IPC_CHANNELS.updaterQuitAndInstall, () => {
    quitAndInstall();
  });

  ipcMain.handle(IPC_CHANNELS.usuariosListLocal, (): Usuario[] => {
    return listUsuariosLocal(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.usuariosCache, (_event, usuarios: Usuario[]) => {
    cacheUsuarios(getDb(), usuarios);
  });

  ipcMain.handle(
    IPC_CHANNELS.usuariosUpdateLocal,
    (_event, id: string, patch: UsuarioUpdatePatch): Usuario => {
      return updateUsuarioLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(IPC_CHANNELS.clientesListLocal, (): Cliente[] => {
    return listClientesLocal(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.clientesCreateLocal, (_event, input: ClienteInput): Cliente => {
    return createClienteLocal(getDb(), input);
  });

  ipcMain.handle(
    IPC_CHANNELS.clientesUpdateLocal,
    (_event, id: string, patch: ClienteUpdatePatch): Cliente => {
      return updateClienteLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(IPC_CHANNELS.produtosListLocal, (): Produto[] => {
    return listProdutosLocal(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.produtosCreateLocal, (_event, input: ProdutoInput): Produto => {
    return createProdutoLocal(getDb(), input);
  });

  ipcMain.handle(
    IPC_CHANNELS.produtosUpdateLocal,
    (_event, id: string, patch: ProdutoUpdatePatch): Produto => {
      return updateProdutoLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(IPC_CHANNELS.tecidosListLocal, (): Tecido[] => {
    return listTecidosLocal(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.tecidosCreateLocal, (_event, input: TecidoInput): Tecido => {
    return createTecidoLocal(getDb(), input);
  });

  ipcMain.handle(
    IPC_CHANNELS.tecidosUpdateLocal,
    (_event, id: string, patch: TecidoUpdatePatch): Tecido => {
      return updateTecidoLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(IPC_CHANNELS.mesasCorteListLocal, (): MesaCorte[] => {
    return listMesasCorteLocal(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.mesasCorteCreateLocal, (_event, input: MesaCorteInput): MesaCorte => {
    return createMesaCorteLocal(getDb(), input);
  });

  ipcMain.handle(
    IPC_CHANNELS.mesasCorteUpdateLocal,
    (_event, id: string, patch: MesaCorteUpdatePatch): MesaCorte => {
      return updateMesaCorteLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(IPC_CHANNELS.bancasListLocal, (): Banca[] => {
    return listBancasLocal(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.bancasCreateLocal, (_event, input: BancaInput): Banca => {
    return createBancaLocal(getDb(), input);
  });

  ipcMain.handle(
    IPC_CHANNELS.bancasUpdateLocal,
    (_event, id: string, patch: BancaUpdatePatch): Banca => {
      return updateBancaLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.produtoTamanhosListLocal,
    (_event, produtoId: string): ProdutoTamanho[] => {
      return listProdutoTamanhosLocal(getDb(), produtoId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.produtoTamanhosCreateLocal,
    (_event, input: ProdutoTamanhoInput): ProdutoTamanho => {
      return createProdutoTamanhoLocal(getDb(), input);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.produtoTamanhosUpdateLocal,
    (_event, id: string, patch: ProdutoTamanhoUpdatePatch): ProdutoTamanho => {
      return updateProdutoTamanhoLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.produtoTamanhosReorderLocal,
    (_event, orderedIds: string[]): ProdutoTamanho[] => {
      return reorderProdutoTamanhosLocal(getDb(), orderedIds);
    },
  );

  ipcMain.handle(IPC_CHANNELS.ordensCorteListLocal, (): OrdemCorteResumo[] => {
    return listOrdensCorteLocal(getDb());
  });

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteItensListLocal,
    (_event, ordemId: string): OrdemCorteItem[] => {
      return listOrdemCorteItensLocal(getDb(), ordemId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteCreateLocal,
    (_event, input: OrdemCorteInput, usuarioId: string): OrdemCorte => {
      return createOrdemCorteLocal(getDb(), input, usuarioId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteUpdateLocal,
    (_event, id: string, patch: OrdemCorteUpdatePatch, usuarioId: string): OrdemCorte => {
      return updateOrdemCorteLocal(getDb(), id, patch, usuarioId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteDuplicateLocal,
    (_event, id: string, usuarioId: string): OrdemCorte => {
      return duplicateOrdemCorteLocal(getDb(), id, usuarioId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteHistoricoListLocal,
    (_event, ordemId: string): OrdemCorteHistoricoEntry[] => {
      return listOrdemCorteHistoricoLocal(getDb(), ordemId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteNextNumeroLocal,
    (_event, empresaId: string): number => {
      return getNextOrdemCorteNumeroLocal(getDb(), empresaId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteAtribuirMesaLocal,
    (
      _event,
      ordemId: string,
      mesaAtribuidaId: string | null,
      usuarioId: string,
    ): OrdemCorteResumo => {
      return atribuirMesaFilaLocal(getDb(), ordemId, mesaAtribuidaId, usuarioId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.filaProducaoListLocal, (): OrdemCorteResumo[] => {
    return listFilaProducaoLocal(getDb());
  });

  ipcMain.handle(
    IPC_CHANNELS.filaProducaoReorderLocal,
    (_event, orderedIds: string[], usuarioId: string): OrdemCorteResumo[] => {
      return reorderFilaProducaoLocal(getDb(), orderedIds, usuarioId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.producaoMesasListLocal, (): MesaCorteComStatus[] => {
    return listMesasComStatusLocal(getDb());
  });

  ipcMain.handle(
    IPC_CHANNELS.producaoIniciarLocal,
    (_event, input: IniciarProducaoInput, usuarioId: string): SessaoProducao => {
      return iniciarProducaoLocal(getDb(), input, usuarioId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.producaoSessoesAtivasListLocal, (): SessaoProducaoResumo[] => {
    return listSessoesAtivasLocal(getDb());
  });

  ipcMain.handle(
    IPC_CHANNELS.producaoAvancarEtapaLocal,
    (_event, ordemId: string, usuarioId: string): OrdemCorte => {
      return avancarEtapaOrdemLocal(getDb(), ordemId, usuarioId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.producaoPausarLocal,
    (_event, ordemId: string, usuarioId: string): SessaoProducao => {
      return pausarProducaoLocal(getDb(), ordemId, usuarioId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.producaoRetomarLocal,
    (_event, ordemId: string, usuarioId: string): SessaoProducao => {
      return retomarProducaoLocal(getDb(), ordemId, usuarioId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.producaoPerdasListLocal,
    (_event, sessaoId: string): ProducaoPerda[] => {
      return listProducaoPerdasLocal(getDb(), sessaoId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.producaoPerdasListPorOrdemLocal,
    (_event, ordemId: string): ProducaoPerda[] => {
      return listProducaoPerdasPorOrdemLocal(getDb(), ordemId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.producaoPerdasRegistrarLocal,
    (_event, input: ProducaoPerdaInput, usuarioId: string): ProducaoPerda => {
      return registrarProducaoPerdaLocal(getDb(), input, usuarioId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.producaoObservacoesListLocal,
    (_event, sessaoId: string): ProducaoObservacao[] => {
      return listProducaoObservacoesLocal(getDb(), sessaoId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.producaoObservacoesRegistrarLocal,
    (_event, input: ProducaoObservacaoInput, usuarioId: string): ProducaoObservacao => {
      return registrarProducaoObservacaoLocal(getDb(), input, usuarioId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.empresasCache, (_event, empresa: Empresa) => {
    cacheEmpresa(getDb(), empresa);
  });

  ipcMain.handle(IPC_CHANNELS.empresasGetLocal, (_event, id: string): Empresa | null => {
    return getEmpresaLocal(getDb(), id);
  });

  ipcMain.handle(IPC_CHANNELS.sessionSetEmpresaLocal, (_event, empresaId: string): void => {
    setCurrentEmpresaId(empresaId);
  });

  ipcMain.handle(IPC_CHANNELS.sessionClearEmpresaLocal, (): void => {
    clearCurrentEmpresaId();
  });

  ipcMain.handle(IPC_CHANNELS.relatoriosProducaoListLocal, (): RelatorioProducaoLinha[] => {
    return listRelatorioProducaoLocal(getDb());
  });

  ipcMain.handle(IPC_CHANNELS.relatoriosPerdasListLocal, (): RelatorioPerdaLinha[] => {
    return listRelatorioPerdasLocal(getDb());
  });
}
