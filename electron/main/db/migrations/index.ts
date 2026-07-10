import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * Migrations rodam em ordem crescente de `version`, uma única vez cada,
 * dentro de uma transação. Nunca edite uma migration já aplicada em
 * produção — crie uma nova com a próxima versão.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: "create_sync_queue",
    up: (db) => {
      db.exec(`
        CREATE TABLE sync_queue (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name    TEXT NOT NULL,
          record_id     TEXT NOT NULL,
          operation     TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
          payload       TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
          retry_count   INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          synced_at     TEXT
        );

        CREATE INDEX idx_sync_queue_status ON sync_queue (status);
      `);
    },
  },
  {
    version: 2,
    name: "create_usuarios",
    up: (db) => {
      db.exec(`
        -- Espelho local da tabela public.usuarios do Supabase. O id é o
        -- mesmo uuid do auth.users (conta é sempre criada no Supabase
        -- primeiro, via Edge Function — nunca existe usuário "só local").
        CREATE TABLE usuarios (
          id            TEXT PRIMARY KEY,
          nome          TEXT NOT NULL,
          email         TEXT NOT NULL,
          papel         TEXT NOT NULL DEFAULT 'operador' CHECK (papel IN ('operador', 'administrador')),
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL,
          cached_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
      `);
    },
  },
  {
    version: 3,
    name: "create_clientes",
    up: (db) => {
      db.exec(`
        -- Diferente de usuarios, cliente nasce local (offline-first de
        -- verdade): id é gerado no app (uuid), gravado aqui primeiro, e só
        -- depois sincronizado com o Supabase via sync_queue.
        CREATE TABLE clientes (
          id            TEXT PRIMARY KEY,
          nome          TEXT NOT NULL,
          documento     TEXT,
          telefone      TEXT,
          email         TEXT,
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_clientes_nome ON clientes (nome);
      `);
    },
  },
  {
    version: 4,
    name: "add_empresas_multi_tenant",
    up: (db) => {
      db.exec(`
        -- Cache local só-leitura da empresa do usuário logado (não tem
        -- CRUD no app — provisionar empresa é operação de backend, ver
        -- supabase/functions/create-empresa).
        CREATE TABLE empresas (
          id        TEXT PRIMARY KEY,
          nome      TEXT NOT NULL,
          ativo     INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em TEXT NOT NULL
        );

        -- Toda tabela de negócio carrega empresa_id a partir daqui — é o
        -- que o RLS do Supabase usa pra isolar os dados entre empresas.
        ALTER TABLE usuarios ADD COLUMN empresa_id TEXT;
        ALTER TABLE clientes ADD COLUMN empresa_id TEXT;

        CREATE INDEX idx_usuarios_empresa ON usuarios (empresa_id);
        CREATE INDEX idx_clientes_empresa ON clientes (empresa_id);
      `);
    },
  },
  {
    version: 5,
    name: "create_produtos",
    up: (db) => {
      db.exec(`
        -- Mesmo padrão de clientes: nasce local (offline-first de
        -- verdade), id gerado no app, empresa_id já presente desde a
        -- criação (diferente de usuarios/clientes, que vieram antes do
        -- multiempresa e precisaram de ALTER retroativo).
        CREATE TABLE produtos (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          nome          TEXT NOT NULL,
          codigo        TEXT,
          descricao     TEXT,
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_produtos_nome ON produtos (nome);
        CREATE INDEX idx_produtos_empresa ON produtos (empresa_id);
      `);
    },
  },
  {
    version: 6,
    name: "create_tecidos",
    up: (db) => {
      db.exec(`
        -- Mesmo padrão de produtos/clientes: offline-first, id gerado no
        -- app, empresa_id presente desde a criação.
        CREATE TABLE tecidos (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          nome          TEXT NOT NULL,
          composicao    TEXT,
          cor           TEXT,
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_tecidos_nome ON tecidos (nome);
        CREATE INDEX idx_tecidos_empresa ON tecidos (empresa_id);
      `);
    },
  },
  {
    version: 7,
    name: "create_mesas_corte",
    up: (db) => {
      db.exec(`
        -- Cadastro (Sprint 1) das mesas físicas de corte que existem na
        -- fábrica. Estado de ocupação (livre/ocupada) é conceito da Fila
        -- de Produção (Sprint 3), não faz parte deste cadastro.
        CREATE TABLE mesas_corte (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          nome          TEXT NOT NULL,
          observacoes   TEXT,
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_mesas_corte_nome ON mesas_corte (nome);
        CREATE INDEX idx_mesas_corte_empresa ON mesas_corte (empresa_id);
      `);
    },
  },
  {
    version: 8,
    name: "create_produto_tamanhos",
    up: (db) => {
      db.exec(`
        -- Grade de tamanhos de um produto: tamanho é texto livre
        -- (definido pelo usuário, não um enum fixo), com uma ordem
        -- explícita que o usuário controla (reordenar a grade). Mesmo
        -- padrão offline-first das demais tabelas de negócio.
        CREATE TABLE produto_tamanhos (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          produto_id    TEXT NOT NULL,
          tamanho       TEXT NOT NULL,
          ordem         INTEGER NOT NULL,
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_produto_tamanhos_produto ON produto_tamanhos (produto_id);
        CREATE INDEX idx_produto_tamanhos_empresa ON produto_tamanhos (empresa_id);
      `);
    },
  },
  {
    version: 9,
    name: "add_usuarios_login",
    up: (db) => {
      db.exec(`
        -- A credencial de login deixa de ser o e-mail e passa a ser um
        -- "nome de login" próprio (username), resolvido para o e-mail
        -- real do Supabase Auth antes do signIn (ver resolve_login_email
        -- no Supabase e auth-context.tsx). E-mail continua obrigatório
        -- no cadastro do usuário.
        ALTER TABLE usuarios ADD COLUMN login TEXT;

        CREATE UNIQUE INDEX idx_usuarios_login ON usuarios (login);
      `);
    },
  },
  {
    version: 10,
    name: "create_ordens_corte",
    up: (db) => {
      db.exec(`
        -- Sprint 2: cadastro de Ordens de Corte. Status aqui é só o que
        -- existe ANTES de entrar na Fila de Produção (Sprint 3) — os
        -- estados de execução (Em Corte, Pausada, Finalizada...) chegam
        -- junto com a fila. Mesmo padrão offline-first das demais
        -- tabelas de negócio.
        CREATE TABLE ordens_corte (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          cliente_id    TEXT NOT NULL,
          produto_id    TEXT NOT NULL,
          tecido_id     TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_fila', 'cancelada')),
          observacoes   TEXT,
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_ordens_corte_empresa ON ordens_corte (empresa_id);
        CREATE INDEX idx_ordens_corte_status ON ordens_corte (status);

        -- Quantidade por tamanho da grade do produto escolhido (ver
        -- produto_tamanhos). Editar itens de uma ordem = apagar e
        -- regravar tudo (simplicidade — nunca há muitos itens por ordem).
        CREATE TABLE ordem_corte_itens (
          id                 TEXT PRIMARY KEY,
          empresa_id         TEXT NOT NULL,
          ordem_id           TEXT NOT NULL,
          produto_tamanho_id TEXT NOT NULL,
          quantidade         INTEGER NOT NULL
        );

        CREATE INDEX idx_ordem_corte_itens_ordem ON ordem_corte_itens (ordem_id);
      `);
    },
  },
  {
    version: 11,
    name: "add_supervisor_role",
    up: (db) => {
      db.exec(`
        -- Novo papel "supervisor" (entre operador e administrador). SQLite
        -- não permite ALTER de CHECK constraint diretamente — recria a
        -- tabela preservando dados e índices.
        CREATE TABLE usuarios_new (
          id            TEXT PRIMARY KEY,
          nome          TEXT NOT NULL,
          email         TEXT NOT NULL,
          papel         TEXT NOT NULL DEFAULT 'operador' CHECK (papel IN ('operador', 'supervisor', 'administrador')),
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL,
          cached_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          empresa_id    TEXT,
          login         TEXT
        );

        INSERT INTO usuarios_new
          (id, nome, email, papel, ativo, criado_em, atualizado_em, cached_at, empresa_id, login)
          SELECT id, nome, email, papel, ativo, criado_em, atualizado_em, cached_at, empresa_id, login
          FROM usuarios;

        DROP TABLE usuarios;
        ALTER TABLE usuarios_new RENAME TO usuarios;

        CREATE INDEX idx_usuarios_empresa ON usuarios (empresa_id);
        CREATE UNIQUE INDEX idx_usuarios_login ON usuarios (login);
      `);
    },
  },
  {
    version: 12,
    name: "create_ordem_corte_historico",
    up: (db) => {
      db.exec(`
        -- Histórico dedicado de Ordens de Corte (Sprint 2, CLAUDE.md 3.5:
        -- toda ação relevante rastreável — usuário, timestamp, ação).
        -- Registro é imutável: só INSERT, nunca UPDATE/DELETE.
        CREATE TABLE ordem_corte_historico (
          id          TEXT PRIMARY KEY,
          empresa_id  TEXT NOT NULL,
          ordem_id    TEXT NOT NULL,
          usuario_id  TEXT NOT NULL,
          acao        TEXT NOT NULL CHECK (acao IN ('criacao', 'edicao', 'mudanca_status', 'cancelamento', 'duplicacao')),
          descricao   TEXT NOT NULL,
          criado_em   TEXT NOT NULL
        );

        CREATE INDEX idx_ordem_corte_historico_ordem ON ordem_corte_historico (ordem_id);
      `);
    },
  },
];
