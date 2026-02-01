# Phase 2: Operations Center

## Overview

The Operations Center is a comprehensive monitoring and management system for tracking webhooks, emails, and support actions in the Verifactu admin panel.

## Database Models

### WebhookEvent

Tracks all incoming webhooks from external services (Stripe, Resend, AEAT).

**Fields:**

- `provider`: STRIPE | RESEND | AEAT
- `externalId`: External event ID (e.g., Stripe event ID)
- `eventType`: Event type (e.g., "customer.subscription.updated")
- `status`: RECEIVED | PROCESSING | PROCESSED | FAILED | IGNORED
- `payload`: Full webhook JSON payload
- `signatureOk`: Signature verification result
- `receivedAt`: Timestamp when webhook was received
- `processedAt`: Timestamp when webhook was processed
- `lastError`: Error message if processing failed
- `attempts`: Relation to WebhookAttempt records

### WebhookAttempt

Tracks retry attempts for webhook processing.

**Fields:**

- `attemptNumber`: Retry attempt number (1-5)
- `ok`: Whether attempt succeeded
- `error`: Error message if failed
- `startedAt`: When attempt started
- `finishedAt`: When attempt completed

### EmailEvent

Tracks outgoing emails sent via Resend.

**Fields:**

- `messageId`: Resend message ID
- `to`: Recipient email
- `template`: Template name (optional)
- `subject`: Email subject
- `status`: QUEUED | SENT | DELIVERED | BOUNCED | COMPLAINED | FAILED
- `provider`: "resend"
- `payload`: Additional data
- `lastError`: Error message if failed
- `userId`: Associated user (optional)
- `companyId`: Associated company (optional)

### User Extensions

Added blocking capabilities to User model:

**New Fields:**

- `isBlocked`: Boolean, default false
- `blockedAt`: Timestamp when user was blocked
- `blockedReason`: Reason for blocking (required when blocking)

## API Routes

### Admin API (/api/admin/\*)

All routes require admin authentication via `requireAdminSession()`.

#### Operations Summary

```
GET /api/admin/operations/summary
Response: { webhooks: { total, failed }, emails: { total, failed }, blockedUsers }
```

#### Webhooks

```
GET /api/admin/webhooks?provider=STRIPE&status=FAILED&page=1&limit=20
GET /api/admin/webhooks/[id]
POST /api/admin/webhooks/[id]/retry
```

#### Emails

```
GET /api/admin/emails?status=FAILED&page=1&limit=20
GET /api/admin/emails/[id]
POST /api/admin/emails/[id]/retry
```

#### User Actions

```
POST /api/admin/users/[id]/block
Body: { reason: string }

POST /api/admin/users/[id]/unblock

POST /api/admin/users/[id]/send-email
Body: { subject: string, message: string }
```

### Webhook Ingestion (/api/webhooks/\*)

Public endpoints for receiving webhooks from external services.

#### Stripe

```
POST /api/webhooks/stripe
Headers: stripe-signature
Body: Stripe webhook event
```

**Supported Events:**

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### Resend

```
POST /api/webhooks/resend
Headers: resend-signature (optional)
Body: Resend webhook event
```

**Supported Events:**

- `email.sent`
- `email.delivered`
- `email.bounced`
- `email.complained`
- `email.delivery_delayed`
- `email.received` (mailbox)

#### AEAT

```
POST /api/webhooks/aeat
Body: AEAT webhook event
```

**Note:** AEAT webhook format TBD - placeholder implementation.

## UI Pages

### Operations Dashboard

```
/operations
```

Shows overview cards:

- Total webhooks / failed webhooks
- Total emails / failed emails
- Blocked users count

### Webhooks List

```
/operations/webhooks?provider=STRIPE&status=FAILED
```

Features:

- Filter by provider (STRIPE, RESEND, AEAT)
- Filter by status (RECEIVED, PROCESSING, PROCESSED, FAILED, IGNORED)
- Paginated table with webhook details
- View button to see webhook details

### Webhook Detail

```
/operations/webhooks/[id]
```

Shows:

- Provider, event type, status
- Signature verification status
- Received/processed timestamps
- Full JSON payload
- Retry attempts with status
- Retry button (max 5 attempts)

### Emails List

```
/operations/emails?status=FAILED
```

Features:

- Filter by status (QUEUED, SENT, DELIVERED, BOUNCED, COMPLAINED, FAILED)
- Paginated table with email details
- View button to see email details

### Email Detail

```
/operations/emails/[id]
```

Shows:

- To, subject, template
- Status, provider, message ID
- Created/updated timestamps
- Associated user/company
- Error message if failed
- Retry button

### User Detail (Enhanced)

```
/users/[id]
```

New support actions section:

- **Block User**: Dialog with reason input, writes to AuditLog
- **Unblock User**: Button, writes to AuditLog
- **Send Email**: Dialog with subject/message, creates EmailEvent

## Audit Logging

All operations actions write to AuditLog with new action types:

### New Audit Actions

- `WEBHOOK_RETRY`: When admin retries failed webhook
- `EMAIL_RETRY`: When admin retries failed email
- `USER_BLOCK`: When admin blocks user
- `USER_UNBLOCK`: When admin unblocks user
- `EMAIL_SEND`: When admin sends email to user

**Metadata Structure:**

```typescript
{
  webhookId?: string;
  emailId?: string;
  provider?: string;
  attemptNumber?: number;
  reason?: string; // for blocking
  subject?: string; // for email send
  to?: string;
  template?: string;
}
```

