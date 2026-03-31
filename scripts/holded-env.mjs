import fs from 'node:fs';
import path from 'node:path';

export function parseEnv(text) {
  const out = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let [, key, value] = match;
    value = value.trim();
    value = value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

export function loadHoldedEnvConfig(rootDir = process.cwd()) {
  const directApiKey =
    process.env.HOLDED_TEST_API_KEY?.trim() || process.env.HOLDED_API_KEY?.trim() || '';
  const directBaseUrl = process.env.HOLDED_API_BASE_URL?.trim() || '';

  if (directApiKey) {
    return {
      apiKey: directApiKey,
      baseUrl: directBaseUrl || 'https://api.holded.com',
      source: 'process.env',
    };
  }

  const envCandidates = [
    path.join(rootDir, 'apps', 'holded', '.env.local'),
    path.join(rootDir, '.env.local'),
  ];

  for (const candidate of envCandidates) {
    if (!fs.existsSync(candidate)) continue;

    const parsed = parseEnv(fs.readFileSync(candidate, 'utf8'));
    const fileApiKey = parsed.HOLDED_TEST_API_KEY?.trim() || parsed.HOLDED_API_KEY?.trim() || '';

    if (!fileApiKey) continue;

    return {
      apiKey: fileApiKey,
      baseUrl: (parsed.HOLDED_API_BASE_URL || 'https://api.holded.com').trim(),
      source: path.relative(rootDir, candidate),
    };
  }

  return {
    apiKey: '',
    baseUrl: 'https://api.holded.com',
    source: 'not found',
  };
}
