# Craving Point

A premium, Vite + React + TypeScript storefront for Craving Point.

## Local development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
# open http://localhost:5173
```

Run `npm run start:api` in a second terminal to enable local checkout. Vite
proxies `/api/orders` to the API on `127.0.0.1:8787`. Local orders are saved in
`data/orders.json`; preview requests do not save orders.

Run `npm test` for checkout/cart regression tests and `npm run lint` for the
application TypeScript check. The production build runs both the TypeScript
check and menu synchronization. `data/menu.json` is generated from
`src/data/mockData.ts`; update the source menu and run `node scripts/sync-menu.cjs`
when changing products or prices.

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

Recommended: Vercel or Netlify.

Vercel:
1. Connect your GitHub repo to Vercel.
2. Set the build command to `npm run build` and the output directory to `dist`.

Netlify:
1. Connect your repo to Netlify.
2. Set the build command to `npm run build` and the publish directory to `dist`.
3. A `netlify.toml` is included for a basic configuration.

## Notes
- Admin access requires Supabase authentication and an administrator profile. See production setup below. Customer/review/analytics screens label their sample data; they are not live reporting.
- Images included under `public/images` are referenced by `/images/...` paths.

## Production checkout setup

The order endpoint is a Netlify function. Run `supabase/schema.sql` for a new
database, then `supabase/order_requests.sql` to enable private, durable guest
order snapshots and protect profile roles. Configure `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` as server-only Netlify environment variables. Never
prefix the service key with `VITE_` or put it in browser code.

Admin sign-in requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and a user
whose `profiles.role` is `admin`. Orders from checkout appear in Admin → Orders.
Without server storage configuration, order creation returns an unavailable
message instead of displaying a false success. Vercel needs a compatible order
function before checkout can work there; the included endpoint targets Netlify.

Payment is due at delivery or pickup. Online payment, server-backed loyalty
redemption, live customer tracking, and dashboard analytics are not connected.
Account details and favorites are stored on the current device. Storefront menu
and opening hours currently come from `src/data/mockData.ts`; database admin
edits do not automatically publish those storefront values.

## Verification

Regression tests cover server-controlled prices, quantities, sizes, coupon
limits, pickup fees, malformed carts, and failures to persist orders. All local
image/video references were checked. Interactive browser verification could not
run in the repair environment because the browser tool failed to initialize;
mobile layout and both themes still need a visual review before deployment.

## September 2026 storefront redesign

The editorial storefront, asset strategy and verification notes are documented in
[artifacts/redesign/IMPLEMENTATION.md](artifacts/redesign/IMPLEMENTATION.md).
Set `SITE_URL` (or Netlify `URL`) when building to generate a sitemap for the
actual deployment. Canonical URLs follow the current site origin.
