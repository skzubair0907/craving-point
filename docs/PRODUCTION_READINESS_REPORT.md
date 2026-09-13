# Craving Point Production Readiness Report

## Executive Summary

**Production Ready: NO — BLOCKED.** The React application, local checkout service, type check, test suite, and production build work. Release is blocked by unverified production Supabase access, no canonical HTTPS site URL, and incomplete live delivery-tracking infrastructure. No customer data or production database records were changed during this audit.

## Architecture Reviewed

- Vite 5, React 18, TypeScript, React Router, Zustand, Tailwind-style utility classes.
- Customer routes, cart, checkout, order receipt, customer tracking, admin routes, and responsive navigation.
- Local Node order API (`api/`), Netlify functions, Supabase REST/RPC integration, migrations, environment configuration, static assets, deployment configuration, and automated tests.

## Frontend

**FIXED**

- Removed a conditional React hook in `DeliveryMap2`, preventing hook-order runtime failures.
- Corrected the delivery page failure path so a failed order request displays an error rather than an endless loading view.
- Corrected shared tracking links to use the actual order identifier returned by the API.
- Replaced the application error boundary stack trace with a safe recovery screen.
- Removed a production mount debug log.

**WARNING**

- Full interactive browser-console testing could not be completed because the workspace browser connector failed to establish a sandbox session. Local HTTP smoke tests confirmed the SPA returns `200` for `/` and `/delivery-tracking/not-a-real-order`.

## Backend

**PASS**

- Order API enforces canonical catalog pricing, availability, delivery fees, taxes, request idempotency, payment signature verification, and generic server failure messages. These behaviors are covered by automated tests.
- Server-side service credentials are read only from non-`VITE_` variables.

**WARNING**

- The read-only production check cannot reach the configured Supabase REST API with the current server credential configuration. Orders must not be launched until this succeeds.

## Database

**WARNING**

- Checked-in migrations protect staff administration through `admin_can` and `set_order_status` server-side functions.
- `operations-upgrade.sql` contains reporting and cash-collection functions, but the deployment readiness check did not verify a reachable database. Apply it only through the Supabase SQL editor after reviewing the target project.
- `delivery-tracking.sql` now creates the location table, trusted staff write function, constraints, and RLS policies. Customer location reads go only through the token-protected server endpoint.

## Authentication & Authorization

**PASS / WARNING**

- Admin route protection uses Supabase authentication plus database-side `admin_can`, not only hidden UI controls.
- Login against the live project and a normal-user `/admin` denial must be completed manually after the production database connection is repaired.

## API Integrations

| Integration | Status | Notes |
| --- | --- | --- |
| Supabase | BLOCKED | Server readiness check cannot reach its REST API. |
| WhatsApp | MANUAL | Regular WhatsApp deep links are supported; no Business API automation is configured. |
| Payments | OPTIONAL / DISABLED | Razorpay remains unavailable until owner-provided server credentials and account setup exist. |
| Maps | FALLBACK | Google Maps has a Leaflet/OpenStreetMap fallback. |
| Rider tracking | NOT READY | Requires secure database schema, RLS policies, and a trusted rider update source. |

## Environment Variables

**PASS / WARNING**

- `.env.example` contains placeholders only and separates browser-visible Supabase configuration from private server variables.
- `SITE_URL` is not configured as an HTTPS canonical domain, so sitemap generation reports a warning and the production readiness check fails.
- Set production values only in the hosting provider; never put server secrets in `VITE_*` variables.

## Secret/API-Key Security

**FIXED / OWNER ACTION REQUIRED**

- No private server credential variable is exposed through the browser environment configuration.
- The bundle contains Supabase library format checks for strings such as `sb_secret_`; this is library code, not a credential finding.
- A private Supabase credential was shared in the conversation. **ROTATION REQUIRED:** revoke/rotate it in Supabase, update the server-only production environment variable, and remove it from every terminal history or copied file under the owner's control.

## Menu & Product Flow

**PASS**

- Tests cover catalog pricing, variants, availability, stock limits, coupons, malformed carts, and unavailable products.

## Cart / Ordering

**PASS / BLOCKED FOR LIVE RELEASE**

- 33 automated tests pass, including cart persistence, duplicate order retry behavior, canonical pricing, validation, delivery charges, payment verification, and tracking-token access control.
- Real production order submission remains blocked until Supabase connectivity is verified and an isolated test order succeeds.

## Admin

**WARNING**

