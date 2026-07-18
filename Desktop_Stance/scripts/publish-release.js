// Sobe os artefatos do último `npm run build:win` (release/latest.yml,
// o instalador .exe e o .blockmap) pro bucket público "releases" no
// Supabase Storage — é aí que o auto-updater (electron-updater) dos
// apps já instalados vai procurar por versão nova.
//
// Não usa o pacote "dotenv" (não é dependência declarada do projeto,
// só resolve hoje como transitivo de outra coisa) — parser mínimo de
// ".env" abaixo em vez disso.

const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const RELEASE_DIR = path.join(__dirname, "..", "release");
const BUCKET = "releases";
const ARQUIVOS_ESPERADOS = [/^latest\.yml$/, /\.exe$/, /\.exe\.blockmap$/];

function lerEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  const conteudo = fs.readFileSync(envPath, "utf8");
  const vars = {};
  for (const linhaBruta of conteudo.split("\n")) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith("#")) continue;
    const idx = linha.indexOf("=");
    if (idx === -1) continue;
    const chave = linha.slice(0, idx).trim();
    let valor = linha.slice(idx + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    vars[chave] = valor;
  }
  return vars;
}

function main() {
  const env = { ...lerEnv(), ...process.env };
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Faltam VITE_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env — veja .env.example.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(RELEASE_DIR)) {
    console.error(`Pasta "${RELEASE_DIR}" não existe — rode "npm run build:win" antes.`);
    process.exit(1);
  }

  const arquivos = fs
    .readdirSync(RELEASE_DIR)
    .filter((nome) => ARQUIVOS_ESPERADOS.some((re) => re.test(nome)));

  if (arquivos.length === 0) {
    console.error(
      `Nenhum artefato de release encontrado em "${RELEASE_DIR}" (latest.yml/.exe/.exe.blockmap) — rode "npm run build:win" antes.`,
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  (async () => {
    for (const nome of arquivos) {
      const caminho = path.join(RELEASE_DIR, nome);
      const conteudo = fs.readFileSync(caminho);
      const { error } = await supabase.storage.from(BUCKET).upload(nome, conteudo, {
        upsert: true,
        contentType: nome.endsWith(".yml") ? "text/yaml" : "application/octet-stream",
      });
      if (error) {
        console.error(`Falha ao subir "${nome}":`, error.message);
        process.exit(1);
      }
      console.log(`OK: ${nome} -> ${supabaseUrl}/storage/v1/object/public/${BUCKET}/${nome}`);
    }
    console.log(`\n${arquivos.length} arquivo(s) publicado(s) no bucket "${BUCKET}".`);
  })();
}

main();
