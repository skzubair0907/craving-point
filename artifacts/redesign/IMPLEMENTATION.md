# Craving Point .88 redesign

The existing React/Vite/TypeScript application was upgraded in place. The catalog, Zustand cart, coupon calculations, checkout endpoints, Supabase publication/authentication and admin routes remain connected to their existing implementations.

## Experience

- Warm charcoal, cream and restaurant-red visual system with locally served Barlow Condensed and Inter fonts (OFL licenses bundled).
- Original food-led homepage: hero, editorial introduction, marquee, interactive menu, supplied shawarma assembly film, Instagram profile cards, bulk enquiry, visit/map, and editorial footer.
- Damped pointer perspective, card tilt, magnetic hero CTA, contextual cursor and viewport reveals. Native scrolling is preserved.
- Automatic low/medium/high interaction levels. Reduced motion and data saving disable advanced effects. Videos autoplay muted and loop while visible, provide pause controls, and pause offscreen or when the tab is hidden. Reduced-motion/data-saving users retain manual playback.
- Sweet/savoury selection persists for the session. Real catalog categories, search, item details, sizes, quantity and configured extras use existing prices.
- Product WhatsApp links include item, size, quantity, extras and special requests. Cart checkout remains available. Special-request text is explicitly for WhatsApp; the existing checkout has its own order-note field.
- Fixed direct-add size bypass, unsupported product ratings, incorrect image mappings, garbled currency characters and the mobile WhatsApp fallback.
- Matching supplied artwork is used for four products. Other items use readable text cards instead of unrelated promotional posters. Instagram cards link to the supplied profile; they do not pretend to be individual reels.
- Real supplied video provides the shawarma assembly; no fabricated WebGL food model or process claims were added.

## Assets and SEO

The four gallery PNGs total about 6.9 MB. Responsive WebP derivatives total about 552 KB across both sizes; the large variants total about 400 KB. Originals remain available. Fonts are served locally as WOFF2.

Restaurant/menu schema and page titles/canonical URLs follow the live catalog and current site origin. Private/customer routes are noindex. `npm run build` generates robots.txt; set `SITE_URL` to the production origin to generate sitemap.xml. Netlify's `URL` variable is also supported. A deployment hostname was not invented.

## Validation

- 15 existing cart, opening-hours, pricing, checkout, persistence and tracking tests passed.
- TypeScript and production build passed.
- Browser checks passed at 360, 390, 414, 768, 1024, 1280, 1440 and 1920 pixel widths: no horizontal overflow, broken images, or JavaScript errors.
- Checked size selection, quantity changes, cart totals, structured WhatsApp URL, sweet/savoury switch, search empty state, Escape dismissal, mobile navigation, dark/light themes and reduced motion.
- No external order or WhatsApp message was submitted. Live Supabase credentials and production order creation were not exercised.

Browser screenshots are in this directory. `scripts/verify-experience.cjs` is an optional smoke check using Playwright. Run the Vite server first and provide Playwright through the normal Node module path, or set `PLAYWRIGHT_MODULE` to an existing installation. The in-app browser connection failed before initialization; verification used a locally available headless browser.
