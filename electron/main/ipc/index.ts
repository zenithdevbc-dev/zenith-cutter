import { ipcMain, app } from "electron";
import path from "node:path";
import {
  IPC_CHANNELS,
  type DbStatus,
  type SyncStatus,
  type PendingSyncItem,
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
  ProdutoTamanho,
  ProdutoTamanhoInput,
  ProdutoTamanhoUpdatePatch,
  OrdemCorte,
  OrdemCorteResumo,
  OrdemCorteItem,
  OrdemCorteInput,
  OrdemCorteUpdatePatch,
  Empresa,
} from "../../../src/shared/models";
import { getDb, getSchemaVersion } from "../db";
import {
  getPendingSyncCount,
  listPendingSync,
  markSyncSuccess,
  markSyncError,
} from "../sync/queue";
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
} from "../db/repositories/ordensCorte";
import { cacheEmpresa, getEmpresaLocal } from "../db/repositories/empresas";

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.dbGetStatus, (): DbStatus => {
    return {
      path: path.join(app.getPath("userData"), "zenith-cutter.sqlite"),
      schemaVersion: getSchemaVersion(),
    };
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

  ipcMain.handle(IPC_CHANNELS.ordensCorteCreateLocal, (_event, input: OrdemCorteInput): OrdemCorte => {
    return createOrdemCorteLocal(getDb(), input);
  });

  ipcMain.handle(
    IPC_CHANNELS.ordensCorteUpdateLocal,
    (_event, id: string, patch: OrdemCorteUpdatePatch): OrdemCorte => {
      return updateOrdemCorteLocal(getDb(), id, patch);
    },
  );

  ipcMain.handle(IPC_CHANNELS.ordensCorteDuplicateLocal, (_event, id: string): OrdemCorte => {
    return duplicateOrdemCorteLocal(getDb(), id);
  });

  ipcMain.handle(IPC_CHANNELS.empresasCache, (_event, empresa: Empresa) => {
    cacheEmpresa(getDb(), empresa);
  });

  ipcMain.handle(IPC_CHANNELS.empresasGetLocal, (_event, id: string): Empresa | null => {
    return getEmpresaLocal(getDb(), id);
  });
}
