import { ipcMain, app } from "electron";
import path from "node:path";
import { IPC_CHANNELS, type DbStatus, type SyncStatus } from "../../../src/shared/ipc";
import type {
  Usuario,
  UsuarioUpdatePatch,
  Cliente,
  ClienteInput,
  ClienteUpdatePatch,
  Produto,
  ProdutoInput,
  ProdutoUpdatePatch,
  Empresa,
} from "../../../src/shared/models";
import { getDb, getSchemaVersion } from "../db";
import { getPendingSyncCount } from "../sync/queue";
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

  ipcMain.handle(IPC_CHANNELS.empresasCache, (_event, empresa: Empresa) => {
    cacheEmpresa(getDb(), empresa);
  });

  ipcMain.handle(IPC_CHANNELS.empresasGetLocal, (_event, id: string): Empresa | null => {
    return getEmpresaLocal(getDb(), id);
  });
}
