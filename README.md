# CHAK HR Analytics Dashboard

Standalone Next.js 16 HR analytics dashboard (App Router, React 19, Tailwind v4, Recharts).

## Local development

```bash
npm install
npm run dev -- -p 3001
```

## Production build

```bash
npm run build
npm run start
```

## Deploy to Render

This repo includes a [`render.yaml`](./render.yaml) blueprint.

1. Open https://render.com/deploy?repo=https://github.com/john25898/hr-analytics-dashboard
2. Sign in with GitHub and approve the `render.yaml` blueprint.
3. Render builds and serves the app at `https://hr-analytics-dashboard.onrender.com`.

Notes:
- The service uses the **free** plan (512 MB RAM, spins down after idle — the first request may take ~30 s).
- `next.config.mjs` caps Turbopack to `cpus: 2` and disables the dev file-system cache so local dev does not saturate the CPU.

## Environment variables

Optional. Only needed if you revive the Supabase leave-sync backend:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The app renders fully without them; only cross-app leave/timesheet sync is disabled.

## Data

Employee records are read from `data/employees-enriched.json` via `lib/excel-data.ts`.