- Admin authorization is database-backed in the checked-in code. Live staff sign-in, role validation, menu persistence, and dispatch updates require a working production Supabase connection before release.

## Mobile / Responsive

**PASS (CODE/HTTP) / NOT FULLY BROWSER-VERIFIED**

- Mobile-specific navigation and admin drawer styles are present. The delivery page uses responsive single-column and two-column layouts.
- A complete viewport interaction pass remains required once the browser connector is available or on a physical phone after deployment.

## 3D / Animations

**PASS**

- The application configures Framer Motion to respect user reduced-motion preference. Existing media has image fallbacks and below-the-fold lazy loading in the audited sections.

## Accessibility

**FIXED / WARNING**

- The error boundary now offers a plain-language recovery action instead of raw diagnostics.
- Customer/admin keyboard and screen-reader testing remains a manual release check.

## SEO

**WARNING**

- Build-time SEO generation runs, but a production canonical HTTPS `SITE_URL` is required before the sitemap can represent the release domain.

## Performance

**WARNING**

- The production build uses route-level chunks. The largest observed chunks are Supabase (about 220 kB raw) and Leaflet (about 150 kB raw); Leaflet is isolated in the delivery-tracking route.

## Production Build

**PASS**

- `npm run build` completed successfully after the delivery and error-boundary fixes.

## Issues Found

### CP-001 — P1 — Delivery portal fabricated a moving rider location

- **Root cause:** `DeliveryTracking` generated a simulated coordinate when no rider update was available.
- **Files:** `src/pages/DeliveryTracking.tsx`
- **Fix:** Removed the simulated location. The map and ETA now use only verified backend tracking updates, and an outage message is shown on subscription errors.
- **Verification:** Type check and all tests pass; production build passes.

### CP-002 — P1 — Delivery tracking backend was incomplete

- **Root cause:** The hook subscribed directly to a table that had no checked-in schema or RLS policies.
- **Files:** `src/hooks/useDeliveryTracking.ts`, `supabase/`
- **Fix:** Added `supabase/delivery-tracking.sql`; customer polling now uses the private tracking token through `orderStatus`, and direct anonymous database reads are removed.
- **Verification:** Automated token-protected location test passes. The migration still must be applied in Supabase before live coordinates can be stored.

### CP-003 — P1 — Production Supabase REST API is not verified

- **Root cause:** `npm run check:production` reports database API reachability failure.
- **Files:** Production hosting environment and Supabase project settings.
- **Fix:** Owner action required; validate URL and newly rotated server credential in hosting, then rerun the check.
- **Verification:** Read-only production check fails this condition.

### CP-004 — P2 — Error boundary exposed internal stack traces

- **Root cause:** The fallback rendered `error.stack` directly to customers.
- **Files:** `src/ErrorBoundary.tsx`
- **Fix:** Replaced with a professional generic error and retry button.
- **Verification:** Type check and production build pass.

### CP-005 — P2 — Missing canonical production URL

- **Root cause:** `SITE_URL` is unset or not HTTPS.
- **Files:** Hosting environment.
- **Fix:** Owner action required; set the final HTTPS domain and rebuild.
- **Verification:** Build reports the sitemap warning and `check:production` fails this condition.

## Security Actions Required

1. Rotate the previously disclosed Supabase server secret immediately.
2. Set the replacement only as `SUPABASE_SERVICE_ROLE_KEY` in the server/Netlify environment.
3. Verify RLS and least-privilege policies in the actual production Supabase project.
4. Create a backup and restore drill before accepting live orders.

## Manual Owner Actions Required

1. Configure a real HTTPS domain and `SITE_URL`.
2. Repair Supabase REST access, then run `npm run check:production` until all applicable checks pass.
3. Apply reviewed Supabase migrations, including `operations-upgrade.sql`, to the intended project.
4. Apply `supabase/delivery-tracking.sql`, then connect the trusted rider/admin location updater to `set_delivery_location`.
5. Place one cash-on-delivery test order and confirm it appears, updates, and persists in the live admin portal.
6. Configure payment and WhatsApp Business API only if those automated services are required.

## Final Verification

| Area | Result |
| --- | --- |
| Build | PASS |
| Frontend type check | PASS |
| Automated tests | PASS — 33/33 |
| Backend unit coverage | PASS |
| Database connection | FAIL — production REST API unreachable |
| Security | WARNING — credential rotation required |
| Ordering | BLOCKED pending live database test |
| Admin | BLOCKED pending live database test |
| Responsive | PARTIALLY VERIFIED |
| Production Ready | **NO — BLOCKED** |
