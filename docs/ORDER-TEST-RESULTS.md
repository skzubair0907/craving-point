# Customer and admin order verification — 11 September 2026

## Fixes
- Admin WhatsApp order updates add India's country code to a 10-digit customer number.
- Background order status refreshes preserve unsaved notes and delivery selections.
- Refunded orders no longer show the cash collection action.

## Passed
- 19 automated tests: canonical pricing, variants, coupons, inventory validation, idempotent retries, private tracking, payment verification and reviews.
- Isolated desktop delivery and mobile pickup browser lifecycles: required fields, service error recovery, order receipt, cart clearing, automatic admin discovery without refresh, all fulfilment steps, automatic customer tracking, notes, cash recording, reviews, search and responsive layout.
- Desktop/mobile admin cancellation reasons, delivery assignments and report rendering.
- TypeScript validation.

The lifecycle uses the real order service with an in-memory repository. Supabase operations are intercepted. It does not prove live database triggers, RLS policies, payment processing or Realtime publication are correct. Automatic admin discovery can use the five-second polling fallback.

## Connected database checks (read-only)
- order_requests, order_admin_details, delivery_staff, order_history, admin_staff and inventory are reachable.
- set_order_status and admin_can functions are listed in the live API schema.
- record_cash_collection and admin_sales_report are NOT listed: the operations migration is still missing.

## Required database fix
Run the complete contents of `supabase/operations-upgrade.sql` in the connected Supabase project's SQL Editor. The file is idempotent and preserves existing orders. This session has REST access but no SQL execution connection; the migration was not applied here.

Then verify cash collection and reports with dedicated test accounts, and perform a staging lifecycle/inventory test. No production orders, cash collections, customer messages or payment charges were created during these checks. Online payments require provider credentials and a provider test-mode run.

Production build: passed (TypeScript and Vite).
