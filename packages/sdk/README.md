# @verifactu/sdk

Official TypeScript SDK for the **Isaak Platform API** (Verifactu Business).

Build invoicing, AEAT VeriFactu, banking conciliation and webhooks integrations
on top of [`isaak.verifactu.business`](https://isaak.verifactu.business) with a
fully typed client that runs on Node 18+, Deno, Bun, Cloudflare Workers and any
modern browser (server-side recommended — exposing the API key to a browser is
not secure).

> Pre-1.0 — the public API is stable, but new methods may be added in minor
> releases as we cover the rest of the OpenAPI surface.

Full docs and OpenAPI reference: <https://verifactu.business/developers>

---

## Installation

```bash
pnpm add @verifactu/sdk
# or
npm install @verifactu/sdk
# or
yarn add @verifactu/sdk
```

Requires Node 18+ (or any runtime with global `fetch` and `crypto.subtle`).

## Quickstart

```ts
import { IsaakClient } from '@verifactu/sdk';

const isaak = new IsaakClient({
  apiKey: process.env.ISAAK_API_KEY!, // isk_live_... or isk_test_...
});

const me = await isaak.companies.getCurrent();
console.log(`Authenticated as ${me.legalName} (${me.cif})`);
```

### List invoices

```ts
const page = await isaak.invoices.list({
  from: '2026-01-01',
  to: '2026-12-31',
  status: 'issued',
  limit: 50,
});

for (const invoice of page.data) {
  console.log(invoice.number, invoice.total, invoice.aeatStatus);
}

if (page.pagination.hasMore) {
  const next = await isaak.invoices.list({
    cursor: page.pagination.nextCursor!,
  });
}
```

### Create and issue an invoice (two-step, irreversible)

```ts
import { ConfirmationRequiredError } from '@verifactu/sdk';

const draft = await isaak.invoices.create({
  customer: {
    name: 'ACME SL',
    cif: 'B12345678',
    email: 'billing@acme.com',
  },
  lines: [
    { description: 'Hora de consultoría', quantity: 10, unitPrice: 90, vatRate: 21 },
  ],
});

try {
  // 1st call returns 428 + a confirmation token (preview the user)
  await isaak.invoices.issue(draft.id, { confirmationToken: 'preview' });
} catch (err) {
  if (err instanceof ConfirmationRequiredError) {
    // 2nd call commits the AEAT submission
    const issued = await isaak.invoices.issue(draft.id, {
      confirmationToken: (err.details as { confirmationToken: string }).confirmationToken,
    });
    console.log('Registered with AEAT hash', issued.verifactuHash);
  } else {
    throw err;
  }
}
```

### Download the legal PDF

```ts
const blob = await isaak.invoices.getPdf('inv_2026_0042');
// In Node:
const buf = Buffer.from(await blob.arrayBuffer());
await fs.writeFile('invoice.pdf', buf);
```

### Manage API keys

```ts
const created = await isaak.keys.create({
  name: 'CI / backups',
  scopes: ['isaak.invoices.read', 'isaak.company.read'],
});
console.log('Store this somewhere safe — it is only shown once:', created.plaintext);
```

### Verify a webhook

```ts
import { verifyWebhookSignature } from '@verifactu/sdk';

// Express, Hono, Fastify — any server. The raw body is essential.
export async function handleWebhook(req, res) {
  const result = await verifyWebhookSignature({
    body: req.rawBody, // string of the unparsed JSON
    signatureHeader: req.headers['x-isaak-signature'],
    timestampHeader: req.headers['x-isaak-timestamp'],
    secret: process.env.ISAAK_WEBHOOK_SECRET!,
  });

  if (!result.ok) {
    return res.status(400).json({ error: result.reason });
  }

  const event = JSON.parse(req.rawBody);
  switch (event.type) {
    case 'invoice.issued':
      // ...
      break;
  }
  res.status(200).end();
}
```

## Configuration

```ts
new IsaakClient({
  apiKey: 'isk_live_...',
  baseUrl: 'https://isaak.verifactu.business', // override for staging
  timeout: 30_000,        // ms, per-request
  maxRetries: 3,          // retried on 429 / 5xx for idempotent or Idempotency-Key requests
  fetch: customFetch,     // inject for Workers / tests
  defaultHeaders: { 'X-Trace-Id': 'my-trace' },
});
```

### Retries and idempotency

The SDK retries automatically when:

- the request method is idempotent (`GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`), **or**
- the request carries an `Idempotency-Key` header

…**and** the failure is one of: `429`, `502`, `503`, `504`, or a network /
timeout error. The `Retry-After` header is honored when present.

`invoices.create` and `invoices.issue` automatically attach an
`Idempotency-Key` so retried calls don't create duplicates.

## Errors

Every non-2xx response throws a typed `IsaakError` subclass. The base class
exposes `code`, `httpStatus`, `requestId` and `details`.

| HTTP | Class | When |
| --- | --- | --- |
| 400 / 422 | `ValidationError` | Body or arguments failed validation |
| 401 | `AuthenticationError` | API key missing, invalid or revoked |
| 403 | `PermissionError` | Token valid but lacks the required scope |
| 404 | `NotFoundError` | Resource not found in your tenant |
| 409 | `ConflictError` | State doesn't allow this action |
| 428 | `ConfirmationRequiredError` | Irreversible action; resend with token |
| 429 | `RateLimitError` | Read `retryAfterSeconds` to back off |
| 5xx | `ServerError` | Isaak or AEAT temporary failure |
| — | `NetworkError`, `TimeoutError` | DNS / connection / abort |

```ts
import { IsaakError, RateLimitError } from '@verifactu/sdk';

try {
  await isaak.invoices.list();
} catch (err) {
  if (err instanceof RateLimitError) {
    console.warn(`Throttled, retry after ${err.retryAfterSeconds}s`);
  } else if (err instanceof IsaakError) {
    console.error(err.code, err.httpStatus, err.requestId);
  }
}
```

## Runtimes

The SDK has **no runtime dependencies** and only uses globally available APIs
(`fetch`, `AbortController`, `crypto.subtle`). It's tested on:

- Node 18 / 20 / 22
- Cloudflare Workers
- Deno
- Bun

For browsers, prefer a backend proxy — bundling an API key into client-side
code is never safe.

## Versioning

The SDK follows SemVer:

- **patch**: bug fixes, no behavior changes
- **minor**: new methods / fields (additive)
- **major**: breaking changes — keyed to a stable v1.0 release once the SDK
  covers the full OpenAPI surface

## License

MIT © Verifactu Business
