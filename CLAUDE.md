# Zenith Cutter MVP — Contexto do Projeto

## 0.0 - Modo de entrega de respostas no chat
Seja extremamente conciso e direto. Remova conversas fiadas, saudações e explicações longas. Vá direto ao ponto, mostre apenas o código essencial ou uma lista de tópicos (bullet points) quando apropriado.

## 1. O que é o sistema

Aplicativo desktop para Windows para gerenciamento do setor de **corte de confecções**,
controlando todo o fluxo operacional desde a criação da Ordem de Corte até sua conclusão.

- Opera **normalmente sem internet**, sincronizando com o Supabase quando houver conectividade.
- Foco em **simplicidade operacional, estabilidade e velocidade de uso**.
- Público-alvo: operadores de produção em ambiente industrial (não usuários técnicos).

## 2. Arquitetura (não alterar sem discussão explícita)

| Camada | Tecnologia |
|---|---|
| Plataforma | Desktop Windows |
| Interface | Electron + React + TypeScript + Vite |
| Estilo | Tailwind CSS + shadcn/ui |
| Banco local | SQLite |
| Banco em nuvem | Supabase PostgreSQL |
| Autenticação | Supabase Auth |
| Sincronização | Fila assíncrona SQLite ↔ Supabase |

Não introduza frameworks, bibliotecas de estado, ORMs ou padrões de arquitetura fora dessa
lista sem perguntar antes. Se uma tarefa parecer exigir isso, pare e explique o motivo antes
de implementar.

## 3. Princípios do produto — regras que TODO código deve respeitar

### 3.1 O operador sempre possui o controle
O sistema **nunca** executa ações operacionais automaticamente. Ele apenas:
valida, registra, informa, sincroniza.
Toda alteração operacional (iniciar, pausar, retomar, finalizar) exige **confirmação
explícita do usuário** — nunca gatilhos automáticos silenciosos.

### 3.2 Offline First
Toda informação é gravada **primeiro no banco local (SQLite)**.
A sincronização com Supabase é transparente e ocorre em segundo plano.
**Nunca** implemente uma feature que dependa de internet para funcionar. Se uma tarefa
parecer exigir chamada síncrona à rede no caminho crítico, pare e sinalize o conflito com
este princípio antes de codar.

### 3.3 Simplicidade operacional
Na dúvida entre adicionar uma funcionalidade ou simplificar o fluxo, **simplicidade vence**.
Evite abstrações genéricas desnecessárias ou telas com opções demais.

### 3.4 Representação fiel da fábrica
O software modela o fluxo real do setor de corte. Não usar conceitos genéricos como
"Kanban", "board", "workflow engine" etc. quando não refletirem a operação real descrita
abaixo.

### 3.5 Auditoria completa
Toda ação relevante (criação, edição, mudança de status, pausa, perda registrada,
observação) deve ser registrada de forma rastreável — usuário, timestamp, ação, dados
antes/depois quando aplicável.

### 3.6 Perfis de usuário e permissões
Três papéis (`usuarios.papel`), decisão de 2026-07-09:

| Área | Administrador | Supervisor | Operador |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Ordens de Corte | ✅ | ✅ | ❌ |
| Fila de Produção | ✅ | ✅ | ❌ |
| Produção (execução: iniciar/pausar/retomar/finalizar/perdas/observações) | ✅ | ✅ | ✅ |
| Cadastros — Clientes/Produtos/Tecidos/Mesas de Corte | ✅ | ✅ | ❌ |
| Cadastros — Usuários | ✅ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ |

Aplicado em duas camadas, nunca só uma (ver 3.1): navegação/UI
(`src/renderer/lib/navigation.ts`, `CadastrosPage.tsx` esconde a aba
Usuários para quem não é admin) **e** RLS no Supabase (função
`current_papel()`, ver `supabase/sql/0011_add_supervisor_role.sql`) —
um operador não acessa essas tabelas nem chamando a API diretamente.
Ao criar a Fila de Produção (Sprint 3) e a Produção/execução (Sprint
4), replicar a mesma regra nas novas tabelas.

## 4. Fluxo oficial da produção (state machine de referência)

