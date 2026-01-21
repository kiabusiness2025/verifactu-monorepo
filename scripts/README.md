# Testing Scripts

## Phase 2 Operations Testing

### Prerequisites
- Admin panel running on http://localhost:3003
- Logged in as ADMIN user
- Database connected (Prisma Accelerate)

### Quick Test

1. **Create test data:**
```bash
./scripts/test-phase2.sh
```

2. **Visit Operations Dashboard:**
```
http://localhost:3003/operations
```

3. **Check test webhook:**
```
http://localhost:3003/operations/webhooks?provider=STRIPE&status=FAILED
```

4. **Check test email:**
```
http://localhost:3003/operations/emails?status=FAILED
```

### Manual Test: Retry Webhook

1. Go to `/operations/webhooks`
2. Click on a failed webhook
3. Click "Retry" button
4. Verify new attempt created
5. Check AuditLog for WEBHOOK_RETRY action

### Manual Test: Block User

1. Go to `/users`
2. Click on a user
3. Click "Block User"
4. Enter reason: "Test blocking"
5. Verify user status changes to "Blocked"
6. Check AuditLog for USER_BLOCK action

### Manual Test: Send Email

1. Go to `/users/[id]`
2. Click "Send Email"
3. Enter subject and message
4. Click "Send Email"
5. Verify EmailEvent created
6. Check `/operations/emails` for new email

### Test Stripe Webhook (requires Stripe CLI)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger customer.subscription.created
```

Then check `/operations/webhooks` for new webhook.

### Cleanup Test Data

```bash
# Remove test webhooks
psql "$DATABASE_URL" -c "DELETE FROM \"WebhookEvent\" WHERE \"externalId\" LIKE 'evt_test_%';"

# Remove test emails
psql "$DATABASE_URL" -c "DELETE FROM \"EmailEvent\" WHERE \"messageId\" LIKE 'msg_test_%';"

# Unblock all users
psql "$DATABASE_URL" -c "UPDATE \"User\" SET \"isBlocked\" = false, \"blockedAt\" = NULL, \"blockedReason\" = NULL;"
```
