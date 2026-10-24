# Synapto AI

**Interactive AI literacy platform** — short lessons, quizzes, collectible trophies, classroom tools, and a local AI tutor (Spark). Built for learners roughly ages 8–18, with parent/teacher modes.

> Independent educational product. Not affiliated with xAI / SpaceXSI unless separately agreed.

## Quick start

```bash
./start.sh
# or
npm start
```

Open **http://localhost:3001/synapto-complete.html** (standalone) or **http://localhost:3001/synapto-xai.html** (modular).

Health: `GET /health` → `{ ok, version, security, storage }`

## Layout

```
.
├── synapto-complete.html     # Full standalone app
├── synapto-xai.html          # Modular shell
├── css/  js/  icons/         # Frontend assets
├── synapto-backend/
│   ├── server.js             # API + static host (v2.2)
│   └── store.js              # Atomic JSON + optional Postgres
├── school-pilot/             # One-pager + demo script
├── Dockerfile  railway.toml  render.yaml
├── DEPLOY.md
└── start.sh
```

## Storage

| Mode | Setup |
|------|--------|
| JSON (default) | Atomic writes + backups in `synapto-backend/data/backups/` |
| Postgres | `cd synapto-backend && npm i` + `DATABASE_URL` |

See `.env.example` and [DEPLOY.md](./DEPLOY.md).

## School pilots

See [school-pilot/](./school-pilot/).

## License

See [LICENSE](./LICENSE).
