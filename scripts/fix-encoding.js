const fs = require("fs");
const path = require("path");

const DEFAULT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".txt",
  ".css",
  ".scss",
  ".html",
]);

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  ".vercel",
  ".idea",
  ".vscode",
]);

const IGNORE_FILES = new Set([
  "fix-encoding.js",
  "logs-webhook.txt",
]);

const REPLACEMENTS = [
  // Spanish accents (mojibake)
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã±", "ñ"],
  ["Ã¼", "ü"],
  ["Ã", "Á"],
  ["Ã‰", "É"],
  ["Ã", "Í"],
  ["Ã“", "Ó"],
  ["Ãš", "Ú"],
  ["Ã‘", "Ñ"],
  ["Ãœ", "Ü"],
  ["Â¿", "¿"],
  ["Â¡", "¡"],
  ["Âª", "ª"],
  ["Âº", "º"],
  ["Â°", "°"],
  ["Â·", "·"],
  ["Â€", "€"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€˜", "‘"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€�", "”"],
  ["â€¦", "…"],
  ["â€¢", "•"],
  // Common emojis seen in admin UI
  ["ðŸ”´", "🔴"],
  ["ðŸ”µ", "🔵"],
  ["âšª", "⚪"],
  ["ðŸ“®", "📮"],
  ["âš™ï¸", "⚙️"],
  ["ðŸ“§", "📧"],
  ["ðŸ”Œ", "🔌"],
  ["ðŸ“¡", "📡"],
];

const MOJIBAKE_PATTERNS = [
  /Ã./,
  /â../,
  /ðŸ/,
  /Â./,
  /\uFFFD/, // replacement char
];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    const ext = path.extname(entry.name);
    if (DEFAULT_EXTENSIONS.has(ext)) files.push(fullPath);
  }
  return files;
}

function applyReplacements(content) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

function hasMojibake(content) {
  return MOJIBAKE_PATTERNS.some((p) => p.test(content));
}

function loadContent(filePath) {
  const buf = fs.readFileSync(filePath);
  const utf8 = buf.toString("utf8");
  if (utf8.includes("\uFFFD")) {
    // Likely encoded as latin1/cp1252; recode to UTF-8.
    return { content: buf.toString("latin1"), wasLatin1: true };
  }
  return { content: utf8, wasLatin1: false };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    write: false,
    check: false,
    paths: [],
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--write") opts.write = true;
    else if (arg === "--check") opts.check = true;
    else if (arg === "--paths") {
      const next = args[i + 1];
      if (next) {
        opts.paths = next.split(",").map((p) => p.trim()).filter(Boolean);
        i += 1;
      }
    }
  }
  if (!opts.write && !opts.check) opts.check = true;
  return opts;
}

function main() {
  const opts = parseArgs();
  const root = path.join(__dirname, "..");
  const targetFiles = opts.paths.length
    ? opts.paths.map((p) => path.resolve(root, p))
    : walk(root);

  const changed = [];
  const warnings = [];

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    if (IGNORE_FILES.has(path.basename(filePath))) continue;
    const { content, wasLatin1 } = loadContent(filePath);
    const replaced = applyReplacements(content);
    const finalContent = replaced;

    const contentChanged = finalContent !== content;
    if (contentChanged && opts.write) {
      fs.writeFileSync(filePath, finalContent, "utf8");
      changed.push(filePath);
      continue;
    }

    if (contentChanged || hasMojibake(finalContent) || wasLatin1) {
      warnings.push(filePath);
    }
  }

  if (opts.write) {
    console.log(`✅ Encoding fixed: ${changed.length} file(s).`);
  }

  if (opts.check) {
    if (warnings.length > 0) {
      console.log("❌ Potential encoding issues found in:");
      warnings.forEach((p) => console.log(`- ${path.relative(root, p)}`));
      process.exit(1);
    }
    console.log("✅ Encoding check passed.");
  }
}

main();
