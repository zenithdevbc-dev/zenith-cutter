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
  {
    version: 13,
    name: "add_ordem_corte_numero",
    up: (db) => {
      db.exec(`
        -- Número sequencial da ordem, exibido pro usuário (pedido
        -- 2026-07-09): sugerido automaticamente (maior número + 1 da
        -- própria empresa), mas editável na criação. Nunca pode repetir
        -- dentro da mesma empresa — por isso UNIQUE(empresa_id, numero),
        -- não só validação de app. Imutável depois de criado (é um
        -- identificador, não um dado de negócio editável).
        -- SQLite não permite ALTER ADD COLUMN NOT NULL sem default
        -- fixo, então recria a tabela (mesmo padrão da v11).
        CREATE TABLE ordens_corte_new (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          numero        INTEGER NOT NULL,
          cliente_id    TEXT NOT NULL,
          produto_id    TEXT NOT NULL,
          tecido_id     TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_fila', 'cancelada')),
          observacoes   TEXT,
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL,
          UNIQUE (empresa_id, numero)
        );

        INSERT INTO ordens_corte_new
          (id, empresa_id, numero, cliente_id, produto_id, tecido_id, status, observacoes, criado_em, atualizado_em)
          SELECT
            id, empresa_id,
            ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY criado_em ASC),
            cliente_id, produto_id, tecido_id, status, observacoes, criado_em, atualizado_em
          FROM ordens_corte;

        DROP TABLE ordens_corte;
        ALTER TABLE ordens_corte_new RENAME TO ordens_corte;

        CREATE INDEX idx_ordens_corte_empresa ON ordens_corte (empresa_id);
        CREATE INDEX idx_ordens_corte_status ON ordens_corte (status);
      `);
    },
  },
  {
    version: 14,
    name: "add_ordem_corte_em_corte_e_prioridade",
    up: (db) => {
      db.exec(`
        -- Sprint 3: novo status 'em_corte' (ordem com sessão de
        -- produção ativa — só setado por iniciarProducaoLocal, nunca
        -- por edição livre) e 'prioridade' (ordena a fila manualmente,
        -- mesmo padrão de produto_tamanhos.ordem). SQLite não permite
        -- ALTER de CHECK, recria a tabela (mesmo padrão da v11/v13).
        -- Nenhuma ordem hoje está em 'em_fila' (nada nunca setou isso
        -- até agora), então não há backfill de prioridade a fazer.
        CREATE TABLE ordens_corte_new (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          numero        INTEGER NOT NULL,
          cliente_id    TEXT NOT NULL,
          produto_id    TEXT NOT NULL,
          tecido_id     TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_fila', 'cancelada', 'em_corte')),
          prioridade    INTEGER NOT NULL DEFAULT 0,
          observacoes   TEXT,
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL,
          UNIQUE (empresa_id, numero)
        );

        INSERT INTO ordens_corte_new
          (id, empresa_id, numero, cliente_id, produto_id, tecido_id, status, prioridade, observacoes, criado_em, atualizado_em)
          SELECT
            id, empresa_id, numero, cliente_id, produto_id, tecido_id, status, 0, observacoes, criado_em, atualizado_em
          FROM ordens_corte;

        DROP TABLE ordens_corte;
        ALTER TABLE ordens_corte_new RENAME TO ordens_corte;

        CREATE INDEX idx_ordens_corte_empresa ON ordens_corte (empresa_id);
        CREATE INDEX idx_ordens_corte_status ON ordens_corte (status);
      `);
    },
  },
  {
    version: 15,
    name: "create_sessoes_producao",
    up: (db) => {
      db.exec(`
        -- Sprint 3: sessão de produção — criada ao "Iniciar" (seleciona
        -- mesa livre + confirma), nunca automaticamente (regra 3.1).
        -- status já inclui os 3 valores da state machine (seção 4 do
        -- CLAUDE.md), mas este sprint só produz 'em_andamento';
        -- 'pausada'/'finalizada' chegam no Sprint 4.
        CREATE TABLE sessoes_producao (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          ordem_id      TEXT NOT NULL,
          mesa_id       TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'pausada', 'finalizada')),
          iniciado_por  TEXT NOT NULL,
          iniciado_em   TEXT NOT NULL,
          finalizado_em TEXT,
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_sessoes_producao_empresa ON sessoes_producao (empresa_id);
        CREATE INDEX idx_sessoes_producao_ordem ON sessoes_producao (ordem_id);

        -- Garantia no banco (não só validação de app) de que uma mesa
        -- nunca tem duas sessões ativas ao mesmo tempo, e que uma ordem
        -- não é iniciada duas vezes — mesmo espírito do
        -- UNIQUE(empresa_id, numero) de ordens_corte.
        CREATE UNIQUE INDEX idx_sessoes_producao_mesa_ativa ON sessoes_producao (mesa_id) WHERE status = 'em_andamento';
        CREATE UNIQUE INDEX idx_sessoes_producao_ordem_ativa ON sessoes_producao (ordem_id) WHERE status = 'em_andamento';
      `);
    },
  },
  {
    version: 16,
    name: "add_ordem_corte_pipeline_pos_corte",
    up: (db) => {
      db.exec(`
        -- Pipeline pós-corte (decisão de 2026-07-11, seção 4 do
        -- CLAUDE.md): 'em_corte' avança manualmente por 'embalagem',
        -- 'revisao', 'despacho' até 'pronto' — cada etapa avançada uma
        -- de cada vez (regra 4), nunca automaticamente. Recria a
        -- tabela pra ampliar o CHECK (mesmo padrão da v11/v13/v14).
        CREATE TABLE ordens_corte_new (
          id            TEXT PRIMARY KEY,
          empresa_id    TEXT NOT NULL,
          numero        INTEGER NOT NULL,
          cliente_id    TEXT NOT NULL,
          produto_id    TEXT NOT NULL,
          tecido_id     TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_fila', 'cancelada', 'em_corte', 'embalagem', 'revisao', 'despacho', 'pronto')),
          prioridade    INTEGER NOT NULL DEFAULT 0,
          observacoes   TEXT,
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL,
          UNIQUE (empresa_id, numero)
        );

        INSERT INTO ordens_corte_new
          (id, empresa_id, numero, cliente_id, produto_id, tecido_id, status, prioridade, observacoes, criado_em, atualizado_em)
          SELECT
            id, empresa_id, numero, cliente_id, produto_id, tecido_id, status, prioridade, observacoes, criado_em, atualizado_em
          FROM ordens_corte;

        DROP TABLE ordens_corte;
        ALTER TABLE ordens_corte_new RENAME TO ordens_corte;

        CREATE INDEX idx_ordens_corte_empresa ON ordens_corte (empresa_id);
        CREATE INDEX idx_ordens_corte_status ON ordens_corte (status);
      `);
    },
  },
  {
    version: 17,
    name: "add_sessoes_producao_pausa",
    up: (db) => {
      db.exec(`
        -- Sprint 4: pausar/retomar dentro de 'Em Corte'. pausado_em
        -- marca o início da pausa atual (NULL fora de pausa);
        -- tempo_pausado_segundos acumula o total pausado da sessão
        -- (somado a cada retomada), usado depois pra calcular o tempo
        -- de produção efetivo. Não precisa recriar a tabela — sem
        -- CHECK novo, só colunas com default fixo.
        ALTER TABLE sessoes_producao ADD COLUMN pausado_em TEXT;
        ALTER TABLE sessoes_producao ADD COLUMN tempo_pausado_segundos INTEGER NOT NULL DEFAULT 0;
      `);
    },
  },
  {
    version: 18,
    name: "add_ordem_corte_historico_pausa_retomada",
    up: (db) => {
      db.exec(`
        -- Sprint 4: novas ações de auditoria pra pausar/retomar
        -- produção (CLAUDE.md 3.5). Recria a tabela pra ampliar o
        -- CHECK (mesmo padrão da v11/v13/v14/v16).
        CREATE TABLE ordem_corte_historico_new (
          id          TEXT PRIMARY KEY,
          empresa_id  TEXT NOT NULL,
          ordem_id    TEXT NOT NULL,
          usuario_id  TEXT NOT NULL,
          acao        TEXT NOT NULL CHECK (acao IN ('criacao', 'edicao', 'mudanca_status', 'cancelamento', 'duplicacao', 'pausa', 'retomada')),
          descricao   TEXT NOT NULL,
          criado_em   TEXT NOT NULL
        );

        INSERT INTO ordem_corte_historico_new
          (id, empresa_id, ordem_id, usuario_id, acao, descricao, criado_em)
          SELECT id, empresa_id, ordem_id, usuario_id, acao, descricao, criado_em
          FROM ordem_corte_historico;

        DROP TABLE ordem_corte_historico;
        ALTER TABLE ordem_corte_historico_new RENAME TO ordem_corte_historico;

        CREATE INDEX idx_ordem_corte_historico_ordem ON ordem_corte_historico (ordem_id);
      `);
    },
  },
  {
    version: 19,
    name: "fix_sessoes_producao_indices_pausada",
    up: (db) => {
      db.exec(`
        -- Bug encontrado ao implementar pausar/retomar: os índices
        -- únicos parciais só cobriam status='em_andamento', então uma
        -- sessão pausada não bloqueava a mesa/ordem contra um novo
        -- "Iniciar" — mas pausar não libera a mesa (a peça continua
        -- fisicamente na mesa, só o corte parou). Recria os índices
        -- cobrindo 'em_andamento' e 'pausada'.
        DROP INDEX idx_sessoes_producao_mesa_ativa;
        DROP INDEX idx_sessoes_producao_ordem_ativa;

        CREATE UNIQUE INDEX idx_sessoes_producao_mesa_ativa ON sessoes_producao (mesa_id) WHERE status IN ('em_andamento', 'pausada');
        CREATE UNIQUE INDEX idx_sessoes_producao_ordem_ativa ON sessoes_producao (ordem_id) WHERE status IN ('em_andamento', 'pausada');
      `);
    },
  },
  {
    version: 20,
    name: "create_producao_perdas_e_observacoes",
    up: (db) => {
      db.exec(`
        -- Sprint 4: registro de perdas e observações durante uma
        -- sessão de produção. Log cronológico, imutável (só INSERT) —
        -- mesmo padrão de ordem_corte_historico. quantidade é livre
        -- (sem unidade fixa; o motivo descreve o que foi perdido).
        CREATE TABLE producao_perdas (
          id          TEXT PRIMARY KEY,
          empresa_id  TEXT NOT NULL,
          sessao_id   TEXT NOT NULL,
          quantidade  REAL NOT NULL CHECK (quantidade > 0),
          motivo      TEXT,
          usuario_id  TEXT NOT NULL,
          criado_em   TEXT NOT NULL
        );

        CREATE INDEX idx_producao_perdas_sessao ON producao_perdas (sessao_id);

        -- Observação diferente do campo estático ordens_corte.observacoes
        -- — é um log cronológico de notas feitas durante a produção.
        CREATE TABLE producao_observacoes (
          id          TEXT PRIMARY KEY,
          empresa_id  TEXT NOT NULL,
          sessao_id   TEXT NOT NULL,
          texto       TEXT NOT NULL,
          usuario_id  TEXT NOT NULL,
          criado_em   TEXT NOT NULL
        );

        CREATE INDEX idx_producao_observacoes_sessao ON producao_observacoes (sessao_id);
      `);
    },
  },
  {
    version: 21,
    name: "add_produto_tamanho_to_producao_perdas",
    up: (db) => {
      db.exec(`
        -- Perda passa a ser registrada por tamanho da grade do produto
        -- (mesmo formato de grid da criação de ordem), não mais como um
        -- valor livre solto. Nullable pra não quebrar linhas já
        -- gravadas antes desta migration; tamanho é resolvido via join
        -- com produto_tamanhos na leitura (mesmo padrão de
        -- ordem_corte_itens), nunca desnormalizado.
        ALTER TABLE producao_perdas ADD COLUMN produto_tamanho_id TEXT;

        CREATE INDEX idx_producao_perdas_produto_tamanho ON producao_perdas (produto_tamanho_id);
      `);
    },
  },
];
