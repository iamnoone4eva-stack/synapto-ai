# Deploy Synapto

## Local

```bash
cd synapto-backend
# optional Postgres: npm i && export DATABASE_URL=postgres://...
node server.js
# or from repo root:
./start.sh
```

Open http://localhost:3001/synapto-complete.html

Storage modes:
- **json** (default): `synapto-backend/data/synapto.json` with atomic writes + daily backups in `data/backups/`
- **postgres**: set `DATABASE_URL` and install `pg` (`cd synapto-backend && npm i`)

## Railway

1. Push this repo to GitHub
2. New project → Deploy from GitHub → select repo
3. Railway detects Dockerfile
4. Optional: Add Postgres plugin → set `DATABASE_URL`
5. Set env: `NODE_ENV=production`, `CORS_ORIGINS=https://your-app.up.railway.app`
6. Health check path: `/health`

## Render

1. New → Web Service → connect repo
2. Runtime: Docker
3. Optional: PostgreSQL → link `DATABASE_URL`
4. Env: `NODE_ENV=production`, `CORS_ORIGINS=https://your-service.onrender.com`

## Domain checklist

1. Buy domain
2. CNAME to Railway/Render
3. Update `CORS_ORIGINS` to `https://yourdomain.com`

## Verify

```bash
curl https://YOUR_HOST/health
# expect: {"ok":true,"version":"2.2.0","security":true,"storage":"postgres"|"json"}
```
