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

Exceções já aprovadas (pontuais, não abrem precedente geral): `jspdf` +
`jspdf-autotable` e `exceljs`, usadas só pela exportação dos
relatórios (seção 7, decisão de 2026-07-16) — `exceljs` no lugar de
`xlsx` porque a `xlsx` do npm tem vulnerabilidades sem correção
disponível (SheetJS parou de publicar patches nesse registro). E
`recharts`, usada nos gráficos do Dashboard (seção 7, decisão de
2026-07-16, mesmo dia — pedido do usuário reabriu a decisão de "sem
gráficos" tomada horas antes na entrega do Relatório de Produção).

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
| Produção (fila + execução: iniciar/avançar etapa/pausar/retomar/finalizar/perdas/observações) | ✅ | ✅ | ✅ |
| Cadastros — Clientes/Produtos/Tecidos/Mesas de Corte | ✅ | ✅ | ❌ |
| Cadastros — Usuários | ✅ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ |

Aplicado em duas camadas, nunca só uma (ver 3.1): navegação/UI
(`src/renderer/lib/navigation.ts`, `CadastrosPage.tsx` esconde a aba
Usuários para quem não é admin) **e** RLS no Supabase (função
`current_papel()`, ver `supabase/sql/0011_add_supervisor_role.sql`) —
um operador não acessa essas tabelas nem chamando a API diretamente.

Decisão de 2026-07-14 (pedido do usuário): a página dedicada "Fila de
Produção" foi removida por ser redundante — a página "Produção" já
mostrava a mesma fila. A reordenação manual de prioridade continua
exclusiva de administrador/supervisor, mas agora dentro da própria
página Produção (gate por papel no componente, não por rota/nav
separada); Operador vê a fila só como lista (sem os botões de mover).

## 4. Fluxo oficial da produção (state machine de referência)

```
Nova Ordem
  → Fila de Produção
    → Operador seleciona "Iniciar"
      → Seleciona uma Mesa Livre
        → Confirma
          → Em Corte
            → Pausar (opcional) → Retomar (opcional)
          → Avança etapa (finaliza a sessão, libera a mesa)
            → Embalagem
              → Avança etapa
                → Revisão
                  → Avança etapa
                    → Despacho
                      → Avança etapa
                        → Pronto
```

Decisão de 2026-07-11 (pedido do usuário): o par "Finalizar → Conferência →
Finalizada" foi substituído por 4 etapas mais granulares pós-corte — Embalagem,
Revisão (mesmo papel da antiga "Conferência"), Despacho, Pronto —, cada uma
avançada manualmente uma de cada vez (nunca pulando etapa, sempre com
confirmação explícita — reforça 3.1). Mesa de corte só existe durante "Em
Corte": ao avançar para Embalagem a sessão de produção é finalizada e a mesa
libera automaticamente; dali em diante a ordem não usa mais mesa. Uma ordem
nunca é atribuída a mais de uma mesa — garantido no banco pelo índice único
parcial de `sessoes_producao.ordem_id` (sessão ativa), não só por validação de
app (ver seção 7).

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

Exceção pontual (decisão de 2026-07-16, pedido explícito do usuário): o
**Relatório de Produção** (seção 7) foi implementado como um recorte
enxuto de "Relatórios avançados" — filtros, KPIs, tabela e exportação
CSV/Excel/PDF, sem gráficos (decisão explícita de adiar, sem
biblioteca de gráficos aprovada ainda). "Relatórios avançados" no
sentido amplo (múltiplos relatórios, dashboards analíticos, gráficos)
continua fora de escopo até nova decisão.

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

- **2026-07-18** — **teste ponta a ponta do auto-update em andamento**.
  Versão `1.1.2` publicada no bucket `releases`
  (`Zenith-Cutter-Setup-1.1.2.exe` + `.blockmap` + `latest.yml`), com
  um marcador temporário de teste — o app abre em tela cheia
  automaticamente (`electron/main/index.ts`, `setFullScreen(true)` no
  `ready-to-show`) — só pra confirmar visualmente que uma instalação
  anterior detecta/baixa/aplica a atualização. **Reverter esse
  marcador depois que o teste confirmar o fluxo** (não é uma decisão
  de produto, só instrumentação de teste).
  No caminho, achado um bloqueio de infraestrutura não previsto: o
  bucket `releases` não tinha `file_size_limit` próprio (`null` = usa
  o teto global do projeto Supabase, que por padrão é 50MB mesmo no
  plano pago) — o instalador tem ~134MB (Chromium embutido). Corrigido
  em 2 passos, ambos em produção com autorização do usuário: 1)
  `UPDATE storage.buckets SET file_size_limit = 262144000 WHERE
  id='releases'` (250MB); 2) usuário fez upgrade pro plano Pro do
  Supabase e ajustou manualmente o "Global file size limit" pra 250MB
  no painel (Settings > Storage — não é automático com o upgrade de
  plano, é um campo separado). **Fica registrado pra referência
  futura**: qualquer artefato de release perto ou acima de 50MB vai
  precisar desses dois limites configurados antes de publicar.
  **Falta o usuário confirmar** que uma instalação anterior detecta a
  atualização, baixa em segundo plano, mostra o toast "Reiniciar e
  atualizar" e, depois de fechar/reabrir, abre já em tela cheia
  (confirmando que a v1.1.2 foi aplicada de verdade).
- **2026-07-18** — usuário confirmou: **todas as migrations Supabase
  pendentes foram executadas em produção** (inclui `0030`/`0031`/`0032`,
  as 3 correções de segurança da auditoria de hoje) e **validação
  manual completa** de tudo que estava marcado "não testado" nas
  entregas anteriores desta sessão (Sprints 4 a 7 inteiros: execução de
  produção/pipeline pós-corte, todos os relatórios, Dashboard, sync
  engine, backup/restore, microinterações, e as 14 correções de
  segurança de hoje). Fecha os dois maiores bloqueios pra considerar o
  MVP pronto pra venda. **Bloqueios restantes, não relacionados a
  código**: sem certificado de assinatura (SmartScreen do Windows no
  instalador — decisão de custo do usuário); auto-update nunca testado
  ponta a ponta (precisa publicar uma v2 de teste); RC → v1.0 (bump de
  versão + tag) ainda não feito.
