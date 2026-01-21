#!/bin/bash

echo "🧪 Testing Phase 2 Operations Center..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Create test webhook event
echo "1️⃣  Creating test webhook event..."
psql "$DATABASE_URL" << EOF
INSERT INTO "WebhookEvent" (
  id, provider, "externalId", "eventType", status,
  payload, "signatureOk", "receivedAt"
) VALUES (
  gen_random_uuid(),
  'STRIPE',
  'evt_test_' || floor(random() * 1000000),
  'customer.subscription.updated',
  'FAILED',
  '{"test": true}'::jsonb,
  true,
  NOW()
);
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Test webhook created${NC}"
else
  echo -e "${RED}✗ Failed to create test webhook${NC}"
fi

echo ""

# Test 2: Create test email event
echo "2️⃣  Creating test email event..."
psql "$DATABASE_URL" << EOF
INSERT INTO "EmailEvent" (
  id, "messageId", "to", subject, status,
  provider, "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'msg_test_' || floor(random() * 1000000),
  'test@example.com',
  'Test Email',
  'FAILED',
  'resend',
  NOW(),
  NOW()
);
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Test email created${NC}"
else
  echo -e "${RED}✗ Failed to create test email${NC}"
fi

echo ""

# Test 3: Query webhooks
echo "3️⃣  Querying webhooks..."
WEBHOOK_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"WebhookEvent\";")
echo "   Total webhooks: $WEBHOOK_COUNT"

echo ""

# Test 4: Query emails
echo "4️⃣  Querying emails..."
EMAIL_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"EmailEvent\";")
echo "   Total emails: $EMAIL_COUNT"

echo ""

# Test 5: Check failed webhooks
echo "5️⃣  Checking failed webhooks..."
FAILED_WEBHOOKS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"WebhookEvent\" WHERE status = 'FAILED';")
echo "   Failed webhooks: $FAILED_WEBHOOKS"

echo ""

# Test 6: Check blocked users
echo "6️⃣  Checking blocked users..."
BLOCKED_USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"User\" WHERE \"isBlocked\" = true;")
echo "   Blocked users: $BLOCKED_USERS"

echo ""
echo "✅ Test suite completed!"
echo ""
echo "Next steps:"
echo "  1. Visit http://localhost:3003/operations to see the dashboard"
echo "  2. Navigate to /operations/webhooks to see webhook list"
echo "  3. Navigate to /operations/emails to see email list"
echo "  4. Try retrying a failed webhook"
