# AutoTrust web (Next.js)

The AutoTrust website: public marketplace, sign-up and the role-based dashboards.
It talks to the FastAPI backend in `../backend`.

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · TanStack Query

## Run it

```bash
# 1. the API (from the repo root)
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000

# 2. the website
cd web
npm install        # first time only
npm run dev        # http://localhost:3100
```

`web/.env.local` holds the API address (defaults to `http://127.0.0.1:8000`):

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

The site runs on port **3100** (not 3000) and the backend allows it by default
(`CORS_ORIGINS`). If you change the port, change `CORS_ORIGINS` and
`FRONTEND_URL` in `backend/.env` too — email links use `FRONTEND_URL`.

## What's where

| Path | What |
|---|---|
| `src/app/(public)` | Landing page, `/cars` (list/grid + filters), `/cars/[id]` (gallery, 360° view, buy, enquire), `/advisor` |
| `src/app/(auth)` | Log in, sign up (buyer or seller), `/verify-email` |
| `src/app/(dashboard)/dashboard` | The dark dashboards: overview, listings, inspections, enquiries, orders, users, team, settings |
| `src/components/ui` | Buttons, badges, form fields, sheets, skeletons |
| `src/components/dashboard` | Dashboard shell, chart cards, tables |
| `src/components/chat` | The AI chatbot (bubble + window, shared with `/advisor`) |
| `src/lib` | API clients (`api.ts` for the browser, `server-api.ts` for server pages), types, access rules |
| `src/context` | Auth and chat state |

Design tokens (colours from the logo, dark dashboard palette) live in
`src/app/globals.css`. The dashboard accent is one line (`--color-accent`).

## How it works

* **Public pages are rendered on the server** (cars, car details) so they load
  fast and search engines can read them. Filters live in the URL.
* **The dashboard is client-side**: it keeps the login token in the browser and
  asks the API for what the signed-in person may see. The sidebar and pages
  adapt to the role and permissions; the server enforces them regardless.
* Photos come from the API (`/uploads/...`) or Cloudinary once configured.

## Build

```bash
npm run build && npm start
```
