import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const appDir = process.cwd();
const rootDir = resolve(appDir, "..", "..");
const nextDir = resolve(rootDir, ".next");

function collectJsonFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".nft.json") || entry.name === "required-server-files.json")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeEntries(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);

  const baseDir = dirname(filePath);
  let updated = false;

  if (Array.isArray(json.files)) {
    const normalized = [];
    for (const entry of json.files) {
      if (typeof entry !== "string") {
        normalized.push(entry);
        continue;
      }

      let relPath = entry.replace(/^\.\//, "");

      if (relPath.startsWith("..")) {
        const absPath = resolve(baseDir, relPath);
        relPath = relative(rootDir, absPath).replace(/\\/g, "/");
      }

      if (!relPath.startsWith("..")) {
        normalized.push(relPath);
      } else {
        updated = true;
      }

      if (relPath !== entry) {
        updated = true;
      }
    }
    json.files = normalized;
  }

  if (updated) {
    writeFileSync(filePath, JSON.stringify(json));
  }
}

if (!statSync(nextDir, { throwIfNoEntry: false })) {
  process.exit(0);
}

const files = collectJsonFiles(nextDir);
for (const file of files) {
  normalizeEntries(file);
}
