# Synapto AI

Interactive AI literacy platform — lessons, quizzes, AI Builder, trophies, certificates, and an **xAI & Grok** world.

## Quick start

```bash
./start.sh
```

Open **http://localhost:3001/synapto-xai.html**

One Node process serves the API and the frontend.

### Manual

```bash
cd synapto-backend
STATIC_DIR=.. PORT=3001 node server.js
```

Requires **Node.js 18+**.

## Features

- 12 learning worlds, 200+ lessons (including xAI & Grok)
- Parent/learner account gate; email + password auth (scrypt)
- Illustrated avatars, certificates, streaks, tokens, PWA
- Zero-dependency backend (`synapto-backend/server.js`)

## Deploy

Docker:

```bash
docker build -t synapto .
docker run -p 3001:3001 synapto
```

Or connect this repo to **Railway** / **Render** (see `Dockerfile`, `railway.toml`, `render.yaml`).

## Layout

```
synapto-xai.html          App shell
css/synapto.css           Styles
js/synapto.js             App + lesson data
icons/                    PWA icons
synapto-backend/server.js API + static server
```

## License

Educational project. Not an official xAI product.
