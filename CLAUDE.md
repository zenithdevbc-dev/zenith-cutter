# Zenith Cutter MVP — Contexto do Projeto

> Este arquivo é lido automaticamente pelo Claude Code no início de cada sessão.
> Ele define o que o sistema é, os princípios inegociáveis do produto e o estado do roadmap.

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

**Fora do escopo (não implementar, mesmo se parecer "fácil de adicionar"):**
Financeiro, Estoque, Compras, PCP, Custos, Engenharia de Produto, Multiempresa,
Etiquetas, Leitores de código de barras, Integrações com ERPs, Inteligência Artificial,
App Mobile, Relatórios avançados, Planejamento automático, Balanceamento automático da
fila.

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

- Sprint em andamento: Sprint 1 — Cadastros (Usuários e Clientes
  concluídos; faltam Produtos, Tecidos, Mesas de Corte, configurações
  básicas).
- Última entrega concluída: Cadastro de Clientes, 100% offline-first
  (id gerado no app, grava local primeiro, sem nenhuma etapa online
  — diferente de Usuários). RLS aberto a qualquer autenticado
  (select/insert/update), sem DELETE físico (só `ativo = false`).
  Cadastros ganhou abas (Usuários | Clientes) via shadcn Tabs. Ver
  `supabase/sql/0002_clientes.sql` (ainda não rodado no Supabase —
  pendente de ação manual do usuário).
- Entregas anteriores do sprint: Cadastro de Usuários completo e
  testado ponta a ponta — tabela `public.usuarios` no Supabase (RLS,
  trigger de perfil automático, `is_admin()`), Edge Function
  `create-usuario` (cria login + perfil, admin-only, deployada),
  cache local em SQLite com fila de sincronização para edições
  offline. Ver `supabase/sql/0001_usuarios.sql` e
  `supabase/functions/create-usuario/`.
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
