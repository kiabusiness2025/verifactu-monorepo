# Vercel identity and OAuth matrix (2026-05-05)

Scope: audited with Vercel CLI across production, preview, development.

## Projects and IDs

- verifactu-monorepo-landing: prj_D14lPJ1l6d53FuqDzBeT9EVIfsBV
- verifactu-monorepo-holded: prj_kCGGYJyl72vzAGhvYkM8JENmX6dM
- verifactu-monorepo-isaak: prj_XOpCFEiVTezszb41lKrm7VSZPVYD
- verifactu-monorepo-app: prj_ZBVvfBkBG6b4MmSCD9aRQM7QAPAU
- verifactu-monorepo-admin: prj_gR6IxRAjaidE3AdfGR7lFG1Z0ERo
- verifactu-monorepo-client: prj_zJbkVhjVBLcY91CGzNq857GMqI6X
- verifactu-monorepo-api: prj_6D7AuB5irM4Y5fQrExrLWCwRVAqI

## Identity and session consistency

Expected baseline for web user identity:

- SESSION_COOKIE_DOMAIN=.verifactu.business
- SESSION_COOKIE_SAMESITE=none
- SESSION_COOKIE_SECURE=true

Observed:

- landing: baseline present in all environments.
- holded: baseline present in all environments.
- isaak: baseline present in all environments.
- app: baseline missing in all environments.
- admin: baseline not present (admin currently uses its own auth config path).
- client: baseline complete in production, partial in preview/development.
- api: no identity env set.

## OAuth and Firebase signals

Observed:

- isaak uses GOOGLE_CLIENT_ID in production.
- admin uses GOOGLE_CLIENT_ID in production/preview/development.
- client uses GOOGLE_CLIENT_ID in production/preview/development.
- landing does not expose GOOGLE_CLIENT_ID in audited keys.

Firebase project alignment:

- landing/app/client reference verifactu-business.
- holded references verifactu-business-48021-352e0.
- This indicates split Firebase projects in active environments.

## Redirect URI references in code/docs

- admin callback route reference: /api/auth/callback/google.
- isaak callback route reference: /api/isaak/google/callback.

## Findings and risks

1. Architecture mismatch with single-Firebase recommendation:
   - Active env uses at least two Firebase projects.
2. Session policy drift risk:
   - app project does not have explicit session cookie policy vars.
   - client preview/development have partial session cookie vars.
3. Environment hygiene:
   - Some imported values include trailing CRLF sequences (\\r\\n).

## Required actions

1. Standardize session cookie vars in app/client preview/development to baseline.
2. Decide and document whether holded remains on dedicated Firebase project or migrates to unified identity Firebase.
3. Normalize imported env values to remove trailing CRLF artifacts.
4. Rotate secrets if any sensitive values were ever exported to tracked files.
