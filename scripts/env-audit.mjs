import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const found = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p);
    } else if (ent.name.startsWith(".env")) {
      found.push(p);
    }
  }
}

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    value = value.trim();
    value = value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

walk(root);

const keyMap = new Map();
for (const file of found) {
  const text = fs.readFileSync(file, "utf8");
  const parsed = parseEnv(text);
  for (const [key, value] of Object.entries(parsed)) {
    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key).push({ file, value });
  }
}

console.log("ENV files found:");
for (const file of found.sort()) console.log(" -", file);

console.log("\nKeys summary:");
const keys = [...keyMap.keys()].sort();
for (const key of keys) {
  const entries = keyMap.get(key);
  const uniq = new Set(entries.map((entry) => entry.value));
  const status = uniq.size > 1 ? "CONFLICT" : "OK";
  console.log(`${status}\t${key}\t(${entries.length} occurrences, ${uniq.size} unique)`);
  if (uniq.size > 1) {
    for (const entry of entries) {
      const shown = entry.value.length > 60 ? `${entry.value.slice(0, 60)}…` : entry.value;
      console.log("   ", entry.file, "=", shown);
    }
  }
}