- Correção **2026-07-18**: **6 achados baixos da auditoria completa**
  (pedido do usuário, sequência dos médios corrigidos antes).
  1. **`ordem_corte_itens.quantidade` sem `CHECK > 0` no schema
     local**: Supabase já tinha (0010); migration local v25 recria a
     tabela com o CHECK, mesmo padrão de `ordens_corte`.
  2. **Gravações fora de `db.transaction()`**: `recordSyncLog`
     (insert+delete do log de sync) e
     `registrarProducaoPerdaLocal`/`registrarProducaoObservacaoLocal`
     (insert+enqueueChange) agora envolvidos, mesmo padrão do resto
     dos repositórios.
  3. **PIN sem limite de tentativas**: `src/renderer/lib/pin.ts` ganhou
     bloqueio de 30s depois de 5 tentativas erradas seguidas (contador
     reseta a cada login/logout); `usePinConfirm.tsx` mostra o tempo
     restante quando bloqueado.
  4. **`sandbox: false` sem justificativa**: virou `true` — o preload
     só usa `contextBridge`/`ipcRenderer`, sem módulo Node direto, não
     quebra nada.
  5. **Sem CSP**: nova `Content-Security-Policy` (`default-src 'self'`,
     sem eval/inline script) aplicada via
     `session.defaultSession.webRequest.onHeadersReceived`, só quando
     `app.isPackaged` — deliberadamente fora do `index.html`, pra não
     arriscar quebrar o HMR/websocket do `npm run dev`.
  6. **Mensagens de erro de login diferentes revelavam se o login
     existia**: `auth-context.tsx` repassava `error.message` (inglês,
     direto do Supabase) só no caso de senha errada, diferente da
     mensagem genérica de login inexistente. Unificado pra "Login ou
     senha inválidos." nos dois casos.
  `npm run build` (typecheck + vite build, main/preload/renderer)
  limpo a cada commit (6 commits). Migration local v25 aplica sozinha
  na próxima abertura do app (padrão de sempre, sem ação manual).
  **Deliberadamente fora desta rodada** (achado real, mas escopo bem
  maior que os demais — pausado pra perguntar ao usuário antes):
  `PRAGMA foreign_keys = ON` é um no-op no schema **local** porque
  nenhuma das 25 migrations do SQLite declara `REFERENCES` (o Postgres
  já declara em todas as tabelas desde o início — isso é só uma lacuna
  do banco local/cache). Corrigir de verdade exigiria recriar a maioria
  das ~15 tabelas de negócio pra adicionar as FKs, um retrofit bem mais
  arriscado (mexe no schema inteiro) que os itens acima.
- Correção **2026-07-18**: **5 achados médios da auditoria completa**
  (pedido do usuário, sequência dos 3 críticos corrigidos antes).
  1. **RLS de `ordens_corte` sem trava por coluna pro Operador**: mesma
     classe do achado de `sessoes_producao` — a policy de UPDATE (0020)
     só valida o valor final de `status`. Migration
     `supabase/sql/0032_ordens_corte_operador_restringe_colunas.sql`
     (trigger, mesmo padrão da 0031) trava tudo exceto
     `status`/`atualizado_em` pra quem loga como `operador`.
  2. **Gate de admin/supervisor só existia na UI**: reordenar a fila
     (`reorderFilaProducaoLocal`) e atribuir mesa
     (`atribuirMesaFilaLocal`) só eram bloqueados em `ProducaoPage.tsx`
     — um Operador via DevTools conseguia gravar na base local mesmo
     assim. Novo `requireAdminOuSupervisor()` em
     `electron/main/db/repositories/usuarios.ts` repete a checagem na
     camada de repositório; `reorderFilaProducaoLocal` ganhou o
     parâmetro `usuarioId`, propagado por todo o caminho IPC/preload/
     renderer (`filaProducao.reorderLocal`).
  3. **Restauração de backup sem `integrity_check` nem rede de
     segurança**: `isValidBackupFile` (`electron/main/backup.ts`) só
     conferia a existência da tabela `schema_migrations`; agora também
     roda `PRAGMA integrity_check`. `restoreBackup` passou a tirar um
     hot backup do banco vivo (mesma API do `runBackup`) antes de
     sobrescrever, salvo como `<banco>.pre-restore-<timestamp>.bak`.
  4. **Comparação do segredo de `create-empresa` não era em tempo
     constante**: `providedSecret !== expectedSecret` trocado por
     comparação XOR acumulada (`segredoConfere()`), que nunca retorna
     cedo por causa de um byte específico.
  `npm run typecheck` limpo a cada commit (4 commits). Migrations
  `0032` (junto com `0030`/`0031` da rodada anterior) **pendentes de
  execução manual** no SQL Editor do Supabase. Achados baixos da
  mesma auditoria (`foreign_keys=ON` sem nenhuma `REFERENCES`
  declarada no schema **local** — Postgres já declara; `CHECK` faltando
  em `ordem_corte_itens.quantidade` no schema local; algumas
  gravações fora de `db.transaction()`; PIN sem limite de tentativas;
  `sandbox:false` sem justificativa; mensagem de erro de login
  diferenciando login-inexistente de senha-errada) **continuam
  registrados, não corrigidos** — fica pra decidir com o usuário.