```
Nova Ordem
  → Fila de Produção
    → Operador seleciona "Iniciar"
      → Seleciona uma Mesa Livre
        → Confirma
          → Em Corte
            → Pausar (opcional) → Retomar (opcional)
          → Finalizar
            → Conferência
              → Finalizada
```

Nenhuma etapa é iniciada automaticamente. Qualquer implementação de transição de estado
deve seguir exatamente essa sequência — sem pular etapas, sem atalhos automáticos.

## 5. Escopo do MVP

**Dentro do escopo:** autenticação, cadastros essenciais, Ordens de Corte, Fila de
Produção, Mesas de Corte, ciclo iniciar/pausar/retomar/finalizar, registro de perdas e
observações, histórico completo, offline + sync com Supabase.

**Multiempresa (isolamento de dados) — decisão de 2026-07-07:** o MVP roda múltiplas
empresas-cliente simultaneamente sobre a mesma infraestrutura Supabase, com isolamento
via RLS (toda tabela de negócio carrega `empresa_id`; políticas restringem cada usuário
aos dados da própria empresa). Cada usuário pertence a exatamente uma empresa
(`usuarios.empresa_id`). Provisionar uma empresa nova (+ seu primeiro administrador) é
uma operação de backend (Edge Function protegida por segredo, usada pelo time Zenith DEV
ao fechar um cliente novo) — **não** existe tela de auto-cadastro/signup público de
empresas no app, isso continua fora do escopo.

**Fora do escopo (não implementar, mesmo se parecer "fácil de adicionar"):**
Financeiro, Estoque, Compras, PCP, Custos, Engenharia de Produto, Etiquetas, Leitores de
código de barras, Integrações com ERPs, Inteligência Artificial, App Mobile, Relatórios
avançados, Planejamento automático, Balanceamento automático da fila. Também fora de
escopo dentro do próprio multiempresa: tela de auto-cadastro/signup de empresas, troca de
empresa dentro do app (um usuário pertence a uma única empresa), billing/cobrança por
empresa.

Se uma tarefa pedida se sobrepuser a um desses itens fora de escopo, avise antes de
implementar.

## 6. Roadmap (sprints)

- **Sprint 0 — Fundação:** estrutura Electron/React/TS/Vite, Tailwind, shadcn/ui, SQLite +
  migrations, Supabase, autenticação, sync básica, layout, navegação, build/instalador
  Windows, auto-update.
- **Sprint 1 — Cadastros:** Usuários, Clientes, Produtos, Tecidos, Mesas de Corte,
  configurações básicas, CRUD completo, validações.
- **Sprint 2 — Ordens de Corte:** criar/editar/cancelar/duplicar, consulta, filtros,
  pesquisa, status, entrada automática na fila, histórico.
- **Sprint 3 — Fila de Produção:** fila ordenada, prioridades, reordenação manual,
  visualização de mesas, seleção manual, confirmação de início, sessão de produção,
  bloqueio de mesas ocupadas.
- **Sprint 4 — Execução da Produção:** iniciar/pausar/retomar/finalizar, registro de
  perdas e observações, tempo de produção, liberação automática da mesa ao finalizar,
  histórico da sessão.
- **Sprint 5 — Dashboard Operacional:** visão de ordens por status, mesas livres/ocupadas,
  indicadores, filtros, pesquisa rápida.
- **Sprint 6 — Offline e Sincronização:** fila de sync, retry automático, detecção de
  internet, reconexão, resolução de erros, indicador de sync, logs, testes de perda de
  conexão.
- **Sprint 7 — Polimento e Publicação:** otimizações, tratamento de erros, instalador,
  auto-update, backup, documentação, RC → v1.0.

> Atualize a seção "Estado atual" abaixo conforme os sprints avançarem.

## 7. Estado atual

- Sprint em andamento: Sprint 2 — Ordens de Corte (criar/editar/
  cancelar/duplicar concluído; falta só a entrada automática na fila —
  depende da Fila de Produção do Sprint 3). Sprint 1 fica considerado
  encerrado por decisão do usuário em 2026-07-09, com "configurações
  básicas" deliberadamente adiada sem escopo definido (não é um item
  esquecido — foi pulado a pedido).
