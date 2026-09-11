# Website feature audit — 9 September 2026

Tested the local website at http://127.0.0.1:5173. No real order, payment, message, review or admin publication was submitted. Application behavior was not changed during this audit.

## Results

- Browser audit: 59 of 60 checks passed. Details: `feature-audit.json`.
- Existing automated suite: all 15 tests passed.
- TypeScript validation and production build passed.
- All 85 menu cards across 16 categories rendered and their displayed images decoded.
- Homepage checked at 360, 390, 414, 768, 1024, 1280, 1440 and 1920 pixels: no horizontal overflow or broken displayed images.
- Additional menu, product, account and offers layouts checked at 390, 768 and 1440 pixels.
- No uncaught browser JavaScript errors in the final audit.

## Verified features

Menu category selection, sweet/savoury switching, search and empty results; product modal, size and quantity selection; structured WhatsApp link with selected size, quantity and customization; product details and add-on totals; cart drawer, cart persistence, quantity changes, removal, empty state and valid/invalid coupons; account details saved locally and prefilled at checkout; favorite persistence and removal; delivery/pickup switching and required-name validation; mobile navigation and Escape dismissal; light-theme toggle and persistence; video muted playback with loop enabled; reduced-motion autoplay suppression; offers/about/location/contact routes; missing page and missing product states; empty receipt/tracking states; unauthenticated guards on all eight admin routes.

The existing unit tests also cover server pricing, taxes, pickup fees, coupon caps, invalid orders, duplicate request handling, private tracking tokens, review eligibility and payment signature/capture logic using test fixtures. These do not demonstrate a live payment or production database connection.

## Issues found

1. **Checkout phone validation fails in the browser.** In `src/pages/Checkout.tsx`, the pattern `[+0-9 ()-]{10,20}` is invalid under modern HTML pattern syntax. Entering `abc` returns `checkValidity() === true` and `patternMismatch === false`. Required-name validation works; the server has a separate phone check.
2. **Four new products use other dishes' photos.** Kurkure Bowl uses Lays Bowl; Cheese Tandoori Bowl uses Tandoori Bowl; LLB Loaded Shawarma uses plain Chicken Shawarma; White Pasta Sauce Momo uses yellow Boom Boom Momo. Their original catalog image paths also point to nonexistent files. The storefront override prevents blank cards but does not make these images accurate.
3. **Five shawarma prices are unconfirmed.** Plain Chicken Shawarma (₹120), LLB Loaded Shawarma (₹150), BBQ Shawarma Bowl (₹150), Chicken Cheese Shawarma Bowl (₹150), and Chicken Tandoori Shawarma Bowl (₹150) were inferred in the earlier implementation; the supplied second poster has no prices. Confirm with the restaurant before treating them as authoritative.
4. **Admin photo changes can be masked by fixed mappings (source review).** `src/lib/productMedia.ts` prioritizes `generatedMenuMedia` and supplied artwork over `item.image_url`. Consequently an image URL changed through the catalog editor will not appear on those mapped storefront items. Live admin editing was not exercised.

## Environment and coverage limits

The local order API initially was not running, so paymentConfig returned 500 through Vite. After starting `node api/server.cjs`, paymentConfig returned 200 with `onlineAvailable: false`, malformed order preview returned 400, and tracking without credentials returned 404. No valid order was submitted. Online payments are unavailable in this tested local configuration.

Admin routes display their access guard; authenticated admin editing, publishing, customer data, order status changes and live Supabase synchronization remain unverified without an authorized test account. Real payment completion, persisted order receipt, live tracking updates, review submission and external WhatsApp delivery were not tested end to end. External map/link destinations were not submitted to or exhaustively checked.

The in-app browser failed to initialize with a sandbox metadata error. Browser checks used the existing local headless Playwright installation. The initial audit's locator/case timing errors were corrected in the test harness and rerun; the final 59/60 count reflects the corrected run.

Re-run the main browser audit with `node scripts/audit-features.cjs` and the homepage smoke check with `node scripts/verify-experience.cjs`; provide an existing Playwright installation through `PLAYWRIGHT_MODULE`. Run Vite and the local order API first. Screenshots: `feature-audit-momos.png`, `audit-light-cart.png`, `review-390.png`, `review-1440.png`.
