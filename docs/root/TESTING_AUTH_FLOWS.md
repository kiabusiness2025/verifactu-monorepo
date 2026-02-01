# Testing Authentication Flows - Scenario A
**Date**: January 21, 2026  
**Implementation**: Unified PostgreSQL authentication (Firebase + Google Workspace)

## Prerequisites

### 1. Database Setup ✅
- Cloud SQL instance: `app-fdc` running
- Database: `verifactu_production`
- Connection: SSL enabled, IP authorized
- Migrations applied: Including `add_auth_provider_fields`

### 2. Environment Variables

#### apps/app/.env.local
```bash
# Cloud SQL Connection
DATABASE_URL="postgres://verifactu_user:AcUvSl2K8Vdt5Q9PMIFoXziJp407YHRD@34.14.99.83:5432/verifactu_production?sslmode=require"

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=verifactu-business-480212
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@verifactu-business-480212.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### apps/admin/.env.local
```bash
# Same Cloud SQL Connection
DATABASE_URL="postgres://verifactu_user:AcUvSl2K8Vdt5Q9PMIFoXziJp407YHRD@34.14.99.83:5432/verifactu_production?sslmode=require"

# NextAuth + Google Workspace
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Test Scenarios

### Scenario 1: Firebase User Authentication (Client App)

#### 1.1 Start Client App
```bash
cd apps/app
pnpm dev
# Opens at http://localhost:3000 (or next available port)
```

#### 1.2 Get Firebase ID Token
From your client application (web/mobile), after user signs in with Firebase:

```javascript
// In your client app (React/React Native)
const user = firebase.auth().currentUser;
const idToken = await user.getIdToken();
console.log('Firebase Token:', idToken);
```

#### 1.3 Test GET /api/app/me Endpoint

**Using curl:**
```bash
curl -H "Authorization: Bearer <YOUR_FIREBASE_TOKEN>" \
  http://localhost:3000/api/app/me
```

**Using Postman/Insomnia:**
```
GET http://localhost:3000/api/app/me
Headers:
  Authorization: Bearer <YOUR_FIREBASE_TOKEN>
```

**Expected Response (First-time user):**
```json
{
  "user": {
    "id": "cuid_generated",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER",
    "emailVerified": null
  },
  "companiesOwned": [],
  "memberships": []
}
```

#### 1.4 Verify User in Database
```bash
cd packages/db
npx prisma studio
# Open http://localhost:5555
# Check User table:
# - email matches Firebase user
# - authProvider = "FIREBASE"
# - authSubject = Firebase UID
```

#### 1.5 Create Company via API
```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer <YOUR_FIREBASE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company SL",
    "nif": "B12345678"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "tenant": {
    "id": "company_cuid",
    "name": "Test Company SL",
    "ownerId": "user_id"
  }
}
```

#### 1.6 Verify Company in Database
In Prisma Studio:
- Check `Company` table → new record with name "Test Company SL"
- Check `ownerUserId` matches the User ID
- Verify `taxId` (NIF) is stored

#### 1.7 Re-fetch User Profile
```bash
curl -H "Authorization: Bearer <YOUR_FIREBASE_TOKEN>" \
  http://localhost:3000/api/app/me
```

**Expected Response (After company creation):**
```json
{
  "user": { ... },
  "companiesOwned": [
    {
      "id": "company_cuid",
      "name": "Test Company SL",
      "taxId": "B12345678",
      "ownerUserId": "user_id",
      "createdAt": "2026-01-21T..."
    }
  ],
  "memberships": []
}
```

---

### Scenario 2: Google Workspace Authentication (Admin Panel)

#### 2.1 Start Admin Panel
```bash
cd apps/admin
pnpm dev
# Opens at http://localhost:3003
```

#### 2.2 Login with Google Workspace
1. Navigate to http://localhost:3003
2. Click "Sign in with Google"
3. Use your `@verifactu.business` account
4. Should redirect to admin dashboard

#### 2.3 Verify Admin User in Database
In Prisma Studio:
- Check `User` table → your @verifactu.business user
- `authProvider` = "GOOGLE"
- `authSubject` = Google sub claim
- `role` = "ADMIN" or "SUPPORT"

#### 2.4 View Client Users
In admin panel:
1. Navigate to Users section
2. Should see Firebase users created in Scenario 1
3. Verify you can view their:
   - Email
   - Companies owned
   - Auth provider (FIREBASE)

#### 2.5 View Companies
In admin panel:
1. Navigate to Companies section
2. Should see companies created via client app
3. Verify company details match

---

### Scenario 3: User Linking (Email Collision)

Tests that existing users can link Firebase auth to their account.

#### 3.1 Create User via Admin Panel (Optional)
If admin panel has user creation:
1. Create user with email: test@example.com
2. Do NOT set authProvider/authSubject yet

#### 3.2 Sign In via Firebase with Same Email
From client app:
- Sign in with Firebase using test@example.com
- Get ID token
- Call GET /api/app/me

**Expected Behavior:**
- User record is updated (not duplicated)
- `authProvider` set to "FIREBASE"
- `authSubject` set to Firebase UID
- Existing user data preserved (companies, subscriptions, etc.)

#### 3.3 Verify No Duplicates
In Prisma Studio:
- Search for test@example.com
- Should find only ONE user record
- Check authProvider and authSubject are populated

---

### Scenario 4: Error Handling

#### 4.1 Missing Authorization Header
```bash
curl http://localhost:3000/api/app/me
```

**Expected Response (401):**
```json
{
  "error": "Missing or invalid Authorization header"
}
```