- Última entrega **2026-07-09**: número sequencial de Ordem de Corte
  (pedido do usuário). Sugerido automaticamente (maior número já usado
  na empresa + 1), editável na criação, imutável depois — nunca pode
  repetir dentro da mesma empresa, garantido por
  `UNIQUE(empresa_id, numero)` no banco (local e Supabase), não só
  validação de app. Migration local v13 (recria `ordens_corte`, mesmo
  padrão da v11) e `supabase/sql/0015_ordens_corte_numero.sql`
  (backfill sequencial das ordens já existentes) **aplicadas em
  produção e local, verificadas** (números batendo dos dois lados).
  Duplicar uma ordem sempre gera número novo. Exibido na lista (coluna
  "Nº", pesquisável), nos títulos de Info/Editar, e como campo
  editável no dialog de criação.
- Entrega anterior: PIN de confirmação antes de criar/
  editar/cancelar/duplicar uma Ordem de Corte (pedido do usuário,
  reforça 3.1 "operador sempre no controle"). Reusa a própria senha de
  login como PIN — sem cadastro separado. Validação 100% offline: hash
  SHA-256 da senha fica só em memória (`src/renderer/lib/pin.ts`,
  capturado no login/limpo no logout via `auth-context.tsx`), nunca em
  disco nem na rede — chamar o Supabase de novo pra validar (como o
  próprio login) quebraria o uso offline de Ordens de Corte; esse
  conflito com a seção 3.2 foi sinalizado e resolvido com o usuário
  antes de implementar. `usePinConfirm()` é um hook reutilizável
  (dialog + `Promise<boolean>`) plugado em `CreateOrdemCorteDialog`,
  `EditOrdemCorteDialog` e `OrdensCortePage`. Build/typecheck limpos.
  **Testado manualmente pelo usuário** (junto com a entrega do número
  sequencial, que só é testável criando/editando uma ordem — o que
  passa pelo PIN) — confirmado funcionando ("Funcionou.").
- Entrega anterior: histórico dedicado de Ordens de
  Corte (fecha o item que faltava do Sprint 2). Nova tabela
  `ordem_corte_historico` (migration local v12 +
  `supabase/sql/0014_ordem_corte_historico.sql`, RLS admin/supervisor
  igual `ordens_corte` — aplicada em produção) registra criação,
  edição, mudança de status, cancelamento e duplicação, cada uma com
  usuário + timestamp + descrição (CLAUDE.md 3.5). `registrarHistorico()`
  em `ordensCorte.ts` é chamado de dentro das mesmas transações de
  create/update/duplicate; `usuario_id` passa a ser parâmetro explícito
  dessas funções (IPC/preload atualizados) porque o processo main não
  tem noção de sessão — só o renderer sabe quem está logado. Exibido
  como seção "Histórico" dentro do dialog "Info" já existente (sem
  tela nova). Sincroniza pela mesma `sync_queue`/`runSync()` das outras
  tabelas. Build/typecheck limpos. Não foi testado manualmente no
  momento da entrega (a tentativa de automação de tela foi
  interrompida ao perceber que a janela em foreground era outro
  aplicativo do usuário, não o Zenith Cutter — parei para não
  interferir), mas **foi testado depois pelo usuário**, junto com o
  PIN e o número sequencial, e confirmado funcionando.
- Entrega anterior: motor mínimo de sincronização (núcleo do
  Sprint 6, adiantado a pedido do usuário — havia ~83 alterações
  locais nunca enviadas ao Supabase, acumuladas desde o início do
  projeto porque nada processava a `sync_queue` ainda).
  `src/renderer/lib/sync.ts` (`runSync()`) lê a fila pendente
  (`window.zenith.sync.listPending`, IPC novo em
  `electron/main/sync/queue.ts` + `electron/main/ipc/index.ts` +
  `electron/preload/index.ts`), processa em ordem cronológica (FIFO
  por id — respeita dependências de FK sem precisar de sort por
  tabela) e faz upsert/update/delete no Supabase por item, isolando
  falhas (uma linha com erro não trava as demais; depois de 5
  tentativas falhas vira `status='error'`, senão volta pra `pending`
  e tenta de novo na próxima sincronização). Disparado automaticamente
  logo após o login (`auth-context.tsx`) e por um botão "Sincronizar
  agora" no `SyncStatusCard` (Dashboard). Testado ponta a ponta em
  produção: as 83 alterações pendentes foram enviadas com sucesso
  (verificado por contagem direta nas tabelas do Supabase).
  **O que NÃO foi implementado** (continua Sprint 6 de verdade):
  detecção de rede/reconexão automática, backoff entre tentativas,
  log de sincronização visível pro usuário, testes de perda de
  conexão. `ordens_corte` tem um caso especial: o payload de update
  pode conter `itens` (não é coluna da tabela — os itens da grade
  viajam como entradas próprias em `ordem_corte_itens`), removido
  antes do envio em `sanitizePayload()`.
