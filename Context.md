
























“The first of a story”












“Technology serving the highest purpose.”

“Purpose-driven code.”


Zenith Cutter MVP
Roadmap Oficial de Desenvolvimento
Versão: 1.0
Status: Aprovado
Escopo: MVP Desktop Offline First

1. Objetivo
Desenvolver um aplicativo desktop para Windows destinado ao gerenciamento do setor de corte de confecções, permitindo controlar todo o fluxo operacional desde a criação da Ordem de Corte até sua conclusão.
O sistema deverá operar normalmente sem conexão com a internet, sincronizando automaticamente com o Supabase quando houver conectividade.
O MVP será construído com foco em simplicidade operacional, estabilidade e velocidade de uso.

2. Objetivos do MVP
Ao término do desenvolvimento, o sistema deverá permitir:
Autenticação de usuários.
Cadastro dos dados essenciais da produção.
Criação de Ordens de Corte.
Organização das ordens em uma Fila de Produção.
Controle das Mesas de Corte.
Início manual da produção.
Pausa da produção.
Retomada da produção.
Finalização da produção.
Registro de perdas.
Registro de observações.
Histórico completo das operações.
Funcionamento offline.
Sincronização automática com Supabase.

3. Princípios do Produto
3.1 O operador sempre possui o controle
O sistema nunca executa ações operacionais automaticamente.
Ele apenas:
valida;
registra;
informa;
sincroniza.
Toda alteração operacional exige confirmação explícita do usuário.

3.2 Offline First
Toda informação é gravada inicialmente no banco local.
A sincronização é transparente e ocorre em segundo plano.
O funcionamento da produção nunca depende da internet.

3.3 Simplicidade Operacional
O sistema deve ser intuitivo para operadores de produção.
Sempre que existir dúvida entre adicionar funcionalidades ou simplificar o fluxo, a simplicidade terá prioridade.

3.4 Representação fiel da fábrica
O software deve representar o fluxo real do setor de corte.
Não serão utilizados conceitos genéricos como Kanban quando não refletirem a operação real.

3.5 Auditoria Completa
Todas as ações relevantes deverão ser registradas para permitir rastreabilidade completa da produção.

4. Arquitetura
Plataforma
Desktop Windows

Interface
Electron
React
TypeScript
Vite
Tailwind CSS
shadcn/ui

Banco Local
SQLite

Banco em Nuvem
Supabase PostgreSQL

Autenticação
Supabase Auth

Sincronização
Fila de sincronização assíncrona entre SQLite e Supabase.

5. Fluxo Oficial da Produção
Nova Ordem

↓

Fila de Produção

↓

Operador seleciona "Iniciar"

↓

Seleciona uma Mesa Livre

↓

Confirma

↓

Em Corte

↓

Pausar (opcional)

↓

Retomar (opcional)

↓

Finalizar

↓

Conferência

↓

Finalizada

Nenhuma etapa será iniciada automaticamente.

6. Roadmap
Sprint 0 — Fundação
Objetivo
Preparar toda a infraestrutura necessária para o desenvolvimento do sistema.
Entregas
Estrutura Electron.
Estrutura React.
Configuração TypeScript.
Configuração Vite.
Tailwind CSS.
shadcn/ui.
SQLite.
Migrations.
Supabase.
Autenticação.
Sincronização básica.
Layout principal.
Sistema de navegação.
Configuração de build.
Instalador Windows.
Atualização automática.

Sprint 1 — Cadastros
Objetivo
Implementar os cadastros fundamentais para operação.
Entregas
Usuários.
Clientes.
Produtos.
Tecidos.
Mesas de Corte.
Configurações básicas.
CRUD completo.
Validações.

Sprint 2 — Ordens de Corte
Objetivo
Implementar o núcleo do sistema.
Entregas
Criar Ordem.
Editar Ordem.
Cancelar Ordem.
Duplicar Ordem.
Consulta.
Filtros.
Pesquisa.
Status.
Entrada automática na Fila de Produção.
Histórico.

Sprint 3 — Fila de Produção
Objetivo
Implementar o gerenciamento operacional das ordens.
Entregas
Fila ordenada.
Prioridades.
Reordenação manual.
Visualização das Mesas.
Controle de disponibilidade.
Seleção manual da Mesa.
Confirmação de início.
Criação da Sessão de Produção.
Bloqueio de Mesas ocupadas.

Sprint 4 — Execução da Produção
Objetivo
Controlar toda a execução do corte.
Entregas
Iniciar produção.
Pausar produção.
Retomar produção.
Finalizar produção.
Registro de perdas.
Registro de observações.
Tempo de produção.
Liberação automática da Mesa ao finalizar.
Histórico da Sessão.

Sprint 5 — Dashboard Operacional
Objetivo
Apresentar a situação atual da produção.
Entregas
Ordens aguardando.
Ordens em produção.
Ordens em conferência.
Ordens finalizadas.
Mesas livres.
Mesas ocupadas.
Indicadores operacionais.
Filtros.
Pesquisa rápida.

Sprint 6 — Offline e Sincronização
Objetivo
Garantir confiabilidade do funcionamento.
Entregas
Fila de sincronização.
Retry automático.
Detecção de internet.
Reconexão.
Resolução de erros.
Indicador de sincronização.
Logs.
Testes de perda de conexão.

Sprint 7 — Polimento e Publicação
Objetivo
Preparar o sistema para utilização pelos primeiros clientes.
Entregas
Otimizações.
Correções.
Validação completa.
Tratamento de erros.
Melhoria de desempenho.
Instalador.
Atualização automática.
Backup.
Documentação.
Versão Release Candidate.
Versão 1.0.

7. Fora do Escopo do MVP
Não fazem parte desta versão:
Financeiro.
Estoque.
Compras.
PCP.
Custos.
Engenharia de Produto.
Multiempresa.
Etiquetas.
Leitores de código de barras.
Integrações com ERPs.
Inteligência Artificial.
Aplicativo Mobile.
Relatórios avançados.
Planejamento automático.
Balanceamento automático da fila.
Esses módulos serão considerados após a validação comercial do MVP.

8. Critérios para Conclusão do MVP
O MVP será considerado concluído quando atender aos seguintes requisitos:
Instalação através de executável Windows.
Funcionamento totalmente offline.
Sincronização automática com Supabase.
Criação e gerenciamento de Ordens de Corte.
Controle das Mesas de Corte.
Controle da Fila de Produção.
Registro completo das Sessões de Produção.
Auditoria de todas as operações.
Interface estável e adequada para uso em ambiente industrial.
Pronto para implantação em clientes piloto.

9. Visão Pós-MVP
Após a validação do MVP junto aos clientes piloto, o produto poderá evoluir para uma plataforma completa de gestão industrial, adicionando módulos como estoque, PCP, planejamento, indicadores avançados, integrações e recursos inteligentes, preservando a arquitetura estabelecida nesta primeira versão.