- Correção **2026-07-18**: **3 achados críticos da auditoria completa**
  (pedido do usuário — "Finalizamos o MVP. Confira todo o projeto...
  procure por erros de segurança, breackpoints e etc.", rodada com 3
  subagentes paralelos: frontend, backend/dados, segurança/multi-tenant).
  1. **Motor de sync podia travar pra sempre**:
     `src/renderer/lib/syncManager.ts` `syncNow()` só protegia a chamada
     de `runSync()` com try/catch — se `logRecord`/`refreshCounts`
     falhassem depois, `syncing` ficava `true` permanentemente,
     congelando o indicador do header e desligando o motor até reiniciar
     o app. Corrigido: todo o corpo depois de `setState({syncing:true})`
     entrou num `try/finally`, que agora **sempre** libera `syncing`,
     tenta atualizar contadores e reagenda o próximo ciclo, não importa
     o que falhe no meio.
  2. **Histórico de ações do Operador nunca chegava no Supabase**: a
     policy de INSERT de `ordem_corte_historico` (0014) só permitia
     administrador/supervisor, mas `registrarHistorico()` também é
     chamado pra ações de Operador (iniciar/avançar etapa/pausar/
     retomar — Produção é acessível a todos os papéis, 3.6). Toda
     entrada criada por Operador ficava presa na fila local, esgotava
     as 5 tentativas e virava erro permanente — a maior parte da
     atividade real do chão de fábrica nunca chegava na cópia auditável
     da nuvem (quebra 3.5). Corrigido: migration
     `supabase/sql/0030_ordem_corte_historico_insert_operador.sql`
     estende o INSERT pra incluir `operador` (SELECT continua só
     administrador/supervisor — a tela que exibe é exclusiva deles).
  3. **RLS de `sessoes_producao` não travava coluna por coluna**: a
     policy de UPDATE do Operador (0025) só valida o valor final de
     `status` — via API direta, um Operador podia reescrever
     `iniciado_por` ou `mesa_id` de qualquer sessão da empresa,
     reatribuindo autoria/mesa de uma sessão que não é dele. Corrigido:
     migration
     `supabase/sql/0031_sessoes_producao_operador_restringe_colunas.sql`,
     trigger (mesmo padrão de `0005_prevent_last_admin_lockout.sql`)
     torna `empresa_id`/`ordem_id`/`mesa_id`/`iniciado_por`/
     `iniciado_em`/`criado_em` imutáveis depois do INSERT, pra qualquer
     papel — conferido que nenhum caminho legítimo do app jamais muda
     essas colunas; deliberadamente não restringido a
     `iniciado_por = auth.uid()` porque o app permite handoff entre
     operadores (um avança/finaliza sessão iniciada por outro).
  **Migrations 0030 e 0031 pendentes de execução manual** no SQL Editor
  do Supabase (mesma rotina de sempre). `npm run typecheck` limpo.
  Achados médios/baixos da mesma auditoria (RLS de `ordens_corte`
  Operador com o mesmo gap de coluna; gate de reordenar
  fila/atribuir mesa só na UI, não no repositório; restauração de
  backup sem `PRAGMA integrity_check`; `foreign_keys=ON` sem nenhuma
  `REFERENCES` declarada; comparação não constant-time no segredo de
  `create-empresa`; `CHECK` faltando em `ordem_corte_itens.quantidade`;
  algumas gravações fora de `db.transaction()`; PIN sem limite de
  tentativas; `sandbox:false` sem justificativa; mensagem de erro de
  login diferenciando login-inexistente de senha-errada) **ficaram
  registrados mas não corrigidos nesta rodada** — não pedidos
  explicitamente, fica pra decidir com o usuário se/quando corrigir.
