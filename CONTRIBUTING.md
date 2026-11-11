# Contributing to Chatter & Platter Cafe OS

Thank you for helping improve **Chatter & Platter Cafe OS**!

## Getting Started

1. Fork the repository and create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app locally with zero cloud dependencies:
   ```bash
   npm run dev
   ```

## Code Quality Checks

Before committing or opening a pull request, make sure all checks pass:

```bash
npm run lint
npm run build
```

If you modify database queries or fields, please also update:
- [`supabase_schema.sql`](./supabase_schema.sql)
- [`server/cafeDbPlugin.js`](./server/cafeDbPlugin.js)
- [`src/data/firebaseRtdbClient.js`](./src/data/firebaseRtdbClient.js)
- [`src/hooks/supabaseHooks.js`](./src/hooks/supabaseHooks.js)

## Security & Privacy Rules

- Never commit `.env.local`, real API keys, customer order exports, or `data/cafe-db.json`.
- Validate all inputs accepted by [`server/cafeDbPlugin.js`](./server/cafeDbPlugin.js) using explicit field whitelisting.
- Keep CSV exports formula-safe via cell sanitization.
