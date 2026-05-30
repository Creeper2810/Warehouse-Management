# WMS Backend Node.js + Express

This backend is a Node.js + Express refactor of the Laravel API. It keeps the same public API prefix (`/api/v1`) so the existing Vue/Vite/Quasar frontend can keep using its current axios calls and Vite proxy.

## Requirements

- Node.js 22.22.0+ (Node.js 22.21.0 is blocked because it crashes Vite HTTPS/HMR)
- MySQL running locally
- Existing database name defaults to `wms`, matching `wms-backend/.env`

## Setup

```powershell
cd wms-backend-node
npm install
npm run migrate
npm run seed
npm run dev
```

The server listens on `http://127.0.0.1:8000` by default, matching the current frontend proxy.

Seed users:

- `admin@gmail.com` / `123`
- `manager@mail.com` / `123`
- `staff@mail.com` / `123`

## Scripts

- `npm run migrate`: creates or updates the required MySQL tables without dropping existing data.
- `npm run seed`: upserts the three local users.
- `npm run dev`: starts the Express API.
- `npm test`: runs unit tests. Set `RUN_DB_TESTS=1` only when you have a disposable test database configured.

## API Compatibility Notes

- SPA auth keeps `/sanctum/csrf-cookie` and `/api/v1/auth/login`.
- Mobile auth keeps `/api/v1/auth/login-mobile` and Sanctum-style bearer tokens (`id|plainToken`).
- Core WMS endpoints keep the Laravel response shapes used by the frontend: products with `inventory` and `suppliers`, stock movement pagination with `data/meta/links`, and stock operations wrapped in `{ message, data }`.
