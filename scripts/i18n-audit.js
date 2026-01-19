const fs = require("fs");
const path = require("path");

const DEFAULT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".turbo",
  ".vercel",
  "dist",
  "build",
  "coverage",
  ".idea",
  ".vscode",
  "public",
]);

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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    paths: [],
    output: path.join("docs", "I18N_AUDIT.md"),
    baseline: path.join("docs", "I18N_AUDIT.md"),
    limit: 400,
    check: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--paths") {
      const next = args[i + 1];
      if (next) {
        opts.paths = next.split(",").map((p) => p.trim()).filter(Boolean);
        i += 1;
      }
    } else if (arg === "--output") {
      const next = args[i + 1];
      if (next) {
        opts.output = next;
        i += 1;
      }
    } else if (arg === "--limit") {
      const next = args[i + 1];
      if (next) {
        opts.limit = Number(next) || opts.limit;
        i += 1;
      }
    } else if (arg === "--baseline") {
      const next = args[i + 1];
      if (next) {
        opts.baseline = next;
        i += 1;
      }
    } else if (arg === "--check") {
      opts.check = true;
    }
  }
  return opts;
}

function looksLikeUrlOrPath(text) {
  const t = text.trim();
  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("/") ||
    t.startsWith("./") ||
    t.startsWith("../") ||
    t.startsWith("@/") ||
    t.startsWith("#") ||
    t.startsWith("data:")
  );
}

function hasLetters(text) {
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(text);
}

function shouldInclude(text) {
  const t = text.trim();
  if (t.length < 3) return false;
  if (!hasLetters(t)) return false;
  if (looksLikeUrlOrPath(t)) return false;
  if (/\${/.test(t)) return false; // template interpolation
  const hasAccent = /[ÁÉÍÓÚÜÑáéíóúüñ]/.test(t);
  const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(t);
  const hasSpace = /\s/.test(t);
  const hasPunct = /[¿¡?!.,:;]/.test(t);
  return hasAccent || hasEmoji || hasSpace || hasPunct;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const hits = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    // JSX text nodes
    const jsxRegex = />([^<>{}]+)</g;
    let jsxMatch;
    while ((jsxMatch = jsxRegex.exec(line)) !== null) {
      const text = jsxMatch[1].replace(/\s+/g, " ").trim();
      if (shouldInclude(text)) {
        hits.push({ type: "jsx-text", line: i + 1, text });
      }
    }

    // String literals
    const strRegex = /(["'`])((?:\\.|(?!\1).)*)\1/g;
    let strMatch;
    while ((strMatch = strRegex.exec(line)) !== null) {
      const raw = strMatch[2] || "";
      const text = raw.replace(/\s+/g, " ").trim();
      if (shouldInclude(text)) {
        hits.push({ type: "string", line: i + 1, text });
      }
    }
  }

  return hits;
}

function toMarkdownReport(entries) {
  const lines = [];
  lines.push("# I18N Audit");
  lines.push("");
  lines.push(`Total candidates: **${entries.length}**`);
  lines.push("");

  let currentFile = "";
  for (const entry of entries) {
    if (entry.file !== currentFile) {
      currentFile = entry.file;
      lines.push(`## ${currentFile}`);
    }
    lines.push(`- L${entry.line} · ${entry.type} · ${entry.text}`);
  }

  lines.push("");
  lines.push(
    "Nota: esta lista es heurística. Revisa manualmente antes de mover a i18n."
  );
  lines.push("");
  return lines.join("\n");
}

function loadBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) return null;
  const content = fs.readFileSync(baselinePath, "utf8");
  const lines = content.split(/\r?\n/);
  const items = new Set();
  let currentFile = "";
  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentFile = line.replace(/^##\s+/, "").trim();
      continue;
    }
    if (line.startsWith("- L")) {
      const parts = line.split("·").map((p) => p.trim());
      const text = parts[2] || "";
      if (currentFile && text) {
        items.add(`${currentFile}|${text}`);
      }
    }
  }
  return items;
}

function main() {
  const opts = parseArgs();
  const root = path.join(__dirname, "..");
  const files = opts.paths.length
    ? opts.paths.map((p) => path.resolve(root, p))
    : walk(root);

  const allEntries = [];
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const hits = scanFile(filePath);
    for (const hit of hits) {
      if (allEntries.length >= opts.limit) break;
      allEntries.push({
        file: path.relative(root, filePath),
        ...hit,
      });
    }
    if (allEntries.length >= opts.limit) break;
  }

  if (!opts.check) {
    const outPath = path.resolve(root, opts.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, toMarkdownReport(allEntries), "utf8");
    console.log(`✅ I18N audit generated: ${path.relative(root, outPath)}`);
  }

  if (opts.check && allEntries.length > 0) {
    const baselinePath = path.resolve(root, opts.baseline);
    const baseline = loadBaseline(baselinePath);
    if (!baseline) {
      console.log(`❌ Baseline not found: ${path.relative(root, baselinePath)}`);
      process.exit(1);
    }
    const currentSet = new Set(
      allEntries.map((e) => `${e.file}|${e.text}`)
    );
    const newOnes = [...currentSet].filter((k) => !baseline.has(k));
    if (newOnes.length > 0) {
      console.log("❌ I18N audit found new hardcoded strings.");
      newOnes.slice(0, 50).forEach((k) => console.log(`- ${k}`));
      if (newOnes.length > 50) {
        console.log(`...and ${newOnes.length - 50} more`);
      }
      process.exit(1);
    }
    console.log("✅ I18N check passed (no new strings).");
  }
}

main();