- Última entrega: **papel Supervisor + matriz de permissões** (ver
  seção 3.6). `PapelUsuario` ganhou `"supervisor"`; navegação e RLS
  atualizados. `supabase/sql/0011_add_supervisor_role.sql` (CHECK de
  papel + `current_papel()` + RLS de
  clientes/produtos/tecidos/mesas_corte/produto_tamanhos/ordens_corte/
  ordem_corte_itens) e migration local v11 (recria a tabela `usuarios`
  — SQLite não permite ALTER de CHECK) **aplicadas em produção e
  local** (2026-07-09).
- Correção **2026-07-09**: ao testar o papel Supervisor em produção,
  achados dois bugs. 1) A Edge Function `create-usuario` nunca tinha
  sido atualizada para o novo papel — forçava qualquer valor diferente
  de `administrador` para `operador` (por isso um usuário criado como
  "Supervisor" nascia com `papel='operador'`); corrigida e redeployada.
  2) Achado maior, sem relação com o pedido original: a tabela
  `clientes` em produção **nunca tinha ganhado `empresa_id`** — ficou
  para trás quando a decisão de multiempresa (2026-07-07) retrofitou
  `usuarios` via `0003_empresas_multi_tenant.sql` mas não `clientes`;
  RLS ficava aberta (`using(true)/check(true)`), sem isolamento entre
  empresas. Como só havia 1 empresa e 0 linhas em `clientes` em
  produção, o backfill foi trivial e sem perda de dado. Corrigido com
  nova migration `supabase/sql/0012_clientes_empresa_id_retrofit.sql`
  (aplicada em produção antes da 0011, que já pressupunha a coluna).
  Usuário de teste `Supervisor de Teste` corrigido manualmente para
  `papel='supervisor'`.
- Entrega anterior: **Ordens de Corte** (Sprint 2). Cada ordem tem
  cliente, produto, tecido, observações, status (`aberta` / `em_fila`
  / `cancelada`) e itens de quantidade por tamanho da grade do produto
  escolhido (`ordem_corte_itens`). Sem DELETE físico da ordem —
  cancelar é só mudar o status; editar os itens da grade apaga e
  regrava tudo (simplicidade, nunca são muitos itens). Página
  `OrdensCortePage.tsx` (lista com pesquisa por cliente/produto/tecido
  + filtro por status, ações duplicar/cancelar/editar) substituiu o
  placeholder da nav "Ordens de Corte". Migration local aplicada;
  `supabase/sql/0010_ordens_corte.sql` (RLS por empresa) **pendente de
  execução manual** no SQL Editor.
- Entrega anterior: **login por nome de usuário, não e-mail**. Novo
  campo `usuarios.login` (username único, `NOT NULL` em produção). A
  tela de login pede "Usuário" (login) + senha; o app resolve
  login → email via `resolve_login_email()` (função `security
  definer`, executável por `anon`) antes de chamar
  `signInWithPassword` — Supabase Auth só aceita email/phone
  internamente, então isso continua por baixo dos panos. Cadastro de
  usuário (Cadastros > Usuários) continua exigindo e-mail normalmente,
  além do novo campo Login. Aplicado em produção: migration
  `supabase/sql/0009_usuarios_login.sql`, redeploy da Edge Function
  `create-usuario` (grava login também), e — a pedido explícito do
  usuário — **excluída a conta TESTER 01**, mantendo só o admin
  `rafaelfsantosmk5@gmail.com` (login definido como `ZNTOWR`).
