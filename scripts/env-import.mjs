import fs from "node:fs";
import path from "node:path";

const backupDir = path.resolve(".env_backup");
const outFile = path.resolve("env", ".env.base");

const PREFERRED_FILE_ORDER = [
  ".env.local",
  ".env.production",
  ".env.vercel",
  ".env",
  ".env.test",
  ".env.example",
];

function normalizeValue(value) {
  if (value == null) return "";
  let v = String(value).trim();
  v = v.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  v = v.replace(/\r/g, "").replace(/\n/g, "\\n");
  return v;
}

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = normalizeValue(match[2]);
    out[key] = value;
  }
  return out;
}

function listBackupFiles() {
  if (!fs.existsSync(backupDir)) {
    console.error("No existe .env_backup. Crea la carpeta y copia ahí los .env antiguos.");
    process.exit(1);
  }
  return fs
    .readdirSync(backupDir)
    .filter((file) => file.startsWith(".env") || file.includes(".env"))
    .map((file) => path.join(backupDir, file));
}

function scoreFile(filePath) {
  const base = path.basename(filePath);
  const idx = PREFERRED_FILE_ORDER.findIndex((ext) => base.endsWith(ext));
  return idx === -1 ? 999 : idx;
}

if (!fs.existsSync(outFile)) {
  console.error("env/.env.base no existe. Crea el archivo y vuelve a ejecutar.");
  process.exit(1);
}

const files = listBackupFiles().sort((a, b) => scoreFile(a) - scoreFile(b));

const chosen = new Map();
for (const file of files) {
  const txt = fs.readFileSync(file, "utf8");
  const parsed = parseEnv(txt);
  for (const [key, value] of Object.entries(parsed)) {
    if (chosen.has(key)) continue;
    if (!value || value === "replace-with" || value.includes("your-")) continue;
    chosen.set(key, { value, source: path.basename(file) });
  }
}

const template = fs.readFileSync(outFile, "utf8");
const lines = template.split(/\r?\n/);

const outLines = lines.map((line) => {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*.*$/);
  if (!match) return line;
  const key = match[1];
  const hit = chosen.get(key);
  if (!hit) return line;
  return `${key}=${hit.value}`;
});

fs.writeFileSync(outFile, outLines.join("\n"), "utf8");

console.log(`OK: env/.env.base rellenado desde .env_backup (${files.length} archivos escaneados).`);
console.log(`Claves rellenadas: ${[...chosen.keys()].length}`);
console.log("Nota: revisa manualmente Stripe prices y URLs ambiguas.");
