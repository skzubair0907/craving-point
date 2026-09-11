# Craving Point release readiness

## Implemented in this update

- Order cancellation sends the required reason to the protected database function.
- Admin order details load and save internal notes and delivery assignments.
- Order timelines display persisted history. Invoice printing uses text nodes, not interpolated HTML.
- WhatsApp opens a prepared status update; staff must send it from their app.
- Product duplication creates an unavailable copy. Soft deletion is reversible; restoration keeps the item unavailable for review.
- Product editing supports up to six photo uploads, a primary image, gallery URLs, preview, SKU, display order, preparation time and schedule fields.
- Admin image overrides take priority over generated artwork. Deleted products cannot be opened through direct product links or ordered.
- Reports aggregate all orders within the selected date range in the database, using Indian Standard Time. Daily CSV exports require export permission.
- Cash collections can only be recorded for completed COD orders. Online payments still require provider verification.
- Saved order retries return the original receipt even when stock or availability subsequently changes.
- Inventory validation combines quantities across variants and duplicate cart lines.
- Private environment files, local order files and backups are excluded from version control.
- Production responses include content-type, referrer and browser-permission headers.

## Database action required

Run `supabase/operations-upgrade.sql` in the connected project's SQL Editor.
It adds the protected reporting and cash-collection functions and is safe to rerun.
Existing `admin.sql` and `enable-order-realtime.sql` must already be applied.
Do not rerun the initial `checkout-setup.sql` on an initialized database.

## Validation

- 19 automated Node tests pass: pricing, retries, tracking privacy, payments, reviews, stock and existing checkout behavior.
- Desktop (1366 px) and mobile (390 px) admin browser tests pass for notes, assignment, cancellation reasons, report rendering and page overflow. Database responses were intercepted; these are UI integration tests, not proof of live RLS behavior.
- Live connected checkout preview returned HTTP 200 and a calculated total without saving an order.
- `supabase/test-inventory-rollback.sql` is prepared for a test database. It verifies trigger reservation, failed-order rollback and exactly-once cancellation restoration. It has NOT been executed against the production database.

## Still required before production

1. Rotate every secret previously exposed in chat or screenshots. Save the replacement privately and restart the server.
2. Apply the operations migration and verify staff permissions, notes, assignments and cash collections with dedicated test accounts in a staging project.
3. Run database inventory tests in staging, plus a concurrent two-buyer test against the same final unit. No live concurrency test has been performed.
4. Complete a staging COD delivery and pickup from checkout through receipt, admin status changes and tracking. Do not use a real customer's details for tests.
5. The owner currently has regular WhatsApp/WhatsApp Business only. Automatic messages require a Business API provider and approved messaging setup. Current links do not auto-send.
6. No Razorpay account was supplied. Online payments remain disabled. Refund execution and refund reconciliation still require implementation/integration testing with provider test credentials; the current cancellation action does not issue a refund.
7. No hosting or domain account was supplied. Deploy the prepared Netlify build only after selecting the account and domain. Configure server secrets in hosting, auth redirect URLs, HTTPS and payment webhook URLs.
8. Configure database backups, retention and a restore drill in the selected database plan. This work has not configured managed backups or a monitoring provider.
9. Connect an error-monitoring/uptime provider before launch; current error handling is local and does not provide external alert delivery.

This is not a certification that the website is production-ready. Provider integrations, database permission tests, backups, staging lifecycle/concurrency tests and deployment remain open.
