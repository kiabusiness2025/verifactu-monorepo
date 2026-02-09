import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const basePath = path.join(root, "env", ".env.base");

if (!fs.existsSync(basePath)) {
  console.error("env/.env.base no existe. Crea el archivo y vuelve a ejecutar.");
  process.exit(1);
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
    value = value.replace(/\r/g, "");
    out[key] = value;
  }
  return out;
}

function renderEnv(keys, values) {
  const lines = [];
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      lines.push(`${key}=${values[key]}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

const base = parseEnv(fs.readFileSync(basePath, "utf8"));

const commonPublic = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_LANDING_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_USE_AUTH_EMULATOR",
  "NEXT_PUBLIC_ISAAK_API_KEY",
  "NEXT_PUBLIC_ISAAK_ASSISTANT_ID",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
];

const sharedSession = [
  "SESSION_SECRET",
  "SESSION_COOKIE_DOMAIN",
  "SESSION_COOKIE_SECURE",
  "SESSION_COOKIE_SAMESITE",
  "SUPPORT_HANDOFF_SECRET",
];

const sharedDb = ["DATABASE_URL", "DIRECT_DATABASE_URL", "PRISMA_DATABASE_URL", "POSTGRES_URL"];

const einforma = [
  "EINFORMA_TOKEN_URL",
  "EINFORMA_API_BASE_URL",
  "EINFORMA_CLIENT_ID",
  "EINFORMA_CLIENT_SECRET",
  "EINFORMA_SCOPE",
  "EINFORMA_SEARCH_PARAMS",
  "EINFORMA_TIMEOUT_MS",
  "EINFORMA_API_KEY",
];

const firebaseAdmin = ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_SERVICE_ACCOUNT"];

const oauth = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"];

const resend = ["RESEND_API_KEY", "RESEND_FROM", "RESEND_FROM_SUPPORT", "RESEND_FROM_INFO", "RESEND_FROM_NOREPLY", "RESEND_WEBHOOK_SECRET"];

const stripe = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_BASE_MONTHLY",
  "STRIPE_PRICE_COMPANY_UNIT_MONTHLY",
  "STRIPE_PRICE_INVOICES_11_50_MONTHLY",
  "STRIPE_PRICE_INVOICES_51_200_MONTHLY",
  "STRIPE_PRICE_INVOICES_201_500_MONTHLY",
  "STRIPE_PRICE_INVOICES_501_1000_MONTHLY",
  "STRIPE_PRICE_INVOICES_1001_2000_MONTHLY",
  "STRIPE_PRICE_MOV_1_100_MONTHLY",
  "STRIPE_PRICE_MOV_1_200_MONTHLY",
  "STRIPE_PRICE_MOV_201_800_MONTHLY",
  "STRIPE_PRICE_MOV_801_2000_MONTHLY",
  "STRIPE_PRICE_MOV_2001_5000_MONTHLY",
];

const ai = ["CLAVE_API_AI_VERCEL", "ISAAK_API_KEY", "ISAAK_ASSISTANT_ID", "OPENAI_API_KEY"];

const adminOnly = ["ADMIN_EMAILS", "ADMIN_ALLOWED_EMAIL", "ADMIN_ALLOWED_DOMAIN", "ADMIN_UIDS", "ADMIN_LOCAL_BYPASS"];

const organization = ["ORGANIZATION_NAME", "ORGANIZATION_CIF", "ORGANIZATION_ADDRESS"];

const aeat = ["AEAT_CERT_PATH", "AEAT_CERT_PASS_PATH", "AEAT_WSDL_FILE"];

// Ajusta estas listas si necesitas mover Stripe/Resend a app.
const appKeys = [
  ...commonPublic,
  ...sharedSession,
  ...sharedDb,
  ...einforma,
  ...firebaseAdmin,
  ...oauth,
  ...organization,
  ...ai,
  ...resend,
];

const adminKeys = [
  ...commonPublic,
  ...sharedSession,
  ...sharedDb,
  ...einforma,
  ...firebaseAdmin,
  ...oauth,
  ...organization,
  ...ai,
  ...adminOnly,
  ...resend,
  ...stripe,
];

const landingKeys = [
  ...commonPublic,
  ...organization,
  ...stripe,
];

const apiKeys = [
  ...sharedDb,
  ...einforma,
  ...aeat,
  ...resend,
  ...stripe,
  ...organization,
];

const outputs = [
  { file: path.join(root, "apps", "app", ".env.local"), keys: appKeys },
  { file: path.join(root, "apps", "admin", ".env.local"), keys: adminKeys },
  { file: path.join(root, "apps", "landing", ".env.local"), keys: landingKeys },
  { file: path.join(root, "apps", "api", ".env.local"), keys: apiKeys },
];

for (const output of outputs) {
  const content = renderEnv(output.keys, base);
  fs.writeFileSync(output.file, content, "utf8");
  console.log(`Wrote ${output.file}`);
}