- Entrega anterior: **grade de tamanhos no cadastro de Produtos**. Cada
  produto tem uma lista de tamanhos (`produto_tamanhos`) onde o
  tamanho é texto livre digitado pelo usuário (não um enum fixo — cada
  produto pode ter uma grade diferente, ex.: P/M/G ou numérica) e a
  ordem é controlada pelo próprio usuário (botões mover para
  cima/baixo na tabela, que reescrevem `ordem` sequencialmente).
  Acessível pelo botão "Grade" na linha de cada produto em Cadastros >
  Produtos (`ProdutoGradeDialog.tsx`). Mesmo padrão offline-first e de
  soft-delete das demais tabelas (sem DELETE físico — remover um
  tamanho é `ativo = false`). Migration local v8 já aplicada; migration
  Supabase `supabase/sql/0008_produto_tamanhos.sql` (RLS escopado por
  empresa) ainda **pendente de execução manual** no SQL Editor.
- Entrega anterior: **Cadastro de Tecidos e Mesas de Corte** — mesmo
  padrão offline-first de Clientes/Produtos (id gerado no app, grava
  local primeiro, sem DELETE físico). Tecido: nome, composição, cor.
  Mesa de Corte: nome/identificação, observações — estado de ocupação
  (livre/ocupada) é conceito da Fila de Produção (Sprint 3), não faz
  parte deste cadastro. Abas "Tecidos" e "Mesas de Corte" adicionadas
  em Cadastros. Migrations locais v6/v7 e migrations Supabase
  `0004_produtos.sql`, `0006_tecidos.sql` e `0007_mesas_corte.sql`
  todas aplicadas em produção (confirmado 2026-07-09 via
  `information_schema.tables`) — RLS escopado por empresa em todas.
- Correção anterior: **bug de produção — trava do único administrador**.
  Sintoma relatado: login carregava a tela inicial e voltava sozinho
  para a tela de login. Causa: o único usuário `administrador` da
  empresa estava com `ativo = false` no Supabase (origem exata não
  identificada); o app força `signOut()` quando o perfil vem inativo
  (comportamento intencional, ver `auth-context.tsx`). Agravante: não
  havia como reverter pela própria tela, porque a policy de UPDATE de
  `usuarios` exige `is_admin()`, que por sua vez exige `ativo = true`
  — ou seja, o único admin de uma empresa que fica inativo (por
  engano ou não) trava permanentemente, sem autorrecuperação. Corrigido
  em produção: 1) `UPDATE usuarios SET ativo = true` no registro
  afetado (com autorização explícita do usuário, via
  `npx supabase db query --linked`); 2) nova migration
  `supabase/sql/0005_prevent_last_admin_lockout.sql` (trigger
  `usuarios_prevent_last_admin_lockout`, já aplicada em produção)
  bloqueia no próprio Postgres qualquer UPDATE que desative ou rebaixe
  o último administrador ativo restante de uma empresa.
- Entregas mais antigas do sprint: **Cadastro de Produtos** — mesmo padrão de
  Clientes (100% offline-first, id gerado no app via
  `crypto.randomUUID()`, grava local primeiro, sem DELETE físico).
  Campos: nome, código/referência, descrição, ativo. Aba "Produtos"
  adicionada em Cadastros. Migration local v5 (`create_produtos`) já
  aplicada; migration Supabase `supabase/sql/0004_produtos.sql` criada
  com RLS escopado por empresa desde a criação da tabela (segue o
  molde de `0002_clientes.sql`) — **pendente de execução manual** no
  SQL Editor do Supabase pelo usuário (mesma rotina já usada para
  0001/0002/0003).
- Entrega anterior: restrição de navegação por papel — o
  Sidebar e o `App.tsx` usam `getAllowedNavItems()`
  (`src/renderer/lib/navigation.ts`) para filtrar as páginas visíveis
  conforme `usuario.papel`. Administrador vê tudo (Dashboard, Fila de
  Produção, Ordens de Corte, Cadastros, Configurações); operador vê
  somente Fila de Produção e Ordens de Corte. É proteção só de UI —
  a proteção real dos dados continua sendo o RLS do Supabase,
  independente do que a navegação mostra ou esconde. Se o papel do
  usuário mudar e a página atual deixar de ser permitida, o `App.tsx`
  redireciona automaticamente para a primeira página permitida.
