# Company Notification Email - Phase 1

## Objective

Enable operational security notifications (Holded connect and disconnect) to be delivered to a dedicated company email when available, without disrupting existing onboarding and identity flows.

## Scope delivered

1. Introduce a dedicated storage table for verified company notification email per tenant.
2. Keep Prisma schema unchanged for this phase (low-risk rollout).
3. Use the confirmed company email in Holded connect and disconnect notifications.
4. Prefer confirmed company email for security alert recipient resolution.
5. Preserve existing fallback behavior when the confirmed company email is not set yet.

## Data model (Phase 1)

Table: company_notification_emails

- tenant_id (PK)
- email
- verified_at
- created_at
- updated_at

Migration file: db/migrations/007_add_company_notification_emails.sql

## Runtime behavior

- If a confirmed company notification email exists, connect and disconnect flows use it as companyEmail context.
- Security recipient resolution prioritizes confirmed company notification email.
- If no confirmed email exists, fallback to tenant profile email remains active.

## Out of scope for this phase

- UI to manage company notification email.
- Request and confirm change flow by signed link.
- Forced delivery only to company email (user + admin notifications still remain).

## Phase 2 recommended

1. Add request-change endpoint requiring authenticated tenant context.
2. Send confirmation link to currently confirmed company email.
3. Apply change only after link confirmation.
4. Add audit trail for email changes (who, when, old/new).
5. Add optional dual-confirmation mode (old and new email).