## Webhook Processing Flow

1. **Receive**: Webhook hits ingestion endpoint
2. **Verify**: Check signature (Stripe only for now)
3. **Check Duplicate**: Query by externalId to prevent re-processing
4. **Create WebhookEvent**: Store with status RECEIVED
5. **Create WebhookAttempt**: First attempt (number 1)
6. **Process**: Call provider-specific handler
7. **Update Status**: PROCESSED or FAILED with error
8. **Update Attempt**: Mark as ok/failed with timestamp

## Retry Logic

### Webhooks

- Max 5 retry attempts
- Manual retry from admin UI
- Each retry creates new WebhookAttempt record
- Status transitions: FAILED → PROCESSING → PROCESSED/FAILED

### Emails

- Max 3 retry attempts (Resend limit)
- Manual retry from admin UI
- Calls Resend API to resend email
- Updates EmailEvent status

## Idempotency

### Webhooks

- Uses `externalId` to prevent duplicate processing
- Returns `{ received: true, duplicate: true }` for duplicates

### Emails

- Resend provides messageId after sending
- Stored in EmailEvent for tracking
- Webhooks update EmailEvent by messageId

## Environment Variables

### Required

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=... (optional)

# Database
DATABASE_URL=... (Prisma Accelerate)
```

## Webhook Configuration

### Stripe

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://app.verifactu.business/api/webhooks/stripe`
3. Select events: subscription._, invoice._
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### Resend

1. Go to https://resend.com/webhooks
2. Add webhook: `https://app.verifactu.business/api/webhooks/resend`
3. Select events: email.sent, email.delivered, email.bounced, email.complained, email.received
4. Copy webhook secret to `RESEND_WEBHOOK_SECRET` (optional)

### AEAT

TBD - webhook format not yet defined.

## Security

### Authentication

- All admin API routes require `requireAdminSession()`
- Checks JWT session with role validation
- User must have @verifactu.business email

### Webhook Verification

- **Stripe**: Uses `stripe.webhooks.constructEvent()` with signature
- **Resend**: Optional signature verification via header
- **AEAT**: TBD

### RBAC

- Only ADMIN and SUPPORT roles can access operations center
- Middleware checks role from JWT session
- All actions logged to AuditLog with adminUserId

## Next Steps

### TODO

- [ ] Implement actual webhook processing logic (currently simulated)
- [ ] Add webhook retry queue with exponential backoff
- [ ] Add email templates for support communications
- [ ] Implement AEAT webhook signature verification
- [ ] Add notification system for high-priority webhooks/emails
- [ ] Add export functionality for webhook/email logs
- [ ] Add search functionality in operations UI
- [ ] Implement bulk actions (retry all failed, etc.)

### Future Enhancements

- Real-time webhook status updates via WebSocket
- Webhook processing metrics and charts
- Email template editor
- Automated retry with exponential backoff
- Slack notifications for critical failures
- Webhook replay from admin UI
- User notification preferences

## Testing

### Manual Testing

1. **Trigger Stripe Webhook:**

```bash
stripe trigger customer.subscription.created
```

2. **Check Webhook in UI:**

- Go to `/operations/webhooks`
- Filter by provider: STRIPE
- Click webhook to see details

3. **Retry Failed Webhook:**

- Open failed webhook detail
- Click "Retry" button
- Verify new attempt created

4. **Block User:**

- Go to `/users/[id]`
- Click "Block User"
- Enter reason
- Verify status changes to "Blocked"

5. **Send Email to User:**

- Go to `/users/[id]`
- Click "Send Email"
- Enter subject and message
- Verify EmailEvent created

### Test Data

Create test webhooks directly in database:

```typescript
await prisma.webhookEvent.create({
  data: {
    provider: 'STRIPE',
    externalId: 'evt_test_123',
    eventType: 'customer.subscription.updated',
    payload: { test: true },
    signatureOk: true,
    status: 'FAILED',
    lastError: 'Test error',
  },
});
```

## Troubleshooting

### Webhooks not appearing

- Check webhook endpoint is publicly accessible
- Verify webhook secret in environment variables
- Check webhook signature verification
- Review console logs for errors

### Retry not working

- Verify max attempts not exceeded (5 for webhooks)
- Check admin session authentication
- Review AuditLog for retry actions
- Check WebhookAttempt records

### Emails not tracking

- Verify Resend webhook configured
- Check messageId is being stored
- Verify EmailEvent created when sending
- Review Resend dashboard for delivery status

## Architecture Decisions

### Why WebhookAttempt separate from WebhookEvent?

- Allows detailed retry history
- Supports multiple retry strategies
- Easier to query retry metrics
- Maintains clean webhook event record

### Why track emails separately from webhooks?

- Different lifecycle and states
- User/company context needed
- Template support
- Support for manual sends

### Why manual retry instead of automatic?

- Admin control over resources
- Prevents retry loops
- Allows investigation before retry
- Simpler initial implementation

### Why max 5 webhook retries?

- Prevents infinite loops
- Matches Stripe's retry policy
- Reasonable for transient failures
- Admin can always retry manually

## Migration History

- `20260121131641_bd_1`: Added emailVerified to User
- `20260121133111_bd_2`: Phase 2 operations models (WebhookEvent, WebhookAttempt, EmailEvent, User blocking)
