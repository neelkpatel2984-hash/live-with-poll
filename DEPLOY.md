# Live with Poll — split deployment

This repo has **two deployable apps** plus shared source:

| Folder | Deploy to | Purpose |
|--------|-----------|---------|
| `apps/participant` | e.g. `https://join.example.com` | Participants only (PIN + name). |
| `apps/host` | e.g. `https://host.example.com` | Trainers: create rooms, dashboard, results. |
| `packages/shared` | *(not deployed alone)* | Firebase helpers, UI pieces, styles — bundled into each app. |

## Environment

Put a **single `.env` in the repo root** (next to this file). Both Vite apps use `envDir` pointing here.

Required: all `VITE_FIREBASE_*` variables (see `.env.example`).

Optional when the two sites use **different domains**:

- **`VITE_HOST_APP_URL`** — used by the **participant** build. If set, shows a “Host console” link to this URL. If unset, that link is hidden.
- **`VITE_PARTICIPANT_APP_URL`** — used by the **host** build for “Participant site” / “Participant view” links. If unset, host falls back to `window.location.origin` (same machine / path only).

## Firebase Realtime Database rules

Deploy `database.rules.json` from this repo. Room creation writes **`rooms/{pin}/meta`** and **`rooms/{pin}/_hb/{bundleKey}`** as two separate paths so rules that only allow those children (not the whole `rooms/{pin}` node) still work.

## Build

From repo root:

```bash
npm install
npm run build:participant   # output: apps/participant/dist
npm run build:host            # output: apps/host/dist
```

Or both: `npm run build:all`.

## Static assets

Each app has its own `public/` (e.g. `public/music/`). Deploy **`dist/` contents + `public/` files** your host needs (or ensure `public/music` is copied into `dist` by Vite — default Vite copies `public` into `dist` on build).

## Local dev

Two terminals:

```bash
npm run dev:participant   # usually http://localhost:5173
npm run dev:host          # usually http://localhost:5173 — change port if both run locally
```

If both run on the same machine, give one app a different port, e.g.:

```bash
cd apps/host && npx vite --port 5174
```

Then set `VITE_PARTICIPANT_APP_URL=http://localhost:5173` when building/testing host, and `VITE_HOST_APP_URL=http://localhost:5174` for participant.
