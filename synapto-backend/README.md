# Synapto Backend

Zero-dependency Node server: REST API + static frontend.

```bash
STATIC_DIR=.. PORT=3001 node server.js
```

Auth: POST `/api/auth/signup` and `/api/auth/login` with `{ email, password }` (scrypt).