- Fundação do sprint: **multiempresa (multi-tenant) retrofit completo e
  rodado em produção** — decisão de 2026-07-07 (ver seção 5). Toda
  tabela de negócio carrega `empresa_id`; RLS isola cada usuário aos
  dados da própria empresa via função `security definer`
  `current_empresa_id()` (evita recursão de RLS). Migrations
  aplicadas: `supabase/sql/0001_usuarios.sql`,
  `supabase/sql/0002_clientes.sql` (já nasceu com `empresa_id NOT
  NULL` e políticas escopadas por empresa) e
  `supabase/sql/0003_empresas_multi_tenant.sql` (cria tabela
  `empresas`, adiciona `empresa_id` a `usuarios` com backfill,
  substitui as policies antigas de `usuarios` — que vazavam entre
  empresas — por versões escopadas por empresa). Provisionamento de
  empresa nova é feito pela Edge Function `create-empresa`
  (`supabase/functions/create-empresa/`), protegida por segredo
  compartilhado (`x-provisioning-secret` / secret
  `EMPRESA_PROVISIONING_SECRET`, já configurado no projeto Supabase);
  cria a empresa + o primeiro admin em uma única chamada, sem
  depender de autenticação prévia. A Edge Function `create-usuario`
  foi atualizada para sempre herdar o `empresa_id` de quem está
  criando o novo usuário.
- Cadastro de Clientes: 100% offline-first (id gerado no app via
  `crypto.randomUUID()`, grava local primeiro, sem nenhuma etapa
  online — diferente de Usuários, que é criação online-only via Edge
  Function). Sem DELETE físico em nenhum cadastro (só `ativo =
  false`). Cadastros tem abas (Usuários | Clientes) via shadcn Tabs.
- Cadastro de Usuários: completo e testado ponta a ponta — tabela
  `public.usuarios` no Supabase (RLS, trigger de perfil automático,
  `is_admin()`), Edge Function `create-usuario` (cria login + perfil,
  admin-only), cache local em SQLite com fila de sincronização para
  edições offline.
- Gotcha operacional importante: o atalho da Desktop aponta para
  `release/win-unpacked/Zenith Cutter.exe`, um **build estático**
  (snapshot de quando `npm run build:win` rodou pela última vez — o
  Vite grava `.env` no bundle em tempo de build, não lê em runtime).
  Sempre rodar `npm run build:win` de novo após mudar `.env` ou
  código antes de testar "o app instalado de verdade"; fechar o app
  primeiro (senão dá `EBUSY`). Ver memória
  `feedback_rebuild_packaged_app.md`.
- Bloqueios conhecidos:
  - Auto-update sem provider configurado (bucket de releases no
    Supabase Storage ainda não existe); `build.publish` precisa ser
    adicionado ao `package.json` quando o bucket existir.

## 8. Convenções de código

_(preencher conforme forem definidas: nomenclatura, estrutura de pastas, estilo de
testes etc. — adicione aqui à medida que o projeto avança para que fiquem fixadas entre
sessões.)_

### 8.1 Commits

A cada alteração feita no código (arquivo criado, editado ou removido), deve ser feito
commit imediatamente, com mensagem descritiva explicando a alteração. Não acumular
várias alterações não relacionadas em um único commit.

### 8.2 Encerramento de sessão

Quando o usuário der o comando **"Finalizar sessão de hoje"**, antes de encerrar:

1. Atualizar a seção 7 (Estado atual) deste CLAUDE.md com o que foi entregue na sessão,
   o que ficou pendente e quaisquer bloqueios novos.
2. Atualizar a memória automática (arquivos em
   `C:\Users\mafio\.claude\projects\c--Users-mafio-Desktop-ZENITH-DEV-Zenith-Cutter\memory\`):
   criar/atualizar memórias de `feedback` (correções ou confirmações de abordagem),
   `project` (decisões e estado de trabalho em andamento) ou `reference` conforme o que
   surgiu na sessão, e manter o índice `MEMORY.md` em dia.
3. Conferir se há commits pendentes (`git status`) e commitar qualquer alteração ainda
   não salva, seguindo a regra 8.1.
4. Confirmar ao usuário, em poucas linhas, o que foi atualizado e qual é o próximo passo
   natural para a retomada.
