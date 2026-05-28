# Changelog

All notable changes to `@verifactu/sdk` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/) and the
project adheres to [Semantic Versioning](https://semver.org/).

## 0.1.0 - Unreleased

Initial release.

- `IsaakClient` with Bearer auth, configurable timeout, configurable retries
  and pluggable `fetch`.
- Resources:
  - `client.companies.getCurrent()`
  - `client.invoices.list / get / create / issue / getPdf`
  - `client.keys.list / create`
- Typed error hierarchy: `IsaakError`, `AuthenticationError`,
  `PermissionError`, `NotFoundError`, `ConflictError`,
  `ConfirmationRequiredError`, `ValidationError`, `RateLimitError`,
  `ServerError`, `NetworkError`, `TimeoutError`.
- `withRetry` helper with exponential backoff + jitter, honoring
  `Retry-After`. Auto-attaches `Idempotency-Key` for mutating calls.
- `verifyWebhookSignature` HMAC verifier compatible with Node, Workers, Deno
  and Bun (uses Web Crypto, falls back to `node:crypto`).
- Full TypeScript types matching the public OpenAPI contract.
- No runtime dependencies. Compatible with Node 18+, Deno, Bun and Cloudflare
  Workers.