- Entrega **2026-07-18**: **auto-update com provider configurado**
  (pedido do usuário — "precisamos do instalador, e atualizador
  automático"). Instalador já funcionava de ponta a ponta desde o
  Sprint 0 (confirmado na auditoria do Sprint 7) — nenhum código novo
  ali. Auto-update: o lado cliente também já existia desde o Sprint 0
  (`electron/main/updater.ts`, `UpdateNotifier.tsx`) — só faltava
  onde hospedar os arquivos, o bloqueio conhecido registrado
  anteriormente. Decisão com o usuário: **bucket público `releases`
  no Supabase Storage** (criado via SQL,
  `insert into storage.buckets`), não GitHub Releases — o repositório
  é privado (`gh repo view` confirmou), e o provider "github" do
  electron-updater pra repo privado exigiria embutir em todo app
  instalado um token de leitura do repo, extraível por qualquer
  cliente com o instalador (exporia o código-fonte privado da
  Zenith DEV). `package.json` ganhou `build.publish` (provider
  `generic`, aponta pro bucket) e `nsis.artifactName` fixo com traço
  (`${productName}-Setup-${version}.${ext}`) — o `latest.yml` que o
  electron-builder gera já referenciava esse formato, então fixar o
  nome evita inconsistência entre o `.exe` local e a URL que o
  auto-updater instalado vai buscar. Novo `scripts/publish-release.js`
  (script Node simples, usa `@supabase/supabase-js` — já era
  dependência, nenhuma lib nova) sobe `latest.yml`/`.exe`/`.blockmap`
  de `release/` pro bucket via `SUPABASE_SERVICE_ROLE_KEY` (novo, só
  nesse script — nunca lido pelo app em si, sem prefixo `VITE_`); novo
  script npm `release:publish`. README ganhou o fluxo de release
  (bump de versão → `build:win` → `release:publish`). Build/typecheck
  limpos. **Teste ponta a ponta do auto-update (instalar, publicar
  versão nova, confirmar detecção) ainda não foi feito** — precisa de
  duas versões empacotadas diferentes, fica pro usuário rodar quando
  quiser testar de verdade.
- Entrega **2026-07-18**: **"peças" no lugar de "ordens" no Dashboard
  e nos Relatórios** (pedido do usuário — "use número de peças no
  lugar de Ordens, quando fizer sentido"). Ambiguidade resolvida com 2
  perguntas antes de codar: escopo completo (incluindo mudança de
  backend) em vez de só o que já dava pra fazer sem tocar a consulta,
  e métricas de "ordem com problema" (ex. "Atrasadas") continuam
  contando ordens, não peças — só métricas de volume/produtividade
  converteram. `RelatorioProducaoLinha` ganhou `quantidade_total`
  (`electron/main/db/repositories/relatorios.ts`, subquery contra
  `ordem_corte_itens`, mesmo padrão já usado em `OrdemCorteResumo` —
  sem migration). Convertido: Dashboard ("Distribuição de Ordens por
  Status" → "...de Peças...", "Produção dos Últimos 30 Dias", card de
  resumo inteligente — exceto a frase de atrasadas); Relatório de
  Produção (KPIs Total/Concluídas/Em Andamento, mantendo Atrasadas);
  Relatório de Clientes (KPIs, coluna e gráfico "Ordens por Cliente" →
  "Peças por Cliente", "Atividade de Clientes" por peças encomendadas);
  Relatório de Operadores (KPIs, colunas Concluídas/Em Andamento,
  gráfico "Ordens por Operador" → "Peças por Operador",
  "Produtividade Diária"). Gráficos renomeados de arquivo pra
  acompanhar o conteúdo: `OrdensPorClienteChart.tsx` →
  `PecasPorClienteChart.tsx`, `OrdensPorOperadorChart.tsx` →
  `PecasPorOperadorChart.tsx`. **Deliberadamente NÃO convertido**: o
  Relatório de Materiais (KPI "Total de Ordens", coluna "Ordens",
  gráfico "Materiais Mais Usados") — já tem "Total de Peças
  Produzidas"/coluna "Peças Produzidas"/gráfico "Consumo de Material"
  medindo volume; converter os primeiros também criaria métricas
  duplicadas com valor idêntico, então mantidos como contagem de
  ordens (visão de "quantas ordens usaram este material", distinta de
  volume) — desvio não perguntado ao usuário antes, sinalizar se
  quiser revisão. Histórico de Ordens e a seção "Ordens" do Relatório
  de Produção também não mudaram — são listas de linhas de ordem, não
  métricas de contagem. Build e `npm run typecheck` limpos a cada
  commit (6 commits: backend + Dashboard + Produção + Clientes +
  Operadores). **Não testado manualmente ainda**.
- Entrega **2026-07-18**: **Sprint 7 — Polimento e Publicação**,
  entregue em 5 frentes sequenciais (decisão com o usuário: uma de
  cada vez, não tudo numa leva). **Auto-update fica adiado** (bloqueio
  conhecido — falta o bucket de releases no Supabase Storage, decisão/
  infra do usuário) e **instalador** não precisou de código (auditoria
  confirmou que o electron-builder/NSIS já configurado desde o Sprint
  0 já cobre tudo — ícone, diretório customizável, atalhos,
  `deleteAppDataOnUninstall` no padrão seguro que não apaga o banco
  local; única lacuna registrada é a ausência de certificado de
  assinatura de código, que vai disparar o SmartScreen do Windows no
  primeiro uso — decisão de custo do usuário, fora de escopo de
  código). As 4 frentes de código/documentação:
  1. **Tratamento de erros**: `ErrorBoundary.tsx` (só class component
     pega erro de render em React) troca tela branca por uma tela de
     recuperação com botão "Recarregar"; `window.onerror`/
     `unhandledrejection` cobrem erro assíncrono fora do ciclo de
     render. `electron/main/log.ts` centraliza o `electron-log` (já
     era dependência, só usado em `updater.ts`) como logger global do
     processo main e liga `errorHandler.startCatching()` — exceção não
     tratada no main agora vira log em arquivo em vez de derrubar o
     app sem rastro (dói especialmente porque bugs de produção
     anteriores só foram diagnosticáveis via query direta no banco,
     ver `feedback_production_db_debugging.md`). `render-process-gone`
     também logado. Tudo isso reporta pro log via IPC novo
     `log:report-error`.
  2. **Backup local**: botão em Configurações abre diálogo nativo de
     salvar arquivo e roda `getDb().backup(destino)` — API nativa do
     `better-sqlite3` (hot backup), não uma cópia crua do `.sqlite`,
     que podia perder dado ainda no WAL (o banco roda em
     `journal_mode = WAL`). Entrega original só cobria "salvar" — o
     usuário perguntou como funcionava a restauração e não havia
     nenhuma, então virou uma 2ª rodada na mesma frente:
     **restaurar backup**, atrás de confirmação por PIN (é destrutivo,
     substitui o banco local inteiro — CLAUDE.md 3.1). Main valida que
     o arquivo escolhido é um backup de verdade (checa a tabela
     `schema_migrations`), fecha a conexão viva
     (`electron/main/db/index.ts` ganhou `closeDb()`), remove sidecars
     de WAL do banco atual, copia o backup por cima e reabre — mas
     ainda pede reinício manual do app depois (decisão explícita: nada
     de `app.relaunch()` automático, o estado em memória do React
     ficaria inconsistente com o banco trocado embaixo dele, e reforça
     3.1 — nenhuma ação automática silenciosa). Decisão do usuário:
     dado sincronizado depois do backup pode ser perdido/reintroduzido
     ao restaurar — aceitável como cenário de recuperação de desastre,
     a sincronização seguinte resolve as diferenças.
  3. **Otimizações**: as 6 páginas de `App.tsx` viraram
     `React.lazy()`/`Suspense` em vez de import estático — o chunk
     inicial (tudo que carrega antes de qualquer página abrir) caiu de
     **2,49 MB para ~205 KB**. `recharts` só entra quando
     Dashboard/Relatórios abre; `jspdf`/`jspdf-autotable`/`exceljs`/
     `html2canvas` só quando Relatórios abre (esse chunk sozinho ainda
     é grande — 1,4 MB — mas carrega sob demanda, não no login).
  4. **Documentação técnica**: `README.md` novo na raiz (não existia
     nenhum) — setup, scripts, estrutura de pastas, padrões de
     migration/IPC/sync/log. Deliberadamente não duplica o CLAUDE.md
     (contexto de produto/roadmap); é só a porta de entrada técnica
     pra quem clonar o repo pela primeira vez.
  Build e `npm run typecheck` limpos em cada frente. **Nenhuma
  validada manualmente pelo usuário ainda.** Falta só **RC → v1.0**
  (bump de versão + tag), que fica pra decidir com o usuário depois
  da validação manual das frentes acima — não antecipado.
- Entrega **2026-07-18**: **Sprint 6 — Offline e Sincronização**
  (motor de sync automático, pedido do usuário — "vamos pro sprint
  6"). O motor mínimo (fila `sync_queue` + push manual/no-login) já
  existia; esta entrega fecha o resto do item do roadmap: retry
  automático em segundo plano com **backoff exponencial** (30s a
  5min — dobra quando um lote inteiro falha, sinal de problema de
  conectividade e não de dado; reseta em qualquer sucesso ou ao
  religar a rede), **detecção de rede e reconexão** via eventos
  nativos `online`/`offline` do Chromium (sem lib nova), **resolução
  de erros** (itens que esgotam as 5 tentativas ficavam presos e
  invisíveis — agora aparecem em Configurações com botão "tentar
  novamente", por item ou todos de uma vez) e **log de
  sincronização** (tabela local nova `sync_log`, migration v24,
  capada em 50 linhas — histórico do próprio motor, não é auditoria
  de ação de usuário, então não tem `usuario_id` nem sincroniza pro
  Supabase). Tudo renderer-side (só o renderer fala com o Supabase,
  reforça 3.2); `src/renderer/lib/syncManager.ts` é um singleton com
  pub-sub caseiro (`useSyncExternalStore`, nativo do React — nenhuma
  lib de estado nova) que substitui a chamada avulsa de `runSync()`
  no login por `syncManager.start()`/`stop()` (login/logout).
  Indicador compacto sempre visível no header
  (`components/layout/SyncIndicator.tsx`) mostra
  offline/sincronizando/pendente/erro/sincronizado. **Testes de
  perda de conexão** ficaram como verificação manual (não é código —
  documentado na seção de Verificação do plano, ainda não executado
  pelo usuário). Sem migration Supabase nova nesta entrega. Build e
  `npm run typecheck` limpos. **Não testado manualmente ainda.**
- Entrega **2026-07-16**: **card de resumo inteligente no Dashboard**
  (pedido explícito do usuário — saudação por horário + destaques da
  produção em texto corrido, tipo "Bom dia! ..."). Sem dado novo: só
  narra o que o Dashboard já busca (mesas pra todos os papéis; ordens/
  produção só quando `podeVerOrdens`, mesma regra do resto da
  página — Operador vê só o resumo de mesas). Geração do texto pura em
  `lib/resumoProducao.ts` (saudação Bom dia/Boa tarde/Boa noite por
  horário local + frases sobre mesas ocupadas, ordens em andamento/
  fila, concluídas hoje e atrasadas — reusa `isOrdemAtrasada` já
  existente do Relatório de Produção); componente
  `components/dashboard/ResumoProducaoCard.tsx` só decide loading e
  renderiza. Build e `npm run typecheck` limpos. **Não testado
  manualmente ainda**.
- Entrega **2026-07-16**: **microinterações** (pedido explícito do
  usuário — "não exagerar, só deixar vivo"). Hover em cards (sombra
  leve, `Card` global em `components/ui/card.tsx` — cobre o app
  inteiro automaticamente) e fade entre páginas (`App.tsx`, `div`
  com `key={currentPage}` reaproveitando `tailwindcss-animate`, já
  instalado). Hover de linha de tabela e abertura suave de diálogos
  **já existiam** no design system (shadcn/`tailwindcss-animate`) —
  conferido, sem mudança necessária. Skeleton loading novo
  (`components/ui/skeleton.tsx` + `table-skeleton.tsx`,
  `TableSkeletonRows`) aplicado nos três pontos de maior tráfego —
  Dashboard, Ordens de Corte, Produção — no lugar do texto
  "Carregando..."; as demais páginas (cadastros, abas de Relatórios)
  não foram tocadas nesta rodada — deliberado, pra não exagerar o
  escopo de um pedido de polimento pontual. Build e
  `npm run typecheck` limpos. **Não testado manualmente ainda** — não
  tentei automação de GUI por causa do risco já registrado de
  interferir em outra janela em primeiro plano do usuário (ver
  `feedback_gui_automation_foreground_risk.md`).
- Entrega **2026-07-16**: **Relatório de Operadores** — quinta aba
  dentro de "Relatórios" (Tabs: "Produção" | "Histórico de Ordens" |
  "Materiais" | "Clientes" | "Operadores"), pra gestão de produção.
  Mesmo padrão do Relatório de Clientes: sem conflito de domínio, sem
  IPC novo (reusa `listRelatorioProducao()`). Nota do pedido —
  "nenhuma feature de gestão de pessoas/RH, só análise operacional" —
  já era o comportamento natural, já que tudo vem de
  `sessoes_producao`, não de um cadastro de funcionários. Filtros:
  Operador (opções vêm só de quem já operou de verdade — filtra
  `RelatorioProducaoLinha` por `operador_id` presente, não a lista
  completa de usuários, que incluiria admin/supervisor sem nenhuma
  sessão), período (por `criado_em`), status. KPIs: Total de
  Operadores (universo completo, não filtrado — mesmo espírito de
  "Total de Clientes"), Ordens Concluídas, Tempo Médio de Produção
  (calculado direto sobre as ordens concluídas do período, não é média
  das médias por operador — evita enviesar operador com poucas
  ordens), Média de Ordens por Operador. Tabela (uma linha por
  operador, sem paginação — poucos operadores, diferente de Clientes/
  Histórico): Operador, Concluídas, Em Andamento, Tempo Médio de
  Produção, Última Atividade (início de sessão mais recente, não
  conclusão — reflete quando o operador atuou por último mesmo com a
  ordem ainda em andamento). Gráficos: "Ordens por Operador" e
  "Comparação de Tempo de Produção" (barras horizontais) e
  "Produtividade Diária" (linha, ordens concluídas por dia agregado).
  Lógica pura em `lib/relatorioOperadores.ts`; exportação em
  `lib/relatorioOperadoresExport.ts`. Build e `npm run typecheck`
  limpos. **Não testado manualmente ainda**.
- Entrega **2026-07-16**: **Relatório de Clientes** — quarta aba
  dentro de "Relatórios" (Tabs: "Produção" | "Histórico de Ordens" |
  "Materiais" | "Clientes"). Sem conflito de domínio como o de
  Materiais — todo o pedido mapeou direto em dado já existente, sem
  precisar parar pra alinhar escopo. Filtros: período (por
  `criado_em`), cliente, material. KPIs: Total de Clientes (todos os
  cadastrados), Clientes Ativos, Ordens Produzidas, Média de Ordens
  por Cliente. "Clientes Ativos" = clientes com ≥1 ordem no período
  filtrado (atividade real) — decisão explícita pra não confundir com
  `Cliente.ativo`, que é só a flag de soft-delete do cadastro, não
  medida de atividade. Tabela (uma linha por cliente, paginada — 20 por
  página, mesmo componente de paginação da aba Histórico, agora
  compartilhado em `lib/pagination.ts`): Cliente, Ordens, Última
  Ordem, Materiais Usados (lista de tecidos distintos, truncada com
  "+N"), Tempo Médio de Produção (reusa `calcularTempoProducaoMinutos`
  da aba Produção, só ordens com sessão finalizada). Cada linha abre
  `ClienteHistoricoDialog` — histórico completo do cliente (todas as
  ordens dele, **sem** aplicar os filtros da aba, é literal "histórico
  completo"). Gráficos: "Ordens por Cliente" (barras horizontais, top
  clientes) e "Atividade de Clientes ao Longo do Tempo" (linha,
  ordens criadas por dia agregado — não por cliente individual, pra
  não exigir paleta categórica de N cores). Nenhum IPC novo: reusa
  `listRelatorioProducao()` (mesma fonte da aba Produção) — um único
  registro por ordem já cobre cliente/material/tempo, dispensando
  `listOrdensCorte()` para este relatório. Lógica pura em
  `lib/relatorioClientes.ts`; exportação em
  `lib/relatorioClientesExport.ts` (helpers genéricos de
  `exportUtils.ts`). Build e `npm run typecheck` limpos. **Não testado
  manualmente ainda**.
- Entrega **2026-07-16**: **Relatório de Materiais** — terceira aba
  dentro de "Relatórios" (Tabs: "Produção" | "Histórico de Ordens" |
  "Materiais"). Pedido original pedia conceitos de corte de **chapa
  rígida** (espessura, chapas usadas, % de utilização, desperdício
  estimado) que não existem no domínio deste projeto — Zenith Cutter
  modela corte de **tecido** (confecção), sem noção de "chapa", e
  utilização/desperdício em % exigiria saber quanto material foi
  alocado por ordem, que é controle de **estoque** (fora de escopo,
  seção 5). Parado antes de codar e resolvido com o usuário (2
  perguntas): **espessura removida** do relatório (sem novo campo em
  Tecidos) e **KPIs/gráficos redefinidos com dado real** — Total de
  Ordens, Total de Peças Produzidas, Total de Perdas Registradas
  (soma de `producao_perdas.quantidade`, ainda sem unidade fixa) e
  Material Mais Usado (por peças produzidas), em vez de "chapas
  usadas"/"% utilização"/"% desperdício". Gráficos: "Consumo de
  Material" e "Materiais Mais Usados" (barras horizontais, mesma cor
  primária da marca) substituem "Material Consumption"/"Most Used
  Materials" quase 1:1 (volume de peças vs. frequência de ordens);
  "Tendência de Perdas" (linha, âmbar — `--status-pending`) substitui
  "Utilization Trend" (não computável sem estoque). Tabela: Material,
  Cor, Ordens, Peças Produzidas, Perdas Registradas — uma linha por
  material, agregada a partir de Ordens de Corte + `producao_perdas`
  já existentes. Filtro "Cor" é novo mas usa campo que já existia em
  `Tecido.cor`; filtro "Espessura" não entrou (não existe). Nova
  consulta `listRelatorioPerdasLocal` (repositório `relatorios.ts`)
  junta `producao_perdas` com sessão/ordem/tecido/cliente — mesmo
  padrão de `listRelatorioProducaoLocal`, sem filtro no SQL (filtra em
  memória no renderer). Toda lógica de filtro/agregação/série de
  gráfico vive em `lib/relatorioMateriais.ts` (puro); exportação em
  `lib/relatorioMateriaisExport.ts` (mesmos helpers genéricos de
  `exportUtils.ts`). Build e `npm run typecheck` limpos. **Não testado
  manualmente ainda**.
- Entrega **2026-07-16**: **Histórico de Ordens** — segunda aba dentro
  de "Relatórios" (Tabs: "Produção" | "Histórico de Ordens"), pedido
  explícito do usuário como "tela de consulta principal". Mesma
  ressalva de escopo do Relatório de Produção (exceção pontual dentro
  de "Relatórios avançados", seção 5) — não reaberta com o usuário por
  já estar alinhada na entrega anterior, mesma sessão. Filtros
  combináveis (número, cliente, material, status, operador, período por
  `criado_em`); busca instantânea (dados já em memória, sem chamada de
  rede); paginação no cliente (20 por página — dataset de uma única
  empresa local não justifica paginação por SQL); detalhe completo por
  linha reusa o `InfoOrdemCorteDialog` já existente (botão "Info" por
  linha, mesmo padrão de Ordens de Corte, não a linha inteira
  clicável). Exportação CSV/Excel/PDF com o conjunto de colunas do
  pedido (inclui "Peças", que o Relatório de Produção não tem).
  `lib/exportUtils.ts` novo generaliza os helpers de CSV/Excel/PDF
  (extraídos de `relatorioExport.ts`) pra serem reusados também por
  `historicoOrdensExport.ts`. RelatoriosPage.tsx virou um container
  fino: busca ordens (`listOrdensCorte`) + sessões de produção
  (`listRelatorioProducao`, mesma fonte da aba Produção) uma única vez
  e mescla via `lib/historicoOrdens.ts` (`mesclarHistoricoOrdens` — por
  `ordem_id`, sem chamada IPC nova); cada aba virou componente próprio
  em `components/relatorios/`, só recebendo dados prontos via props
  (sem lógica de negócio nem fetch dentro do componente). Build e
  `npm run typecheck` limpos. **Não testado manualmente ainda**.
- Entrega **2026-07-16**: **Relatório de Produção** (aba "Relatórios",
  admin/supervisor), pedido explícito do usuário — esbarra em
  "Relatórios avançados" (fora de escopo, seção 5); decisões de escopo
  e biblioteca alinhadas com o usuário antes de codar (ver exceção na
  seção 5 e nas exceções de stack na seção 2). Escopo desta entrega:
  filtros (período por `criado_em`, cliente, operador, material/tecido,
  status), 5 KPIs (Total, Concluídas, Em Andamento, Atrasadas, Tempo
  Médio de Produção) e tabela detalhada (Nº, Cliente, Material,
  Operador, Início, Conclusão, Tempo, Status). **Sem gráficos** — adiado
  por decisão do usuário, sem biblioteca de gráficos aprovada ainda.
  Exportação CSV (sem dependência)/Excel/PDF via `exceljs` + `jspdf`/
  `jspdf-autotable` (trocou `xlsx` por `exceljs` no meio da instalação:
  `xlsx` do npm tem 2 CVEs sem correção disponível). "Atrasada" exigiu
  campo novo — `ordens_corte.prazo` (data limite opcional, migration
  local v23 + Supabase 0029), editável em Criar/Editar Ordem e visível
  no dialog Info; atrasada = prazo passou e status não é
  `pronto`/`cancelada`. "Operador" = quem iniciou a sessão de produção
  da ordem (`sessoes_producao.iniciado_por`); ordens nunca iniciadas
  aparecem no relatório com operador/tempo/datas vazios. Toda a lógica
  de filtro/KPI/duração vive em `lib/relatorioProducao.ts` (puro, sem
  UI) e a de exportação em `lib/relatorioExport.ts` — a página só busca
  dados e renderiza. Novo repositório `relatorios.ts` (main) faz um
  LEFT JOIN por ordem com a sessão de produção mais recente dela (uma
  ordem tem no máximo uma na prática). Build e `npm run typecheck`
  limpos. **Não testado manualmente ainda**.
- Entrega **2026-07-16**: **gráficos no Dashboard** — pedido explícito
  do usuário reabriu a decisão de "sem gráficos ainda" tomada horas
  antes na entrega do Relatório de Produção (mesma sessão); escolhida
  `recharts` (era a opção recomendada quando a decisão foi adiada) —
  nova exceção de stack, seção 2. Dois gráficos, ambos admin/supervisor
  (mesmo gate de "Ordens por Status"): "Distribuição de Ordens por
  Status" (rosca, substitui a lista de badges — cores distintas por
  status, diferente do mapeamento de badge.tsx que reusa cor pra vários
  status do pipeline, o que confundiria fatias vizinhas) e "Produção
  dos Últimos 30 Dias" (barras, ordens concluídas por dia — dia sem
  conclusão aparece com 0, eixo contínuo). Fonte do segundo:
  `listRelatorioProducao()`, já existente, sem IPC novo. Cálculo em
  `lib/dashboardCharts.ts` (puro); componentes em
  `components/dashboard/` só renderizam. Build e `npm run typecheck`
  limpos. **Não testado manualmente ainda**.
- Sprint 5 — Dashboard Operacional **encerrado**: visão de mesas
  livres/ocupadas (todos os papéis), distribuição de ordens por status
  e produção dos últimos 30 dias em gráfico (ver entrega 2026-07-16
  acima — supera o "sem gráficos" original) e pesquisa rápida
  (admin/supervisor — leitura local não passa por RLS, restrição de
  papel replicada no componente, mesma regra de Ordens de Corte).
  Sprint 4 fica encerrado (ver abaixo).
- Sprint 6 — Offline e Sincronização **encerrado** (ver entrega
  2026-07-18 acima).
- Sprint em andamento: Sprint 7 — Polimento e Publicação, último do
  roadmap do MVP. 4 das 5 frentes de código entregues (ver acima);
  falta só RC → v1.0 (bump de versão + tag), depois da validação
  manual do usuário.
- Entregas **2026-07-16** (mesma sessão, várias peças pequenas):
  identidade visual completa (paleta de marca em `index.css`, logos
  Zenith Cutter/Zenith DEV — splash screen só com a logo Zenith DEV,
  ícone do app/taskbar/instalador recortado só com o símbolo pra não
  distorcer/ficar ilegível); grade de quantidade por tamanho nas
  Ordens de Corte trocada de lista contínua pra grid
  (`GradeQuantidadeInput`, compartilhado entre Criar/Editar/registro
  de perdas); Dashboard perde o card "Banco de dados local" (removido,
  sem utilidade operacional) e o card de sincronização migra pra
  dentro da nova página Configurações (seção "Sincronização");
  registro de perdas de produção passa a ser por tamanho da grade do
  produto (mesmo componente da criação de ordem, produto_tamanho_id
  nullable em `producao_perdas`, migration local v21 + Supabase 0027)
  e fica visível no dialog "Info" da lista de Ordens de Corte; Mesas de
  Corte ganham um menu próprio (clicar na mesa abre a fila de produção
  pré-atribuída especificamente a ela, com Iniciar direto ali) —
  `ordens_corte.mesa_atribuida_id` novo (nullable, migration local v22
  + Supabase 0028), editável só por admin/supervisor numa coluna da
  Fila de Produção, sem PIN (organização de fila, não transição de
  estado); filtro "Aberta" de Ordens de Corte deixa de casar só o
  status literal (que quase nunca ocorre, ordem já nasce em `em_fila`)
  e vira agregado — qualquer ordem que não seja `pronto` nem
  `cancelada`. Build e `npm run typecheck` limpos a cada entrega.
  **Não testado manualmente ainda** (menu de mesa e perdas em grid).
- Correção **2026-07-16**: bug pré-existente (não relacionado às
  entregas desta sessão) travava o carregamento de Cadastros >
  Usuários com "Não foi possível carregar a lista de usuários".
  Causa raiz achada com `console.error` temporário: `cacheUsuarios`
  faz upsert por `id`, mas `login` tem índice único próprio; em
  produção "Operador de Teste" foi excluído e recriado com `id` novo
  mantendo o mesmo `login`, e o cache local nunca apaga linhas que
  sumiram do Supabase — a linha antiga ficou presa segurando o login
  e colidia com o upsert da linha nova, quebrando `listUsuarios()`
  inteiro (nunca chegava no fallback pro cache local). Corrigido:
  `cacheUsuarios` limpa qualquer linha órfã (id diferente) presa no
  mesmo login antes de cada upsert. Exige reiniciar `npm run dev`
  (mudança no processo main, sem hot-reload) — **usuário ainda vai
  confirmar se resolveu**.
- Última entrega **2026-07-14**: Sprint 4 — Execução da Produção. Todos os itens
  do roadmap entregues: iniciar/pausar/retomar/finalizar (finalizar =
  avançar etapa saindo de "Em Corte"), registro de perdas e
  observações, tempo de produção (exibido, cálculo estático — não é
  cronômetro ao vivo), liberação automática da mesa ao finalizar,
  histórico da sessão (via `ordem_corte_historico`: mudança de status,
  pausa, retomada). Sprint 3 (Fila de Produção) fica encerrado —
  concluído nesta mesma sessão, junto com o pipeline pós-corte
  (Embalagem/Revisão/Despacho/Pronto, fora do roadmap original,
  pedido do usuário em 2026-07-11). Sprint 2 encerrado (item pendente
  "entrada automática na fila" fechado no Sprint 3). Sprint 1
  encerrado por decisão do usuário em 2026-07-09, com "configurações
  básicas" deliberadamente adiada sem escopo definido.
- Última entrega **2026-07-14**: pausar/retomar/perdas/observações/
  tempo de produção (Sprint 4). `sessoes_producao` ganha `pausado_em` +
  `tempo_pausado_segundos` (migration local v17, Supabase 0022);
  `pausarProducaoLocal`/`retomarProducaoLocal` (`producao.ts`)
  registram no histórico da ordem (novas ações `pausa`/`retomada`,
  migration local v18, Supabase 0023). **Bug encontrado e corrigido no
  caminho**: os índices únicos parciais de `sessoes_producao` só
  cobriam `status='em_andamento'`, deixando iniciar uma ordem nova
  numa mesa cuja sessão estava só pausada (pausar não libera a mesa —
  a peça continua fisicamente nela); migration local v19 + Supabase
  0024 recriam os índices cobrindo `'em_andamento'` e `'pausada'`.
  Duas tabelas novas — `producao_perdas` (quantidade livre + motivo) e
  `producao_observacoes` (texto), ambas por sessão, log cronológico
  só-INSERT (migration local v20, Supabase 0026) — alimentam o dialog
  `PerdasObservacoesDialog` (abas, sem PIN — não é transição de estado
  listada em 3.1, mas rastreável por usuário+timestamp via 3.5),
  plugado na seção "Em andamento" de `ProducaoPage`. RLS de
  `sessoes_producao` para Operador tinha um gap desde o Sprint 3 (só
  INSERT+SELECT, sem UPDATE — pausar/retomar/finalizar precisam de
  UPDATE); fechado na Supabase `0025`. Build e `npm run typecheck`
  limpos. **Não testado manualmente ainda**.
- Entrega anterior **2026-07-14**: página "Fila de Produção" removida
  por ser redundante com "Produção" (pedido do usuário) — a
  reordenação manual de prioridade (única capacidade exclusiva dela)
  migrou pra dentro do card "Fila de Produção" já existente em
  `ProducaoPage`, visível/ativa só pra admin/supervisor (gate por
  papel no componente, não mais rota separada). `navigation.ts` e
  CLAUDE.md 3.6 atualizados; nenhuma dependência (IPC/repo/lib de
  `filaProducao`) ficou órfã.
- Entrega anterior **2026-07-11**: pipeline pós-corte (Embalagem →
  Revisão → Despacho → Pronto), pedido do usuário depois da entrega
  da Fila de Produção (ver bullets mais abaixo, mesma data) — substitui o antigo par
  "Finalizar → Conferência → Finalizada" da seção 4 por 4 etapas mais
  granulares, cada uma avançada manualmente uma de cada vez (regra 4,
  nunca pulando etapa; regra 3.1, sempre com PIN). `StatusOrdemCorte`
  e `PIPELINE_PRODUCAO` (sequência fixa) em `src/shared/models.ts`.
  `avancarEtapaOrdemLocal` (`producao.ts`) move a ordem pra próxima
  etapa; ao sair de `em_corte` finaliza a sessão de produção ativa,
  liberando a mesa automaticamente (mesa só existe durante o corte —
  nas demais etapas a ordem não tem mesa). O guard de
  `updateOrdemCorteLocal` que bloqueava edição livre de `em_corte`
  foi generalizado pra qualquer etapa de `PIPELINE_PRODUCAO` (mas
  permite reenviar o patch com o status atual inalterado, já que o
  form de edição sempre reenvia `status`). Nova seção "Pipeline de
  Produção" em `ProducaoPage` lista ordens em qualquer etapa com botão
  "Avançar etapa". Migration local v16 e Supabase
  `0019_ordens_corte_pipeline_pos_corte.sql` ampliam o CHECK de
  status; `supabase/sql/0018_ordens_corte_operador_producao.sql`
  (ainda não executado em produção) foi renomeado pra `0020` — passou
  a depender da 0019 — e suas policies de Operador estendidas do par
  fixo `em_fila→em_corte` para o pipeline inteiro. Build e
  `npm run typecheck` limpos. **Não testado manualmente ainda**.
- Entrega anterior **2026-07-11**: Fila de Produção + Produção (Sprint 3).
  Ambiguidade de escopo resolvida com o usuário antes de codar: a
  matriz de permissões (3.6) já reservava duas páginas — `fila-producao`
  (admin/supervisor) e `producao` (todos os papéis, incluindo
  Operador) — e o usuário confirmou que queria o Operador já
  conseguindo iniciar produção nesta sprint, não só no Sprint 4. Then:
  **Fila de Produção** (admin/supervisor) gerencia a fila — ordena
  manualmente por `prioridade` (mesmo padrão de
  `produto_tamanhos.ordem`, mover pra cima/baixo) e mostra as mesas
  livre/ocupada, só leitura. **Produção** (todos os papéis) lista a
  mesma fila com botão "Iniciar" por linha: seleciona mesa livre +
  confirma com PIN (reusa `usePinConfirm`) → cria a sessão de produção,
  move a ordem de `em_fila` para `em_corte`, mostra as sessões ativas.
  Criar uma Ordem de Corte agora entra direto em `em_fila` (fecha o
  item pendente do Sprint 2 — antes ficava em `aberta` e nada nunca
  movia pra fila). `em_corte` só é setado por essa ação (nunca por
  edição livre — regra 4 "sem pular etapas"); botão Cancelar em Ordens
  de Corte some também para `em_corte`. Nova tabela `sessoes_producao`
  (migration local v15) com dois índices únicos parciais
  (`WHERE status='em_andamento'` em `mesa_id` e em `ordem_id`) que
  garantem no próprio banco que uma mesa não fica ocupada duas vezes
  nem uma ordem é iniciada duas vezes — mesmo espírito do
  `UNIQUE(empresa_id, numero)` de ordens. `ordens_corte` ganhou
  `prioridade` e o status `em_corte` (migration local v14, recria a
  tabela, mesmo padrão da v11/v13). Migrations Supabase
  `0016_ordens_corte_em_corte_e_prioridade.sql`,
  `0017_sessoes_producao.sql` e `0018_ordens_corte_operador_producao.sql`
  (RLS: admin/supervisor acesso completo; Operador só INSERT+SELECT em
  `sessoes_producao` e SELECT restrito a `em_fila`/`em_corte` +
  UPDATE restrito à transição `em_fila`→`em_corte` em `ordens_corte`)
  **criadas no repo, pendentes de execução manual** no SQL Editor
  (mesma rotina de sempre). Build e `npm run typecheck` limpos.
  **Não testado manualmente ainda** — usuário vai validar depois.
- Entrega anterior **2026-07-09**: número sequencial de Ordem de Corte
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
