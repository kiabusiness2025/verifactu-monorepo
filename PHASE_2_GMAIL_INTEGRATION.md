# Phase 2 Gmail Integration Setup

## Overview

Phase 2 now supports sending emails from **both Resend and Gmail API**:
- **Resend**: Transactional emails from `no-reply@verifactu.business` (existing)
- **Gmail**: Support emails from `support@verifactu.business` (new)

## Email Provider Strategy

### Resend (Transactional)
- **Use for**: Automated emails, notifications, password resets
- **From**: `no-reply@verifactu.business`
- **Features**: Webhook tracking, automatic status updates, retry support
- **Reply**: No reply tracking

### Gmail API (Support)
- **Use for**: Manual support emails from admin panel
- **From**: `support@verifactu.business`
- **Features**: Thread tracking, replies tracked in Gmail inbox
- **Reply**: Users can reply, responses go to support@verifactu.business

## Database Changes

### Migration bd_3

**New Enum:**
```prisma
enum EmailProvider {
  RESEND
  GMAIL
}
```

**Updated EmailEvent:**
```prisma
model EmailEvent {
  id          String        @id
  messageId   String?       @unique // Resend or Gmail message ID
  threadId    String?       // Gmail thread ID
  fromEmail   String?       // Sender email
  provider    EmailProvider @default(RESEND)
  // ... other fields
}
```

**New Fields:**
- `threadId`: Gmail thread ID for conversation tracking
- `fromEmail`: Actual sender email (support@ or no-reply@)
- `provider`: RESEND or GMAIL enum (instead of String)

**New Index:**
- `@@index([provider, createdAt])`

## Gmail API Setup

### Prerequisites

1. **Google Cloud Project** with Gmail API enabled
2. **Service Account** with domain-wide delegation
3. **Google Workspace account** (verifactu.business)

### Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create new)
3. Navigate to **IAM & Admin > Service Accounts**
4. Click **Create Service Account**
5. Name: `verifactu-gmail-sender`
6. Grant role: None needed (domain-wide delegation handles permissions)
7. Click **Done**

### Step 2: Enable Domain-Wide Delegation

