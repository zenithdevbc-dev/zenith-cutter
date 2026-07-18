# Como criar uma empresa nova (cliente novo) no Zenith Cutter

Este guia explica passo a passo como cadastrar uma empresa-cliente
nova no sistema, para que ela possa usar o Zenith Cutter com seus
próprios dados, totalmente separados de qualquer outro cliente.

Não é preciso saber programar para seguir este guia — só copiar e
colar alguns comandos, com atenção.

## 0. O que você vai fazer, em uma frase

Você vai rodar **um único comando** no computador, que cria:
1. A empresa nova no sistema.
2. O primeiro usuário dessa empresa, já como **Administrador** — é
   esse usuário que a empresa vai usar para logar pela primeira vez e
   depois cadastrar o resto do time dela.

Não existe (e não deve existir) uma tela dentro do próprio aplicativo
Zenith Cutter para criar empresas — isso é proposital, por segurança.
Só quem tem acesso a este processo (o time Zenith DEV) consegue criar
uma empresa nova.

## 1. Do que você vai precisar antes de começar

Reúna estas 3 coisas **antes** de começar (peça para quem já tem
acesso ao projeto, se não tiver):

1. **O computador com o projeto do Zenith Cutter** já baixado (a pasta
   `Zenith_Cutter`), com um arquivo chamado `.env` dentro dela.
2. **A "senha mestra" de criação de empresas** — um código secreto
   chamado `EMPRESA_PROVISIONING_SECRET`. Esse código **não aparece em
   nenhuma tela nem comando** por segurança — alguém do time precisa
   te passar esse valor diretamente (por exemplo, por um gerenciador
   de senhas). Se ninguém souber mais qual é, é possível trocá-lo, mas
   isso exige acesso técnico ao painel do Supabase (peça ajuda a quem
   tiver).
3. **Os dados da empresa nova e do primeiro administrador dela**:
   - Nome da empresa (ex.: "Confecções Silva Ltda")
   - Nome completo do administrador (ex.: "João da Silva")
   - E-mail do administrador (ex.: "joao@confeccoessilva.com.br")
   - Um "login" (nome de usuário curto, sem espaço, que a pessoa vai
     digitar toda vez que abrir o programa — ex.: "joao.silva")
   - Uma senha temporária para o administrador (mínimo 8 caracteres —
     combine com o cliente que ele deve trocar depois, se quiser)

## 2. Abrir o PowerShell na pasta do projeto

1. Abra o **Explorador de Arquivos** do Windows e navegue até a pasta
   do projeto (algo como
   `C:\Users\...\Desktop\ZENITH DEV\Zenith_Cutter`).
2. Clique uma vez na barra de endereço no topo da janela (onde mostra
   o caminho da pasta), apague o que estiver escrito ali, digite
   `powershell` e aperte **Enter**.
3. Uma janela azul/preta vai abrir — é o PowerShell, já "dentro" da
   pasta certa. É aqui que você vai colar o comando do próximo passo.

## 3. Pegar a "chave pública" do projeto (não é segredo, mas precisa dela)

1. Na mesma pasta do projeto, abra o arquivo `.env` com o Bloco de
   Notas (clique com o botão direito nele → Abrir com → Bloco de
   Notas).
2. Você vai ver uma linha parecida com:
   ```
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI... (um texto bem comprido)
   ```
3. Copie esse valor comprido (tudo depois do `=`). Você vai usar ele
   duas vezes no comando abaixo.
4. Pode fechar o Bloco de Notas sem salvar nada.

## 4. Montar e rodar o comando

Copie o bloco abaixo inteiro para um editor de texto (Bloco de Notas
mesmo serve) e substitua os valores marcados com `<...>`:

- `<ANON_KEY>` → o valor que você copiou no passo 3 (cole **nos dois
  lugares** onde aparece `<ANON_KEY>`)
- `<SEGREDO>` → a "senha mestra" do passo 1.2
- Os 5 campos dentro de `$body` → os dados da empresa/admin do passo
  1.3

```powershell
$body = @{
  nome_empresa = "Nome da Empresa Cliente"
  admin_nome   = "Nome Completo do Administrador"
  admin_email  = "email-do-admin@exemplo.com"
  admin_login  = "login-curto-sem-espaco"
  admin_senha  = "senha-temporaria-com-8-ou-mais-caracteres"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://ymslhcxdoiofqswwlcpn.supabase.co/functions/v1/create-empresa" `
  -Method Post `
  -Headers @{
    "Authorization" = "Bearer <ANON_KEY>"
    "apikey" = "<ANON_KEY>"
    "x-provisioning-secret" = "<SEGREDO>"
    "Content-Type" = "application/json"
  } `
  -Body $body
```

Depois de preencher tudo, **copie o bloco inteiro já preenchido**,
cole na janela do PowerShell (passo 2) e aperte **Enter**.

## 5. Como saber se deu certo

Se funcionou, o PowerShell vai mostrar uma resposta com os dados da
empresa e do usuário criados, parecido com isto:

```
empresa                                          usuario
-------                                          -------
@{id=...; nome=Nome da Empresa Cliente; ...}     @{id=...; nome=Nome Completo...; papel=administrador; ...}
```

Se aparecer algo em vermelho com a palavra `error` ou `Não
autorizado`, algo deu errado — veja a seção de problemas comuns
abaixo antes de tentar de novo.

**Importante**: se der certo, **não rode o comando de novo com os
mesmos dados** — isso criaria uma segunda empresa duplicada (ou daria
erro de e-mail repetido, o que também é um sinal de que já tinha
funcionado antes).

## 6. O que fazer depois

Agora que a empresa e o primeiro administrador existem:

1. **Instale o aplicativo na máquina do cliente** — baixe o instalador
   direto desta URL (não precisa de nenhum login para baixar):
   ```
   https://ymslhcxdoiofqswwlcpn.supabase.co/storage/v1/object/public/releases/Zenith-Cutter-Setup-1.0.1.exe
   ```
   (o número da versão no nome do arquivo pode mudar com o tempo — se
   quiser confirmar qual é a versão mais recente, pergunte para quem
   cuida do projeto)
2. **Rode o instalador** normalmente na máquina do cliente (é só
   seguir os passos na tela, como qualquer programa do Windows).
3. **Passe pro cliente**: o login e a senha temporária que você
   definiu no passo 1.3. Ele já consegue abrir o programa e entrar
   como Administrador.
4. A partir daí, o próprio administrador da empresa consegue cadastrar
   o resto da equipe dele (Cadastros → Usuários, dentro do programa) —
   isso não precisa mais de você.

## Problemas comuns

- **"Não autorizado" ou erro 403**: a "senha mestra" (`<SEGREDO>`) que
  você colocou está errada, ou não foi substituída (ainda está escrito
  `<SEGREDO>` no comando). Confira com quem te passou o valor.
- **"Dados inválidos"**: algum dos 5 campos (`nome_empresa`,
  `admin_nome`, `admin_email`, `admin_login`, `admin_senha`) ficou em
  branco, ou a senha tem menos de 8 caracteres.
- **Erro mencionando "duplicate" ou e-mail já existente**: já existe
  um usuário com esse e-mail no sistema (talvez você já tenha rodado
  esse comando antes para essa empresa, ou usou um e-mail que já
  pertence a outra empresa). Use um e-mail diferente, ou confirme se a
  empresa já foi criada antes de tentar de novo.
- **A janela do PowerShell não abriu / comando não é reconhecido**:
  confirme que você digitou `powershell` (não `cmd`) na barra de
  endereço do Explorador de Arquivos, no passo 2.
