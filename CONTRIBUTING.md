# Contributing

1. Fork and branch from `main`
2. Keep zero-dep server path working without `DATABASE_URL`
3. Run `node --check synapto-backend/server.js` before pushing
4. Do not commit `.env`, `synapto-backend/data/`, or secrets
5. Prefer editing `js/synapto.js`; regenerate `synapto-complete.html` when shipping a full bundle
