# Gmail API Environment Setup

## Service Account Details

**Service Account Email:**

```
api-drive-gmail-calendario@verifactu-business-480212.iam.gserviceaccount.com
```

**Client ID:**

```
114995456670039075730
```

**Domain-Wide Delegation:**

- Status: ✅ Enabled
- Impersonates: `support@verifactu.business`

## Required OAuth Scopes in Admin Console

Google Workspace Admin Console must authorize these scopes for Client ID `114995456670039075730`:

```
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/calendar
```

## Environment Variables

Add to `apps/admin/.env`:

```bash
# Gmail API - Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL="api-drive-gmail-calendario@verifactu-business-480212.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...YOUR_PRIVATE_KEY_HERE...==\n-----END PRIVATE KEY-----\n"
```

### How to Get the Private Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `verifactu-business-480212`
3. Navigate to: **IAM & Admin > Service Accounts**
4. Click on: `api-drive-gmail-calendario@...`
5. Go to **Keys** tab
6. Click **Add Key > Create new key**
7. Select **JSON** format
8. Download the JSON file
9. Extract the `private_key` field from the JSON
10. Copy the entire value including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
11. Replace `\n` with actual newlines or keep as `\n` (code handles both)

### Security Notes

- ⚠️ **NEVER** commit the private key to Git
- ✅ Add `.env` to `.gitignore`
- ✅ Use Secret Manager in production (GCP/Vercel)
- ✅ The private key is used to impersonate `support@verifactu.business`
- ✅ Domain-wide delegation allows sending emails on behalf of support@

## Testing Gmail Sending

### 1. Set Environment Variables

```bash
cd apps/admin
# Create or edit .env file with the variables above
```

### 2. Restart Admin Panel

```bash
# Stop current process (Ctrl+C)
pnpm dev
```

### 3. Test via Admin UI

1. Go to http://localhost:3003/users/[user-id]
2. Click **Send Email** button
3. Select **Gmail (support@verifactu.business)** from provider dropdown
4. Enter subject and message
5. Click **Send via GMAIL**
6. Check for success message

### 4. Verify in Database

Open Prisma Studio: http://localhost:5555

**EmailEvent Table:**

- Filter by `provider = GMAIL`
- Check latest record has:
  - `messageId` (Gmail message ID)
  - `threadId` (Gmail thread ID)
  - `fromEmail = "support@verifactu.business"`
  - `status = SENT`

**AuditLog Table:**

- Find latest `EMAIL_SEND` action
- Verify `metadata` includes:
  - `provider: "GMAIL"`
  - `fromEmail: "support@verifactu.business"`

### 5. Check User's Inbox

- Recipient should receive email from `support@verifactu.business`
- Reply will go to Gmail inbox (thread tracking)

## API Usage

### Send Email via Gmail

**Endpoint:** `POST /api/admin/users/:id/send-email`

**Request:**

```json
{
  "subject": "Welcome to Verifactu",
  "message": "<p>Hello! This is a message from our support team.</p>",
  "provider": "GMAIL"
}
```

**Response (Success):**

```json
{
  "success": true,
  "messageId": "18d4a...",
  "threadId": "18d4a...",
  "provider": "GMAIL",
  "fromEmail": "support@verifactu.business"
}
```

**Response (Error):**

```json
{
  "error": "Error message here"
}
```

## Email Provider Strategy

### Gmail (Support Emails)

- **From:** `support@verifactu.business`
- **Use:** Manual support communications
- **Features:**
  - Thread tracking (replies go to Gmail inbox)
  - messageId + threadId stored
  - Domain-wide delegation
- **Retry:** Not supported (manual from inbox)

### Resend (Transactional)

- **From:** `no-reply@verifactu.business`
- **Use:** Automated notifications
- **Features:**
  - Webhook tracking
  - Automatic status updates
  - Retry support via admin UI
- **Retry:** Supported

## Security Implementation

### 1. Hardcoded fromEmail

```typescript
const FROM_EMAIL = 'support@verifactu.business';
```

- Prevents email spoofing
- Always sends from support@ when using Gmail

### 2. Provider Validation

```typescript
if (provider !== 'RESEND' && provider !== 'GMAIL') {
  return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
}
```

### 3. RBAC Protection

```typescript
const session = await requireAdminSession();
```

- Only ADMIN role can send emails
- Enforced at API route level

### 4. Audit Logging

```typescript
prisma.auditLog.create({
  action: 'EMAIL_SEND',
  metadata: { provider, fromEmail, subject, to },
});
```

- All email sends logged
- Includes provider and sender info

## Troubleshooting

### Error: "Missing service account credentials"

- Check `GOOGLE_SERVICE_ACCOUNT_EMAIL` is set
- Check `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is set
- Verify private key format includes `-----BEGIN/END PRIVATE KEY-----`

### Error: "Request had insufficient authentication scopes"

- Verify `gmail.send` scope is authorized in Admin Console
- Client ID: `114995456670039075730`
- Check domain-wide delegation is enabled

### Error: "Domain-wide delegation is not enabled"

- Go to Google Cloud Console
- Service Accounts > api-drive-gmail-calendario@...
- Enable "Google Workspace Domain-wide Delegation"

### Error: "Delegation denied"

- Go to Google Workspace Admin Console
- Security > API Controls > Domain-wide Delegation
- Verify Client ID `114995456670039075730` is listed
- Verify scope `https://www.googleapis.com/auth/gmail.send` is included

## Production Deployment

### Environment Variables in Production

**Vercel:**

```bash
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production
```

**Google Cloud Run:**

```bash
gcloud secrets create GOOGLE_SERVICE_ACCOUNT_EMAIL --data-file=-
gcloud secrets create GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY --data-file=-
```

### Health Check

Create a test endpoint to verify Gmail API access:

```bash
curl -X POST http://localhost:3003/api/admin/users/[test-user-id]/send-email \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","message":"Test","provider":"GMAIL"}'
```

Expected: `{"success":true,...}`

## References

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Domain-Wide Delegation](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority)
- [RFC 2822 Email Format](https://www.ietf.org/rfc/rfc2822.txt)
- Phase 2 Docs: `PHASE_2_GMAIL_INTEGRATION.md`