#### 4.2 Invalid Firebase Token
```bash
curl -H "Authorization: Bearer invalid_token_here" \
  http://localhost:3000/api/app/me
```

**Expected Response (401):**
```json
{
  "error": "Firebase token verification failed: ..."
}
```

#### 4.3 Expired Token
Use an expired Firebase token (>1 hour old).

**Expected Response (401):**
```json
{
  "error": "Firebase token verification failed: Token expired"
}
```

---

## Verification Checklist

### Database Integrity
- [ ] Users have unique emails
- [ ] Users have either FIREBASE or GOOGLE authProvider
- [ ] authSubject is unique per provider
- [ ] Companies are linked to owners via ownerUserId
- [ ] No orphaned data (companies without owners)

### Authentication Flow
- [ ] Firebase users can authenticate
- [ ] Admin users can authenticate with Google
- [ ] User upsert works (no duplicates on repeated calls)
- [ ] Email collision handled correctly (linking)

### API Endpoints
- [ ] GET /api/app/me returns user + companies
- [ ] POST /api/tenants creates company in SQL
- [ ] Auth middleware rejects invalid tokens
- [ ] All endpoints use Prisma (no Firestore)

### Admin Panel
- [ ] Admin can see Firebase users
- [ ] Admin can see companies created via client app
- [ ] NextAuth session works with Cloud SQL
- [ ] RBAC enforced (only ADMIN/SUPPORT roles)

---

## Troubleshooting

### Issue: "Cannot find module '@verifactu/db'"

**Solution:**
```bash
# Ensure package is linked in apps/app/package.json
cd apps/app
pnpm install

# Verify node_modules symlink
ls node_modules/@verifactu/db
```

### Issue: "Prisma Client not generated"

**Solution:**
```bash
cd packages/db
npx prisma generate

# Verify types
cd apps/app
npx tsc --noEmit
```

### Issue: "Connection refused" to Cloud SQL

**Causes:**
1. IP not authorized
2. Cloud SQL instance stopped
3. Wrong connection string

**Solutions:**
```bash
# Check instance status
gcloud sql instances describe app-fdc --project=verifactu-business

# Authorize current IP
MY_IP=$(curl -s https://api.ipify.org)
gcloud sql instances patch app-fdc \
  --authorized-networks=$MY_IP \
  --project=verifactu-business

# Test connection
psql "postgresql://verifactu_user:PASSWORD@34.14.99.83:5432/verifactu_production?sslmode=require" \
  -c "SELECT 1;"
```

### Issue: "Firebase token verification failed"

**Causes:**
1. Wrong project ID in env vars
2. Invalid private key format
3. Token from wrong Firebase project

**Solutions:**
```bash
# Verify env vars
cd apps/app
cat .env.local | grep FIREBASE_ADMIN

# Check private key escaping (must have \n for newlines)
# Check project ID matches your Firebase console
```

### Issue: "Port already in use"

**Solution:**
```bash
# On Windows
Get-NetTCPConnection -LocalPort 3000 -State Listen | 
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# On Linux/Mac
lsof -ti:3000 | xargs kill -9
```

---

## Next Steps After Testing

### 1. Production Deployment

#### Update Prisma Accelerate
```bash
# Go to https://console.prisma.io/
# Navigate to your project
# Settings → Database Connection
# Update to Cloud SQL connection string
```

#### Update Vercel Environment Variables
For each project (verifactu-app, verifactu-admin):

```
DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

#### Deploy
```bash
git add .
git commit -m "feat: implement unified PostgreSQL authentication (Scenario A)"
git push origin main

# Vercel will auto-deploy
# Verify at: https://verifactu-app.vercel.app
```

### 2. Security Hardening

#### Restrict Cloud SQL Access
```bash
# Remove local dev IPs from production
# Add only Vercel IP ranges or use Private IP

gcloud sql instances patch app-fdc \
  --authorized-networks="<vercel_ip_1>,<vercel_ip_2>" \
  --project=verifactu-business
```

#### Enable Connection Pooling
- Use Prisma Accelerate for connection pooling
- Set max connections: `?connection_limit=10`
- Enable prepared statements: `?prepared_statements=true`

#### Monitor & Alerts
```bash
# Set up Cloud SQL monitoring
gcloud monitoring alert-policies create \
  --notification-channels=... \
  --display-name="Cloud SQL High Connections" \
  --condition-threshold-value=80
```

### 3. Data Migration (If Needed)

If you have existing Firestore data:

```typescript
// migration-script.ts
import * as admin from 'firebase-admin';
import { prisma } from '@verifactu/db';

async function migrateUsers() {
  const firestore = admin.firestore();
  const usersSnap = await firestore.collection('users').get();
  
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    
    await prisma.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        name: data.name,
        authProvider: 'FIREBASE',
        authSubject: doc.id, // Firebase UID
      },
      update: {
        authProvider: 'FIREBASE',
        authSubject: doc.id,
      },
    });
  }
}

migrateUsers().catch(console.error);
```

---

## Success Metrics

- [ ] Zero authentication errors in logs
- [ ] All users can sign in (Firebase + Google)
- [ ] No duplicate user records
- [ ] All company data in PostgreSQL
- [ ] Admin panel shows real-time data
- [ ] No Firestore write operations
- [ ] Average API response time < 300ms
- [ ] Cloud SQL CPU usage < 50%
- [ ] Connection pool stable (no exhaustion)

---

**Implementation Status**: ✅ Code Complete, Ready for Manual Testing  
**Documentation**: SCENARIO_A_IMPLEMENTATION.md  
**Contact**: For questions, check implementation docs or ping team
