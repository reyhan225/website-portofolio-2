# Reyhan Muhamad Rizki Portfolio

Full-stack portfolio website with:

- Public portfolio frontend
- Separate admin panel route
- Express API (projects, contact, auth, analytics)
- **Firebase Firestore database** (primary storage)
- Vercel serverless deployment support
- Visitor analytics with privacy-focused tracking

## Requirements

- Node.js `24.x` (matches `package.json` engines)
- npm

## Install Node.js (macOS)

Recommended with `nvm`:

```bash
brew install nvm
mkdir -p ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc

nvm install 24
nvm use 24
node -v
npm -v
```

## Quick Start (Local)

```bash
npm install
npm start
```

Open:

- Portfolio: `http://localhost:3000`
- Admin: `http://localhost:3000/secure-admin-2026`

Local default admin password:

- `admin123`

## Live Domains

- Portfolio (primary): `https://reyhan-muhamad-rizki.vercel.app`
- Portfolio (old -> redirects): `https://website-portofolio-2.vercel.app`
- Admin shortcut domain: `https://admin-reyhan-muhamad-rizki.vercel.app`
  - This domain auto-redirects to the secure admin path (`/secure-admin-2026`).

## Firebase Setup (Required)

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Navigate to **Project Settings** > **Service Accounts**
4. Click **Generate new private key**
5. Download the JSON file

### 2. Set Environment Variable

Convert the downloaded JSON to a string and set as environment variable:

```bash
# On macOS/Linux
export FIREBASE_SERVICE_ACCOUNT_JSON=$(cat /path/to/service-account.json | jq -c .)

# Or manually copy the entire JSON content
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**Required Environment Variables:**

- `FIREBASE_SERVICE_ACCOUNT_JSON` - Firebase service account JSON (required for database)
- `NODE_ENV` - Set to `production` for production
- `PORT` - Server port (default: 3000)
- `ADMIN_PASSWORD` - Admin login password (required in production)
- `ADMIN_JWT_SECRET` - JWT signing secret (required in production)
- `ADMIN_TOKEN_TTL_SEC` - Token expiration (default: 3600)
- `ADMIN_BASE_PATH` - Admin panel path (default: /secure-admin-2026)
- `ADMIN_EMAIL` - Contact email displayed in admin panel
- `ADMIN_ALLOWED_IPS` - Optional CSV allowlist for admin access
- `CORS_ORIGINS` - Allowed CORS origins (CSV)

**Optional:**

- `ADMIN_LOGIN_WINDOW_MIN` - Login attempt window (default: 15)
- `ADMIN_LOGIN_MAX_FAILURES` - Max failed attempts (default: 6)
- `ADMIN_LOGIN_BLOCK_MIN` - Block duration in minutes (default: 30)
- `DATA_DIR` - Local data directory override (fallback only)

### 3. Firestore Database Setup

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** or **Start in test mode**
4. Select region closest to your users

**Required Collections:**
The app will automatically create these collections:

- `projects` - Portfolio projects
- `messages` - Contact form submissions
- `visitors` - Anonymous visitor analytics (IP hashed)

### 4. Security Rules

Set these Firestore security rules (backend-only access):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow backend service account full access
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Note:** The backend uses Firebase Admin SDK with service account, so rules are enforced at the application level, not Firestore rules.

## API Summary

Base path: `/api`

### Projects (Public + Admin)

- `GET /projects?page=1&limit=10&category=Web` (public, paginated)
- `GET /projects/:id` (public)
- `POST /projects` (admin)
- `PUT /projects/:id` (admin)
- `DELETE /projects/:id` (admin)

### Contact (Public + Admin)

- `POST /contact` (public, rate limited, honeypot protected)
- `GET /contact?page=1&limit=20&unread=true` (admin, paginated)
- `PATCH /contact/read-all` (admin)
- `PATCH /contact/:id/read` (admin)
- `DELETE /contact/:id` (admin)

### Analytics (Admin)

- `GET /analytics?period=24h` (admin) - periods: 24h, 7d, 30d, all
- `POST /analytics/track` (public) - visitor tracking
- `GET /analytics/hash` (admin) - debug IP hash

### System

- `POST /auth/login` (admin password login)
- `GET /meta` (public meta: admin email/path)
- `GET /health` (health check + Firebase status)
- `GET /cache/stats` (admin) - cache statistics
- `POST /cache/clear` (admin) - clear server cache

For admin API calls, send:

- `Authorization: Bearer <token>`

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "deploy prep"
git push origin main
```

### 2. Import in Vercel

- Vercel dashboard -> **Add New Project**
- Select this repository
- Framework preset: **Other**

### 3. Set Vercel Environment Variables

**Required:**

- `NODE_ENV=production`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<paste-entire-json-content>`
- `ADMIN_PASSWORD=<strong-password>`
- `ADMIN_JWT_SECRET=<long-random-secret>`
- `ADMIN_EMAIL=reyhanmuhamadrizki1@gmail.com`
- `CORS_ORIGINS=https://<your-domain>`

**Recommended:**

- `ADMIN_BASE_PATH=/secure-admin-2026`
- `ADMIN_ALLOWED_IPS=<your-static-ip>` (if available)
- `ADMIN_TOKEN_TTL_SEC=3600`
- `ADMIN_LOGIN_WINDOW_MIN=15`
- `ADMIN_LOGIN_MAX_FAILURES=6`
- `ADMIN_LOGIN_BLOCK_MIN=30`

**Note:** For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the entire JSON content as a single line string.

### 4. Deploy

```bash
npx vercel --prod
```

### 5. Add Vercel Domains (optional)

```bash
npx vercel domains add reyhan-muhamad-rizki.vercel.app
npx vercel domains add admin-reyhan-muhamad-rizki.vercel.app
```

## Load Testing

Run k6 load tests to verify API performance:

```bash
# Install k6 first: https://k6.io/docs/get-started/installation/

# Run against local server
k6 run tests/load-test.js

# Run against production
BASE_URL=https://reyhan-muhamad-rizki.vercel.app k6 run tests/load-test.js
```

## Maintenance Checklist

Run this regularly:

1. Rotate `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET`.
2. Verify `CORS_ORIGINS` matches only active domains.
3. Keep `ADMIN_ALLOWED_IPS` set when possible.
4. Check Vercel logs for repeated `401/403/429` on `/api/auth/login`.
5. Monitor Firebase usage and costs in Firebase Console.
6. Review analytics data periodically (`GET /api/analytics?period=7d`).

## Data Persistence

✅ **Firebase Firestore** is now the primary database for:

- Projects
- Contact messages
- Visitor analytics

The app uses server-side caching for performance, with automatic cache invalidation on data changes.

**Privacy Note:** Visitor analytics store only hashed IP addresses (SHA-256), never raw IPs. No personally identifiable information is collected.
