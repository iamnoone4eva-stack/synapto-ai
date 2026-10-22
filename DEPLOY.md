# Deploy notes

## Large assets

The lesson data and app logic live in:

- `js/synapto-data.js` (~150KB) — BANDS + LESSONS
- `js/synapto.js` (~800KB) — app logic
- `css/synapto.css` or split base/components

If these are missing from GitHub (size limits on the API used to seed the repo), copy them from your local build folder:

```bash
git clone https://github.com/iamnoone4eva-stack/synapto-ai.git
cp /path/to/artifacts/js/* synapto-ai/js/
cp /path/to/artifacts/css/* synapto-ai/css/
cp /path/to/artifacts/icons/* synapto-ai/icons/
cd synapto-ai
git add -A && git commit -m "Add full app assets" && git push
```

## Railway / Render

Connect the GitHub repo; Dockerfile builds a single service on port 3001.
