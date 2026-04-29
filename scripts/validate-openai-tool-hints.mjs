// scripts/validate-openai-tool-hints.mjs
// Validates docs/openai-submission/tool-hint-justifications.json for OpenAI submission
import fs from 'fs';
import path from 'path';

const file = path.resolve('docs/openai-submission/tool-hint-justifications.json');
const raw = fs.readFileSync(file, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}

function fail(msg) {
  console.error('Validation failed:', msg);
  process.exit(1);
}

if (data.$schema !== 'https://developers.openai.com/apps-sdk/schemas/tool-hint-justifications.v1.json') {
  fail('Invalid $schema');
}
if (data.schema_version !== 1) {
  fail('schema_version !== 1');
}
if (!data.tools || typeof data.tools !== 'object' || Array.isArray(data.tools)) {
  fail('tools must be an object');
}
const expectedTools = [
  'holded_list_invoices',
  'holded_get_invoice',
  'holded_list_contacts',
  'holded_get_contact',
  'holded_list_accounts',
  'holded_list_daily_ledger',
  'holded_list_bookings',
  'holded_list_projects',
  'holded_get_project',
  'holded_list_project_tasks',
  'holded_create_invoice_draft'
];
for (const tool of expectedTools) {
  if (!data.tools[tool]) fail(`Missing tool: ${tool}`);
}
for (const [tool, def] of Object.entries(data.tools)) {
  if (!def.annotations || typeof def.annotations !== 'object') fail(`Missing annotations for ${tool}`);
  if (!def.justifications || typeof def.justifications !== 'object') fail(`Missing justifications for ${tool}`);
  const a = def.annotations;
  if (typeof a.readOnlyHint !== 'boolean') fail(`readOnlyHint not boolean for ${tool}`);
  if (typeof a.openWorldHint !== 'boolean') fail(`openWorldHint not boolean for ${tool}`);
  if (typeof a.destructiveHint !== 'boolean') fail(`destructiveHint not boolean for ${tool}`);
  const j = def.justifications;
  for (const k of ['read_only_justification','open_world_justification','destructive_justification']) {
    if (typeof j[k] !== 'string' || !j[k].trim()) fail(`Empty or missing ${k} for ${tool}`);
  }
}
if (data.tools['holded_create_invoice_draft'].annotations.readOnlyHint !== false) fail('holded_create_invoice_draft.readOnlyHint must be false');
for (const tool of expectedTools) {
  if (tool !== 'holded_create_invoice_draft' && data.tools[tool].annotations.readOnlyHint !== true) fail(`${tool}.readOnlyHint must be true`);
}
console.log('Validation passed.');
