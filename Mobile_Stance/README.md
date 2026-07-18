# Zenith Cutter — Mobile (Android)

Versão mobile do Zenith Cutter para operadores executarem a Produção
(iniciar/pausar/retomar/avançar etapa/perdas/observações) direto do
celular. Android apenas, distribuído como APK direto (sem loja) —
mesmo espírito do instalador do [`../Desktop_Stance`](../Desktop_Stance).

Contexto de produto, princípios e decisões de arquitetura completas:
[`../CLAUDE.md`](../CLAUDE.md) (ver §2.1 e a entrega da versão mobile em
§7).

## Stack

React Native (CLI puro, TypeScript) — sem Expo. Mesmo backend do
desktop (Supabase), sem SQLite local: as ações de produção exigem
internet e escrevem direto no Supabase; a fila/status fica em cache
local só para consulta offline (ver decisão de sincronização em
CLAUDE.md).

## Setup

```bash
npm install
cp .env.example .env   # preencher com as credenciais do projeto Supabase
```

Pré-requisito: ambiente Android configurado (Android Studio + SDK, ver
[guia oficial do React Native](https://reactnative.dev/docs/set-up-your-environment?platform=android)).
Sem isso, `npm run android` não builda.

```bash
npm start        # Metro (bundler JS)
npm run android  # builda e instala num emulador/dispositivo conectado
```

## Escopo desta versão

Só **Login** (Empresa/Login/Senha, mesmo modelo do desktop) e
**Produção** — nada de Dashboard, Ordens de Corte, Cadastros,
Configurações ou Relatórios (fora de escopo desta entrega, ver
CLAUDE.md).