1. Click on the service account you created
2. Go to **Details** tab
3. Scroll to **Domain-wide delegation**
4. Click **Enable Google Workspace Domain-wide Delegation**
5. Copy the **Client ID** (you'll need this)

### Step 3: Create Service Account Key

1. Still in service account details
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON**
5. Download the JSON file
6. Extract from JSON:
   - `client_email`
   - `private_key`

### Step 4: Configure Google Workspace

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to **Security > API Controls > Domain-wide Delegation**
3. Click **Add new**
4. Enter the **Client ID** from Step 2
5. Add OAuth Scopes:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```
6. Click **Authorize**

### Step 5: Environment Variables

Add to `.env` files (apps/admin, apps/app):

```bash
# Gmail API Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL="verifactu-gmail-sender@your-project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important**: 
- Replace `\n` with actual newlines in your .env file, OR
- Keep as `\\n` and the code will convert it

## API Changes

### POST /api/admin/users/[id]/send-email

**Request Body:**
```typescript
{
  subject: string;
  message: string; // HTML content
  provider?: "RESEND" | "GMAIL"; // Default: RESEND
  template?: string; // Optional template name
}
```

**Response (Success):**
```typescript
{
  success: true;
  messageId: string; // Resend or Gmail message ID
  threadId?: string; // Only for Gmail
  provider: "RESEND" | "GMAIL"
}
```

**Gmail Sending Flow:**
1. Authenticate with service account
2. Impersonate `support@verifactu.business`
3. Create RFC 2822 formatted email
4. Base64url encode
5. Send via Gmail API
6. Store messageId and threadId in EmailEvent

### POST /api/admin/emails/[id]/retry

**Changed Behavior:**
- Only allows retry for `provider=RESEND`
- Returns 400 error for Gmail emails:
  ```json
  { "error": "Retry only available for Resend emails..." }
  ```

### GET /api/admin/emails

**New Query Parameter:**
```
?provider=RESEND | GMAIL
```

**Example:**
```
GET /api/admin/emails?provider=GMAIL&status=SENT
```

## UI Changes

### Operations -> Emails List

**New Features:**
- Provider filter dropdown (All / Resend / Gmail)
- Provider badge in table (colored: Resend=default, Gmail=secondary)
- Shows provider column

### Email Detail Page

**New Display:**
- Provider badge with color
- `fromEmail` field (support@ or no-reply@)
- `threadId` field (Gmail only)
- Retry button only shown for Resend emails with FAILED/BOUNCED status
- Message for Gmail: "Gmail emails cannot be retried automatically"

### User Detail -> Send Email Dialog

**New Features:**
- Email Provider selector:
  - Resend (no-reply@verifactu.business)
  - Gmail (support@verifactu.business)
- Helper text explaining difference
- Button text shows selected provider: "Send via RESEND"

## Webhook Behavior

### Resend Webhooks

**Unchanged**: Continue to track email status for `provider=RESEND`

```typescript
// POST /api/webhooks/resend
// Updates EmailEvent where messageId matches AND provider=RESEND
```

**Events Tracked:**
- `email.sent` → status: SENT
- `email.delivered` → status: DELIVERED
- `email.bounced` → status: BOUNCED
- `email.complained` → status: COMPLAINED

### Gmail

**No webhooks**: Gmail API doesn't provide webhook events for sent emails.

**Alternatives:**
- Gmail Push Notifications (watch inbox for replies) - future enhancement
- Manual status: Emails marked as SENT when API call succeeds

## Audit Logging

**Updated Metadata:**
```typescript
{
  provider: "RESEND" | "GMAIL",
  template?: string,
  subject: string,
  to: string,
  messageId?: string,
  threadId?: string
}
```

## Testing

### Test Gmail Sending

1. Configure service account (see setup steps)
2. Go to `/users/[id]` in admin panel
3. Click "Send Email"
4. Select "Gmail (support@verifactu.business)"
5. Enter subject and message
6. Click "Send via GMAIL"
7. Check:
   - User receives email from support@
   - EmailEvent created with provider=GMAIL
   - messageId and threadId stored
   - AuditLog created with provider=GMAIL

### Test Email Filtering

1. Go to `/operations/emails`
2. Filter by provider: Gmail
3. Verify only Gmail emails shown
4. Click email detail
5. Verify Gmail-specific fields (threadId, fromEmail)
6. Verify retry button NOT shown

### Test Resend (Unchanged)

1. Existing Resend functionality should work as before
2. Webhooks continue to update status
3. Retry button works for FAILED emails

## Error Handling

### Gmail API Errors

**Common Errors:**
- **Invalid credentials**: Check service account key
- **Insufficient permissions**: Enable domain-wide delegation
- **Subject not found**: Service account can't impersonate support@
- **Quota exceeded**: Gmail API has rate limits

**Error Response:**
```json
{
  "error": "Failed to send email: <error message>",
  "status": 500
}
```

**EmailEvent Created:**
- `status`: FAILED
- `lastError`: Error message from Gmail API
- `provider`: GMAIL

## Production Checklist

- [ ] Service account created
- [ ] Domain-wide delegation enabled
- [ ] OAuth scopes authorized in Google Workspace
- [ ] Environment variables set
- [ ] Test email sent successfully from admin panel
- [ ] EmailEvent created with provider=GMAIL
- [ ] AuditLog shows correct metadata
- [ ] Reply to test email received in support@ inbox
- [ ] Operations UI shows provider filter
- [ ] Email detail shows Gmail-specific fields

## Future Enhancements

### Phase 3 Considerations

1. **Gmail Inbox Integration**
   - Watch support@ inbox for replies
   - Link replies to EmailEvent by threadId
   - Show conversation history in admin UI

2. **Email Templates**
   - Store templates in database
   - Support variables ({{name}}, {{company}})
   - Preview before sending
   - Template selection in send dialog

3. **Gmail Push Notifications**
   - Subscribe to inbox changes
   - Webhook endpoint for Gmail notifications
   - Real-time reply tracking

4. **Advanced Gmail Features**
   - Attachments support
   - CC/BCC fields
   - Draft saving
   - Scheduled sending
   - Labels/filters

## Security Notes

1. **Service Account Key**: Never commit to repository
2. **Private Key**: Store securely in environment variables
3. **Domain Restriction**: Only works with @verifactu.business emails
4. **Rate Limits**: Gmail API has quota limits (check console)
5. **Audit Trail**: All sends logged with adminUserId

## Troubleshooting

### "Invalid grant" error
- Check domain-wide delegation is enabled
- Verify OAuth scopes are authorized
- Ensure service account has correct subject (support@)

### "Insufficient permissions"
- Enable Gmail API in Google Cloud Console
- Add correct OAuth scope in Workspace Admin

### Private key format
- Must include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Newlines should be `\n` (will be converted in code)
- Or use `\\n` in .env and code will replace

### Emails not appearing in admin UI
- Check EmailEvent created in database
- Verify provider=GMAIL
- Check AuditLog for EMAIL_SEND action

## Migration Command

```bash
cd packages/db
pnpm db:migrate
# Enter name: bd_3
```

**Applied Changes:**
- EmailProvider enum created
- EmailEvent.provider changed from String to EmailProvider
- EmailEvent.threadId added (optional)
- EmailEvent.fromEmail added (optional)
- Index on [provider, createdAt] added

## Code Reference

**Send Email Route:**
```typescript
// apps/admin/app/api/admin/users/[id]/send-email/route.ts
- sendViaGmail() function
- sendViaResend() function
- Provider selection logic
```

**Email List:**
```typescript
// apps/admin/app/operations/emails/page.tsx
- Provider filter
- Provider badge
```

**Email Detail:**
```typescript
// apps/admin/app/operations/emails/[id]/page.tsx
- Gmail-specific fields
- Conditional retry button
```

**User Detail:**
```typescript
// apps/admin/app/users/[id]/page.tsx
- Provider selector in send dialog
```
