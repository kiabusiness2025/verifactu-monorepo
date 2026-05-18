// scripts/validate-openai-submission.mjs
// Validates docs/openai-submission/chatgpt-app-submission.json against the
// chatgpt-app-submission.v1.json schema rules documented at
// https://github.com/openai/plugins/blob/main/plugins/openai-developers/skills/chatgpt-app-submission/SKILL.md
//
// This file is what we upload to the OpenAI App Review portal. The portal
// rejects any submission that does not match the schema URL exactly, so we
// validate locally before pushing.
import fs from 'fs';
import path from 'path';

const file = path.resolve('docs/openai-submission/chatgpt-app-submission.json');
const raw = fs.readFileSync(file, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}

const errors = [];
function fail(msg) {
  errors.push(msg);
}

// --- schema identity ---
if (data.$schema !== 'https://developers.openai.com/apps-sdk/schemas/chatgpt-app-submission.v1.json') {
  fail(`$schema must be the canonical chatgpt-app-submission.v1.json URL (got ${JSON.stringify(data.$schema)})`);
}
if (data.schema_version !== 1) {
  fail(`schema_version must be 1 (got ${JSON.stringify(data.schema_version)})`);
}

// --- app_info ---
const ALLOWED_CATEGORIES = [
  'BUSINESS',
  'COLLABORATION',
  'DESIGN',
  'DEVELOPER_TOOLS',
  'EDUCATION',
  'ENTERTAINMENT',
  'FINANCE',
  'FOOD',
  'LIFESTYLE',
  'NEWS',
  'PRODUCTIVITY',
  'SHOPPING',
  'TRAVEL',
];
const appInfo = data.app_info ?? {};
if (typeof appInfo.display_name !== 'string' || !appInfo.display_name.trim()) {
  fail('app_info.display_name must be a non-empty string');
}
if (typeof appInfo.subtitle !== 'string' || !appInfo.subtitle.trim()) {
  fail('app_info.subtitle must be a non-empty string');
} else if (appInfo.subtitle.length > 30) {
  fail(`app_info.subtitle must be ≤30 chars (got ${appInfo.subtitle.length})`);
}
if (typeof appInfo.description !== 'string' || !appInfo.description.trim()) {
  fail('app_info.description must be a non-empty string');
}
if (!ALLOWED_CATEGORIES.includes(appInfo.category)) {
  fail(`app_info.category must be one of ${ALLOWED_CATEGORIES.join(', ')} (got ${JSON.stringify(appInfo.category)})`);
}

// --- tools ---
if (!data.tools || typeof data.tools !== 'object' || Array.isArray(data.tools)) {
  fail('tools must be an object');
}
const toolNames = Object.keys(data.tools ?? {});
if (toolNames.length === 0) {
  fail('tools must contain at least one entry');
}
for (const [tool, def] of Object.entries(data.tools ?? {})) {
  if (!def.annotations || typeof def.annotations !== 'object') {
    fail(`tools.${tool}.annotations missing`);
    continue;
  }
  const a = def.annotations;
  for (const hint of ['readOnlyHint', 'openWorldHint', 'destructiveHint']) {
    if (typeof a[hint] !== 'boolean') {
      fail(`tools.${tool}.annotations.${hint} must be boolean (got ${JSON.stringify(a[hint])})`);
    }
  }
  if (!def.justifications || typeof def.justifications !== 'object') {
    fail(`tools.${tool}.justifications missing`);
    continue;
  }
  for (const key of ['read_only_justification', 'open_world_justification', 'destructive_justification']) {
    const value = def.justifications[key];
    if (typeof value !== 'string' || !value.trim()) {
      fail(`tools.${tool}.justifications.${key} must be a non-empty string`);
    }
  }
}

// --- test_cases / negative_test_cases ---
function validateTestCase(prefix, tc, index, opts) {
  if (typeof tc.description !== 'string' || !tc.description.trim()) {
    fail(`${prefix}[${index}].description must be a non-empty string`);
  }
  if (typeof tc.user_prompt !== 'string' || !tc.user_prompt.trim()) {
    fail(`${prefix}[${index}].user_prompt must be a non-empty string`);
  }
  if (typeof tc.expected_output !== 'string' || !tc.expected_output.trim()) {
    fail(`${prefix}[${index}].expected_output must be a non-empty string`);
  }
  // tools_triggered may be string (comma-separated tool names) or null
  if (opts.expectToolsNull) {
    if (tc.tools_triggered !== null) {
      fail(`${prefix}[${index}].tools_triggered must be null for negative tests (got ${JSON.stringify(tc.tools_triggered)})`);
    }
  } else {
    if (typeof tc.tools_triggered !== 'string' || !tc.tools_triggered.trim()) {
      fail(`${prefix}[${index}].tools_triggered must be a non-empty string for positive tests`);
    } else {
      const referenced = tc.tools_triggered.split(',').map((s) => s.trim()).filter(Boolean);
      for (const ref of referenced) {
        if (!toolNames.includes(ref)) {
          fail(`${prefix}[${index}].tools_triggered references unknown tool "${ref}"`);
        }
      }
    }
  }
}
if (Array.isArray(data.test_cases)) {
  data.test_cases.forEach((tc, i) => validateTestCase('test_cases', tc, i, { expectToolsNull: false }));
} else if (data.test_cases !== undefined) {
  fail('test_cases must be an array if present');
}
if (Array.isArray(data.negative_test_cases)) {
  data.negative_test_cases.forEach((tc, i) =>
    validateTestCase('negative_test_cases', tc, i, { expectToolsNull: true })
  );
} else if (data.negative_test_cases !== undefined) {
  fail('negative_test_cases must be an array if present');
}

if (errors.length > 0) {
  console.error('Validation failed:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

const writeTools = Object.entries(data.tools)
  .filter(([, t]) => t.annotations.readOnlyHint === false)
  .map(([n]) => n);
console.log('Validation passed.');
console.log('  display_name:', data.app_info.display_name);
console.log('  subtitle:', JSON.stringify(data.app_info.subtitle), `(${data.app_info.subtitle.length}/30 chars)`);
console.log('  category:', data.app_info.category);
console.log('  tools:', toolNames.length, '(write:', writeTools.length, '→', writeTools.join(', ') + ')');
console.log('  test_cases:', (data.test_cases ?? []).length);
console.log('  negative_test_cases:', (data.negative_test_cases ?? []).length);
