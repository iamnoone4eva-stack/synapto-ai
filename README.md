# Synapto AI

Interactive AI literacy platform — lessons, quizzes, AI Builder, trophies, certificates, and an **xAI & Grok** world.

## Quick start

```bash
./start.sh
```

Open **http://localhost:3001/synapto-xai.html**

One process serves the API and the frontend.

## Project layout

```
├── synapto-xai.html      # App shell
├── css/synapto.css       # Styles
├── js/synapto.js         # Application logic
├── icons/                # PWA icons
├── manifest.webmanifest
├── sw.js
├── Dockerfile            # Production image
├── render.yaml / railway.toml
└── synapto-backend/
    └── server.js         # API + static file server
```

## Deploy

### Railway
1. Push this repo to GitHub
2. New project → Deploy from GitHub
3. Railway detects `Dockerfile`

### Render
1. New → Blueprint → `render.yaml`
2. Or Web Service + Docker

### Docker locally
```bash
docker build -t synapto .
docker run -p 3001:3001 synapto
```

## Account model

- **Continue as learner** — no account required
- **Parent/Teacher** — email + password (scrypt), optional Google Sign-In

## License

Educational project. Not an official xAI product.
