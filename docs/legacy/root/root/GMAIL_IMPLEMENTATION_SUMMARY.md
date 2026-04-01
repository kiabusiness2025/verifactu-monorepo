# Gmail API Integration - Implementation Summary

## ✅ Status: Ready for Testing

**Service Account:** `api-drive-gmail-calendario@verifactu-business-480212.iam.gserviceaccount.com`  
**Client ID:** `114995456670039075730`  
**Domain-Wide Delegation:** Enabled  
**Impersonates:** `support@verifactu.business`

---

## 🔐 Security Implementation

### 1. Hardcoded Email Addresses (Anti-Spoofing)

```typescript
// Gmail
const FROM_EMAIL = 'support@verifactu.business';

// Resend
const FROM_EMAIL = 'no-reply@verifactu.business';
```

✅ Prevents email spoofing  
✅ Always sends from authorized addresses

### 2. Provider Validation

```typescript
if (provider !== 'RESEND' && provider !== 'GMAIL') {
  return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
}
```

✅ Allowlist-based validation  
✅ Rejects unknown providers

### 3. RBAC Protection

```typescript
const session = await requireAdminSession();
```

✅ Only ADMIN role can send emails  
✅ Session validated before every request

### 4. Audit Trail

```typescript
AuditLog: {
  action: 'EMAIL_SEND',
  metadata: { provider, fromEmail, subject, to }
}
```

✅ All sends logged with full context  
✅ Includes actual sender (support@ or no-reply@)

---

## 📊 Database Schema (bd_3 Applied)

```prisma
enum EmailProvider {
  RESEND
  GMAIL
}

model EmailEvent {
  provider   EmailProvider @default(RESEND)
  messageId  String        // Gmail/Resend message ID
  threadId   String?       // Gmail thread ID (conversation)
  fromEmail  String?       // support@ or no-reply@
  // ... other fields
}
```

**Migration Status:** ✅ Applied  
**Prisma Client:** ✅ Regenerated

---

## 🔧 Implementation Details

### sendViaGmail() Function

```typescript
- Service account authentication
- Domain-wide delegation (impersonate support@)
- RFC 2822 email format
- Base64url encoding (RFC 4648 § 5)
- Gmail API users.messages.send()
- Returns: { messageId, threadId, fromEmail }
```

### sendViaResend() Function

```typescript
- Resend API email.send()
- From: no-reply@verifactu.business
- Returns: { messageId, fromEmail }
```

### POST /api/admin/users/:id/send-email

```typescript
Request:
{
  "subject": "Hello",
  "message": "<p>Content</p>",
  "provider": "GMAIL" | "RESEND"
}

Response (Success):
{
  "success": true,
  "messageId": "18d4a...",
  "threadId": "18d4a...",    // Gmail only
  "provider": "GMAIL",
  "fromEmail": "support@verifactu.business"
}

Response (Error):
{
  "error": "Error message"
}
```

---

## 📋 Required Environment Variables

Add to `apps/admin/.env`:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL="api-drive-gmail-calendario@verifactu-business-480212.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### How to Get Private Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Project: `verifactu-business-480212`
3. IAM & Admin > Service Accounts
4. Click: `api-drive-gmail-calendario@...`
5. Keys tab > Add Key > Create new key
6. Format: JSON
7. Download and extract `private_key` field
8. Paste entire value (including BEGIN/END lines)

**Template:** See `apps/admin/.env.gmail.example`

---

## 🧪 Testing Steps

### 1. Set Environment Variables

```bash
cd apps/admin
# Add variables to .env (see above)
```

### 2. Restart Admin Panel

```bash
pnpm dev
```

### 3. Send Test Email

1. Open: http://localhost:3003/users/[user-id]
2. Click: **Send Email**
3. Select: **Gmail (support@verifactu.business)**
4. Fill: Subject and message
5. Click: **Send via GMAIL**
6. Verify: Success alert with messageId

### 4. Verify Database

Open Prisma Studio: http://localhost:5555

**EmailEvent Table:**

- Filter: `provider = GMAIL`
- Check:
  - ✅ `messageId` populated
  - ✅ `threadId` populated
  - ✅ `fromEmail = "support@verifactu.business"`
  - ✅ `status = SENT`

**AuditLog Table:**

- Find: Latest `EMAIL_SEND` action
- Check metadata:
  - ✅ `provider: "GMAIL"`
  - ✅ `fromEmail: "support@verifactu.business"`

### 5. Check User's Inbox

- User receives email from `support@verifactu.business`
- Reply goes to Gmail inbox (thread tracking)

---

## 🎯 Email Provider Strategy

