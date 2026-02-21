#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_TARGETS = ['apps/app'];
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css', '.scss', '.html', '.yml', '.yaml'
]);
const IGNORE_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', 'coverage', '.turbo', '.vercel'
]);

const MOJIBAKE_PATTERNS = [
  /\uFFFD/g, // replacement char
  /\u00EF\u00BB\u00BF/g, // utf-8 bom decoded as visible chars
  /Ã[\x80-\xBF]/g,
  /Â[\x80-\xBF]/g,
  /â[\x80-\xBF]/g,
];

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }
}

function findMatches(content) {
  const matches = [];
  for (const pattern of MOJIBAKE_PATTERNS) {
    let result;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((result = regex.exec(content)) !== null) {
      matches.push({ index: result.index, text: result[0] });
      if (result.index === regex.lastIndex) regex.lastIndex += 1;
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

function toLineCol(content, index) {
  const upToIndex = content.slice(0, index);
  const lines = upToIndex.split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  return { line, col };
}

function main() {
  const targets = process.argv.slice(2);
  const roots = (targets.length ? targets : DEFAULT_TARGETS).map((p) => path.resolve(process.cwd(), p));

  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stat = fs.statSync(root);
    if (stat.isDirectory()) {
      walk(root, files);
    } else if (stat.isFile() && shouldScanFile(root)) {
      files.push(root);
    }
  }

  const findings = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = findMatches(content);
    for (const match of matches) {
      const { line, col } = toLineCol(content, match.index);
      findings.push({ filePath, line, col, text: match.text });
    }
  }

  if (findings.length === 0) {
    console.log('OK: no mojibake patterns detected.');
    process.exit(0);
  }

  console.error(`Found ${findings.length} potential encoding issues:`);
  for (const finding of findings.slice(0, 200)) {
    const relative = path.relative(process.cwd(), finding.filePath);
    console.error(`- ${relative}:${finding.line}:${finding.col} -> "${finding.text}"`);
  }
  if (findings.length > 200) {
    console.error(`... and ${findings.length - 200} more`);
  }
  process.exit(1);
}

main();
