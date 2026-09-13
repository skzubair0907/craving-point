# AGENTS

## Project overview

This repo is a Vite + React + TypeScript storefront for Craving Point. The app is a customer-facing restaurant experience with checkout, order tracking, admin screens, and a Netlify/Supabase backend.

- Frontend: `src/`
- App routing: `src/App.tsx`
- Pages: `src/pages/`
- UI components: `src/components/`
- Store/state: `src/store/`
- Static/generated menu data: `data/menu.json`
- API/server layer: `api/` and `netlify/functions/`
- Database/migrations: `supabase/`
- Docs: `README.md`, `docs/`, and `artifacts/redesign/`

## Common commands

- Install dependencies: `npm install`
- Start the local app: `npm run dev`
- Start local backend API: `npm run start:api`
- Run tests: `npm test`
- Type-check: `npm run lint`
- Production build: `npm run build`
- Production health check: `npm run check:production`

## Architecture and conventions

- Use React + TypeScript patterns and keep feature code colocated under `src/pages/` or `src/components/` when appropriate.
- The app uses React Router and lazy-loaded route modules from `src/App.tsx`.
- Store and restaurant data live in `src/store/`; prefer shared data hooks over ad hoc state duplication.
- Tailwind and app styling live in `src/index.css`, `src/styles/`, and component-level classes; follow existing class patterns and design tokens rather than introducing a different styling system.
- Menu/pricing data is sourced from `src/data/mockData.ts` and synced into `data/menu.json` via `node scripts/sync-menu.cjs`.
- Do not edit generated menu files by hand when the source menu is meant to change; update the source first and then sync.
- Payment and order logic should remain server-side; never put secret values in browser code.

## Security and deployment notes

- `SUPABASE_SERVICE_ROLE_KEY` and other private credentials must remain server-only and must not be prefixed with `VITE_`.
- Netlify is the primary deployment/backend target for the checkout endpoint. Vercel requires a compatible order function before checkout is reliable there.
- Production readiness and environment variables are documented in `README.md` and `docs/PRODUCTION-SETUP.md`.

## Useful references

- [README.md](README.md)
- [docs/PRODUCTION-SETUP.md](docs/PRODUCTION-SETUP.md)
- [docs/RELEASE-READINESS.md](docs/RELEASE-READINESS.md)
- [artifacts/redesign/IMPLEMENTATION.md](artifacts/redesign/IMPLEMENTATION.md)

## Working guidance for AI agents

- Prefer minimal, surgical edits that match the existing React/TypeScript patterns.
- Verify changes with the smallest relevant command: `npm run lint` for type issues and `npm test` for checkout/cart regressions.
- If a change affects menu data, pricing, or checkout flows, check the corresponding docs and sync scripts before editing.
- Keep generated data and source-of-truth data aligned; do not create drift between `src/data/` and generated files.