| Feature             | Gmail (Support)                 | Resend (Transactional)        |
| ------------------- | ------------------------------- | ----------------------------- |
| **From**            | `support@verifactu.business`    | `no-reply@verifactu.business` |
| **Use Case**        | Manual support communications   | Automated notifications       |
| **Thread Tracking** | ✅ Yes (threadId stored)        | ❌ No                         |
| **Reply Handling**  | ✅ Goes to Gmail inbox          | ❌ Bounce (no-reply)          |
| **Webhooks**        | ❌ No                           | ✅ Yes (status updates)       |
| **Retry via UI**    | ❌ No (manual from inbox)       | ✅ Yes                        |
| **API**             | Gmail API (google-auth-library) | Resend API                    |
| **Authentication**  | Service account + delegation    | API key                       |

---

## 📚 Documentation Files

1. **GMAIL_ENV_SETUP.md** (Complete Guide)
   - Service account details
   - OAuth scopes configuration
   - Environment variables
   - Testing procedures
   - Troubleshooting
   - Production deployment

2. **apps/admin/.env.gmail.example** (Template)
   - Environment variables format
   - Service account details
   - Instructions to get private key

3. **PHASE_2_GMAIL_INTEGRATION.md** (Technical Docs)
   - Database schema changes
   - API implementation details
   - UI updates
   - Security notes

---

## ⚠️ Required Admin Console Configuration

**Google Workspace Admin Console** must authorize Client ID `114995456670039075730` with:

```
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/calendar
```

**To Verify:**

1. Go to [admin.google.com](https://admin.google.com)
2. Security > API Controls > Domain-wide Delegation
3. Find Client ID: `114995456670039075730`
4. Verify scopes include `gmail.send`

✅ Status: Already configured per your confirmation

---

## 🚀 Next Steps

### Immediate (Testing)

1. ⬜ Get service account private key from GCP Console
2. ⬜ Add environment variables to `apps/admin/.env`
3. ⬜ Restart admin panel
4. ⬜ Send test email via Gmail provider
5. ⬜ Verify EmailEvent record in database
6. ⬜ Check user received email from support@

### Production

1. ⬜ Add environment variables in Vercel
2. ⬜ Keep the private key in secure secret storage
3. ⬜ Test Gmail sending in production
4. ⬜ Monitor AuditLog for email activity
5. ⬜ Set up alerts for failed emails

---

## 🔍 Troubleshooting

### "Missing service account credentials"

- Check `GOOGLE_SERVICE_ACCOUNT_EMAIL` is set
- Check `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is set
- Verify private key includes `-----BEGIN/END PRIVATE KEY-----`

### "Request had insufficient authentication scopes"

- Verify `gmail.send` scope in Admin Console
- Client ID: `114995456670039075730`
- Check domain-wide delegation enabled

### "Delegation denied"

- Go to Admin Console > API Controls > Domain-wide Delegation
- Verify Client ID is listed
- Verify scope is authorized

### Email not received

- Check EmailEvent.status = SENT
- Verify fromEmail = support@verifactu.business
- Check user's spam folder
- Verify recipient email is valid

---

## 📞 Support

**Documentation:**

- `GMAIL_ENV_SETUP.md` - Complete setup guide
- `PHASE_2_GMAIL_INTEGRATION.md` - Technical details
- `.env.gmail.example` - Environment variables template

**Code:**

- Route: `apps/admin/app/api/admin/users/[id]/send-email/route.ts`
- Schema: `packages/db/prisma/schema.prisma`
- Migration: `packages/db/prisma/migrations/20260121140359_bd_3/`

**Commit:** `47f60864` - Gmail security enhancements

---

## ✅ Implementation Checklist

### Code

- ✅ EmailProvider enum (RESEND, GMAIL)
- ✅ EmailEvent.threadId (Gmail threads)
- ✅ EmailEvent.fromEmail (sender tracking)
- ✅ sendViaGmail() with service account
- ✅ sendViaResend() with fromEmail
- ✅ Provider validation in POST handler
- ✅ Hardcoded fromEmail (security)
- ✅ RBAC protection (requireAdminSession)
- ✅ AuditLog with fromEmail metadata
- ✅ Error handling with proper fallback

### Database

- ✅ Migration bd_3 applied
- ✅ Prisma Client regenerated
- ✅ Index on (provider, createdAt)

### Documentation

- ✅ GMAIL_ENV_SETUP.md created
- ✅ .env.gmail.example created
- ✅ Service account details documented
- ✅ Testing procedures documented
- ✅ Troubleshooting guide included

### Security

- ✅ Hardcoded fromEmail addresses
- ✅ Provider allowlist validation
- ✅ RBAC enforcement
- ✅ Audit trail with metadata
- ✅ No user input for sender

### Configuration

- ✅ Service account created
- ✅ Domain-wide delegation enabled
- ✅ OAuth scopes authorized in Admin Console
- ⏳ Private key pending (manual step)

---

**Status:** ✅ **READY FOR TESTING**

All code implemented, committed, and documented. Only requires adding private key to environment variables to start testing.
