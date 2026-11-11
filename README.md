# Chatter & Platter Cafe — Open Source AI Smart Cafe OS (PWA)

A modern, real-time QR ordering PWA, Kitchen Display System (KDS), Reception POS, and AI Business Intelligence suite designed for cafes and quick-service kitchens. Runs **out of the box with zero cloud setup** using the built-in persistent disk database, and scales seamlessly to **Firebase Realtime Database** or **Supabase PostgreSQL**.

---

## Highlights & Interactive Features

- **Customer QR Ordering (`/?table=5`)**
  - **Chatter AI Barista**: Natural-language craving finder (e.g., *"spicy under 80"*), mood presets, time-of-day recommendations, and 1-tap combos.
  - **Smart Cart**: AI dish/drink pairings, live kitchen ETA countdown, cooking instruction chips, and swipe-to-remove.
  - **Live Token Tracker**: Real-time order step timestamps, audio chime & vibration alerts, and fullscreen ready celebration.
  - **Smart Feedback**: 5-star rating with quick tags & automatic sentiment analysis.
- **Reception POS (`/?role=reception` or `/login`)**
  - **AI Quick-Order Parser**: Type *"2 masala tea, 1 veg momo table 4"* to auto-populate walk-in orders.
  - Real-time pending payment queue, atomic `1–99` token assignment, order editing, and active token search/filtering.
- **Chef Kitchen Display (`/?role=chef` or `/login`)**
  - High-contrast dark 3-column Kanban board (`New`, `Cooking`, `Ready`) with single-tap advancement + Undo.
  - **AI Batch Prep Bar**: Live item totals across active tickets so chefs can batch-cook efficiently, plus Rush Mode toggle and overdue ticket alerts.
- **Owner AI Hub & Admin SQL Console (`/login`)**
  - Hourly Cash vs Online charts, top sellers leaderboard, customer sentiment feed, interactive **Ask Chatter AI Analyst**, formula-safe CSV export, live stock control, and an in-app [`supabase_schema.sql`](./supabase_schema.sql) viewer.

---

## Quick Start (Zero External Keys Needed)

```bash
git clone https://github.com/Abhishek11hub987/Project_Chatter-Platter.git
cd Project_Chatter-Platter
npm install
npm run dev:host
```

Open in your browser (or scan from phones on the same Wi-Fi):
- **Customer QR Menu**: `http://localhost:5173/?table=5`
- **Staff Portal & Interactive Role Explorer**: `http://localhost:5173/login`
- **Reception Terminal**: `http://localhost:5173/?role=reception` (default dev PIN: `1234`)
- **Chef KDS Terminal**: `http://localhost:5173/?role=chef` (default dev PIN: `5678`)

---

## Free Multi-Tier Database Architecture

The data layer automatically selects the best active database:

1. **Supabase PostgreSQL + Realtime**: Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` and run [`supabase_schema.sql`](./supabase_schema.sql) in the Supabase SQL Editor.
2. **Firebase Realtime Database (Free Spark Plan)**: Set `VITE_FIREBASE_DB_URL` in `.env.local` for zero-pause free cloud sync on static deployments like Vercel.
3. **Built-in Persistent Cafe Disk DB (Default)**: Runs automatically via [`server/cafeDbPlugin.js`](./server/cafeDbPlugin.js) during `npm run dev` / `npm run dev:host` / `npm run preview`, persisting to `data/cafe-db.json` with real-time Server-Sent Events (`/api/events`).
4. **Browser Local Mode**: Automatic `localStorage` + `BroadcastChannel` fallback.

---

## Configuration & Security

Copy [`.env.example`](./.env.example) to `.env.local` to customize database credentials and terminal PINs (`VITE_RECEPTION_PIN`, `VITE_CHEF_PIN`). Never commit `.env.local` or `data/`.

Please read [`SECURITY.md`](./SECURITY.md) before deploying to a public internet URL.

---

## Scripts

- `npm run dev` / `npm run dev:host` — Start app + built-in real-time disk DB
- `npm run build` — Build production PWA bundle
- `npm run lint` — Run fast static analysis (`oxlint`)
- `npm run test:e2e` — Run Playwright E2E suite

## License

[MIT](./LICENSE)
