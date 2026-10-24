# Push large files from your machine

Repo: https://github.com/iamnoone4eva-stack/synapto-ai

Local artifacts already contain full commits. From the project folder:

```bash
git remote add origin https://github.com/iamnoone4eva-stack/synapto-ai.git 2>/dev/null || true
git branch -M main
git push -u origin main
```

Required large files:
- `js/synapto.js` (~950KB)
- `synapto-complete.html` (~1MB)
- `css/synapto.css`
- `synapto-backend/server.js` (full v2.2)

Or use GitHub Desktop / VS Code **Publish Branch**.
