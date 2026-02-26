# Reyhan Muhamad Rizki Portfolio

Full-stack portfolio website with:
- Public portfolio frontend
- Separate admin panel route
- Express API (projects, contact, auth)
- Vercel serverless deployment support

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

## Environment Variables
Copy from `.env.example` and set values:

- `NODE_ENV`
- `PORT`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET`
- `ADMIN_TOKEN_TTL_SEC`
- `ADMIN_BASE_PATH`
- `ADMIN_EMAIL`
- `ADMIN_ALLOWED_IPS` (optional CSV allowlist)
- `CORS_ORIGINS` (CSV origins)
- `ADMIN_LOGIN_WINDOW_MIN`
- `ADMIN_LOGIN_MAX_FAILURES`
- `ADMIN_LOGIN_BLOCK_MIN`
- `DATA_DIR` (optional local override)

Notes:
- In production, `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET` are required.
- Admin login now includes in-memory anti-bruteforce lockout per IP+User-Agent.

## API Summary
Base path: `/api`

- `GET /projects` (public)
- `GET /projects/:id` (public)
- `POST /projects` (admin)
- `PUT /projects/:id` (admin)
- `DELETE /projects/:id` (admin)
- `POST /contact` (public)
- `GET /contact` (admin)
- `PATCH /contact/read-all` (admin)
- `PATCH /contact/:id/read` (admin)
- `DELETE /contact/:id` (admin)
- `POST /auth/login` (admin password login)
- `GET /meta` (public meta: admin email/path)
- `GET /health` (health check)

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
Set at least:
- `NODE_ENV=production`
- `ADMIN_PASSWORD=<strong-password>`
- `ADMIN_JWT_SECRET=<long-random-secret>`
- `ADMIN_EMAIL=reyhanmuhamadrizki1@gmail.com`
- `CORS_ORIGINS=https://<your-domain>`

Recommended:
- `ADMIN_BASE_PATH=/secure-admin-2026`
- `ADMIN_ALLOWED_IPS=<your-static-ip>` (if available)
- `ADMIN_TOKEN_TTL_SEC=3600`
- `ADMIN_LOGIN_WINDOW_MIN=15`
- `ADMIN_LOGIN_MAX_FAILURES=6`
- `ADMIN_LOGIN_BLOCK_MIN=30`

### 4. Deploy
```bash
npx vercel --prod
```

### 5. Add Vercel Domains (optional)
```bash
npx vercel domains add reyhan-muhamad-rizki.vercel.app
npx vercel domains add admin-reyhan-muhamad-rizki.vercel.app
```

## Maintenance Checklist
Run this regularly:

1. Rotate `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET`.
2. Verify `CORS_ORIGINS` matches only active domains.
3. Keep `ADMIN_ALLOWED_IPS` set when possible.
4. Check Vercel logs for repeated `401/403/429` on `/api/auth/login`.
5. Move storage to a real database for persistent production data.

## Important Data Note (Vercel)
- JSON writes on Vercel use `/tmp` (ephemeral serverless storage).
- Data can reset across cold starts/redeploys.
- For reliable persistence, migrate to a database.
