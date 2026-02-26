# Reyhan Muhamad Rizki Portfolio

Full-stack portfolio website with:
- Public portfolio frontend
- Admin panel for managing projects and messages
- Express API with JSON file storage

## Requirements
- Node.js 18+ (recommended)
- npm

## Install Node.js (macOS)
Using Homebrew:
```bash
brew install node
node -v
npm -v
```

If `node` is still not found in a new terminal:
```bash
source ~/.zshrc
```

## Quick Start
```bash
npm install
npm start
```

Open:
- Portfolio: `http://localhost:3000`
- Admin: `http://localhost:3000/secure-admin-2026`

Default admin password:
- `admin123`

## Project Structure
```text
Website-Portofolio 2/
├── api/
│   └── index.js
├── Backend/
│   ├── data/
│   │   ├── messages.json
│   │   └── projects.json
│   ├── middleware/
│   │   └── adminAuth.js
│   ├── routes/
│   │   ├── contact.js
│   │   └── projects.js
│   ├── package.json
│   └── server.js
├── Frontend/
│   ├── admin.html
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── admin.js
│       └── main.js
├── package.json
├── vercel.json
└── README.md
```

## Environment Variables
Optional variables for Backend:

- `PORT` (default: `3000`)
- `ADMIN_PASSWORD` (default: `admin123`)
- `ADMIN_JWT_SECRET` (default in dev: `dev-admin-secret-change-me`)
- `ADMIN_TOKEN_TTL_SEC` (default: `3600`)
- `ADMIN_EMAIL` (default: `reyhanmuhamadrizki1@gmail.com`)
- `ADMIN_BASE_PATH` (default: `/secure-admin-2026`, avoid `/api`)
- `ADMIN_ALLOWED_IPS` (optional CSV, e.g. `1.2.3.4,5.6.7.8`)
- `NODE_ENV` (`production` requires `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET`)
- `CORS_ORIGINS` (optional CSV list, e.g. `https://yourdomain.com`)
- `DATA_DIR` (optional path override for local filesystem mode)

Example:
```bash
ADMIN_PASSWORD=yourStrongPassword ADMIN_JWT_SECRET=replaceThisSecret ADMIN_TOKEN_TTL_SEC=3600 npm start
```

## API Summary
Base URL: `/api`

Projects:
- `GET /projects` (public)
- `GET /projects/:id` (public)
- `POST /projects` (admin)
- `PUT /projects/:id` (admin)
- `DELETE /projects/:id` (admin)

Contact:
- `POST /contact` (public)
- `GET /contact` (admin)
- `PATCH /contact/read-all` (admin)
- `PATCH /contact/:id/read` (admin)
- `DELETE /contact/:id` (admin)

Auth:
- `POST /auth/login` with `{ "password": "..." }`

Meta:
- `GET /meta` (public) -> includes `adminEmail` and `adminBasePath` for frontend/admin UI

For admin routes, send:
- `Authorization: Bearer <JWT_FROM_LOGIN>`

## Notes
- Data is stored in local JSON files under `Backend/data`.
- Contact POST is rate-limited (anti-spam).
- Login endpoint is rate-limited.
- Admin routes are protected by expiring signed JWT bearer tokens.
- Frontend supports theme + language toggles (saved in localStorage).

## Deploy to Vercel
This repository now includes:
- `vercel.json`
- `api/index.js`
- root `package.json`

### Steps
1. Push repository to GitHub.
2. Import project into Vercel.
3. Set Environment Variables:
   - `ADMIN_PASSWORD`
   - `ADMIN_JWT_SECRET`
   - `NODE_ENV=production`
   - `ADMIN_TOKEN_TTL_SEC` (optional)
   - `ADMIN_EMAIL` (recommended: `reyhanmuhamadrizki1@gmail.com`)
   - `ADMIN_BASE_PATH` (optional, for custom admin URL path)
   - `ADMIN_ALLOWED_IPS` (optional but recommended for admin lock-down)
   - `CORS_ORIGINS` (set your deployed domain)
4. Deploy.

### CLI deploy commands
```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

### Important Vercel data note
- On Vercel serverless runtime, JSON writes use `/tmp` (ephemeral storage).
- Message/project changes may not persist reliably across cold starts/redeploys.
- For production persistence, move storage to a real database (Neon/Supabase/PlanetScale/MongoDB/Upstash, etc.).

### Recommended admin path
- Current default admin path is `/secure-admin-2026`.
- You can change it by setting `ADMIN_BASE_PATH` in Vercel project environment variables.

### Security notes
- Admin login and admin API routes support optional IP allowlist via `ADMIN_ALLOWED_IPS`.
- Login/password verification uses timing-safe hash comparison.
- Contact form includes a honeypot field to reduce bot spam.
fIHLMEIiISMfDeapRypRw+qZzrEAKETIwpi0Mb1YsVWnR5XSpkqsbCZhTQIgQfSA