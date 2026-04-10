# Company Notification Email - Phase 2

## Objective

Allow changing the confirmed company notification email only through a confirmation link sent to the currently confirmed company email.

## Implemented

1. New migration: db/migrations/008_company_notification_email_change_requests.sql
2. New API route: POST /api/integrations/accounting/company-email/change/request
3. New API route: GET /api/integrations/accounting/company-email/change/confirm?token=...
4. New store operations in apps/app/lib/integrations/companyNotificationEmailStore.ts:
   - createCompanyNotificationEmailChangeRequest
   - consumeCompanyNotificationEmailChangeRequest
   - upsertConfirmedCompanyNotificationEmail

## Flow

1. An authenticated tenant user requests a new company notification email.
2. The system checks the currently confirmed company email.
3. The system sends a confirmation link to the current confirmed company email.
4. Only after opening that link, the new email becomes the confirmed company notification email.

## Security rules

1. Confirmation link is one-time use.
2. Confirmation link expires in 45 minutes.
3. Requested email cannot be equal to the current confirmed email.
4. If there is no currently confirmed company email, the request is rejected.

## Response statuses

1. request route
   - 200: request accepted, email sent
   - 400: invalid new email
   - 409: no baseline confirmed email or same email requested
   - 502: confirmation email could not be sent
2. confirm route redirect query
   - company_email_change=confirmed
   - company_email_change=invalid
   - company_email_change=missing
