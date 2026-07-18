# Zenith Cutter

Aplicativo desktop para Windows para gerenciamento do setor de **corte de
confecções** — controla o fluxo operacional desde a criação da Ordem de
Corte até sua conclusão. Opera normalmente sem internet, sincronizando com
o Supabase quando houver conectividade.

> Contexto de produto, princípios, fluxo oficial da produção e roadmap
> completo estão em [`CLAUDE.md`](./CLAUDE.md) — este README é só a porta
> de entrada técnica pra rodar e buildar o projeto.

## Stack

| Camada | Tecnologia |
|---|---|
| Plataforma | Desktop Windows (Electron) |
| Interface | React + TypeScript + Vite |
| Estilo | Tailwind CSS + shadcn/ui |
| Banco local | SQLite (`better-sqlite3`) |
| Banco em nuvem | Supabase PostgreSQL + Auth |
| Sincronização | Fila assíncrona SQLite → Supabase |

## Setup

```bash
npm install
cp .env.example .env   # preencher com as credenciais do projeto Supabase
npm run dev
```

O `.env` precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
(painel do Supabase → Settings → API). Sem essas variáveis o app ainda
abre, mas fica sem sincronização (o SQLite local continua funcionando
normalmente — offline first).

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o Electron + Vite em modo desenvolvimento (hot reload) |
| `npm run typecheck` | `tsc --noEmit` nos três projetos (main/preload/renderer) |
| `npm run build` | Typecheck + build de produção (renderer, main, preload) |
| `npm run build:win` | Build completo + empacota o instalador Windows (NSIS) via `electron-builder` |

Depois de `npm run build:win`, o instalador fica em `release/`. Feche o
app antes de rodar de novo (o `.exe` fica travado enquanto aberto).

## Estrutura de pastas

```
electron/
  main/           # processo principal — DB, IPC, sync, updater, log
    db/
      migrations/ # migrations do SQLite local, sequenciais, nunca editar uma já aplicada
      repositories/
    ipc/          # registro dos handlers ipcMain.handle
    sync/         # fila de sincronização + log de execuções
  preload/        # bridge contextIsolation (window.zenith.*)
src/
  shared/         # tipos e constantes de IPC compartilhados main/renderer
  renderer/
    pages/        # uma página por rota (App.tsx troca por estado, sem router)
    components/   # componentes de UI, agrupados por página/domínio quando específicos
    lib/          # wrappers finos sobre window.zenith.* + lógica pura (relatórios, etc.)
supabase/
  sql/            # migrations do Supabase, numeradas — aplicação manual no SQL Editor
  functions/      # Edge Functions (ex.: create-usuario, create-empresa)
```

## Padrões do projeto

- **Migrations locais** (`electron/main/db/migrations/index.ts`): rodam em
  ordem crescente de versão, uma vez cada, dentro de transação. Nunca
  editar uma já aplicada — sempre criar a próxima versão. `ALTER TABLE
  ADD COLUMN` para mudanças aditivas; recriação completa da tabela só
  quando muda `CHECK`/constraint (SQLite não suporta `ALTER` disso).
- **Migrations Supabase** (`supabase/sql/NNNN_*.sql`): espelham o schema
  local, mas **não rodam automaticamente** — são aplicadas manualmente no
  SQL Editor do projeto Supabase. Depois de criar uma migration local que
  precisa de contraparte no Supabase, crie o arquivo correspondente aqui
  também.
- **Fluxo main → renderer**: repositório (`db/repositories/*.ts`, função
  `*Local`) → canal IPC (`src/shared/ipc.ts` + `electron/main/ipc/index.ts`
  + `electron/preload/index.ts` + `src/renderer/global.d.ts`) → wrapper no
  renderer (`src/renderer/lib/*.ts`) → componente/página. Todo canal novo
  segue esse mesmo caminho 1:1.
- **Offline first**: toda escrita grava primeiro no SQLite local. Mudanças
  em tabelas sincronizáveis entram na `sync_queue`
  (`electron/main/sync/queue.ts`) e são enviadas ao Supabase em segundo
  plano pelo motor de sync (`src/renderer/lib/syncManager.ts`) — retry
  automático com backoff, detecção de rede via eventos `online`/`offline`.
- **Log**: `electron/main/log.ts` centraliza o `electron-log` do processo
  main (grava em `userData/logs`) e captura exceções não tratadas
  (`errorHandler.startCatching()`). No renderer, um `ErrorBoundary`
  (`src/renderer/components/ErrorBoundary.tsx`) cobre erro de render, e
  listeners globais de `error`/`unhandledrejection` cobrem o resto —
  ambos encaminham pro log do main via IPC (`log:report-error`).

## Auto-update

Ainda **sem provider configurado** — falta um bucket de releases no
Supabase Storage. Quando existir, adicionar em `package.json`:

```json
"build": { "publish": { "provider": "generic", "url": "<URL_PUBLICA_DO_BUCKET>" } }
```

Até lá o app funciona normalmente e apenas não verifica atualizações
(nunca trava por isso — reforça o princípio offline-first).
