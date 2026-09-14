# Cloudflare Pages deployment

This project can be deployed without Netlify using a Cloudflare Worker with static assets and the trusted order API.

## Before deployment

1. Push the latest project changes to GitHub.
2. Create a free Cloudflare account at `dash.cloudflare.com`.
3. Open **Workers & Pages** and select **Create** → **Import a repository**.
4. Select the Craving Point GitHub repository and production branch `main`.

## Build settings

```text
Framework preset: None
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: leave empty
```

## Environment variables

Add these as **encrypted** production variables. Never paste them into GitHub or browser code.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SITE_URL
```

Set `SITE_URL` to the generated `https://<project>.pages.dev` URL after the first successful deploy, then deploy again.

## Verification

After publishing, test:

1. `/` loads the customer website.
2. `/admin/login` loads after a direct browser refresh.
3. Add an item to cart and open checkout.
4. Place one test cash-on-delivery order.
5. Confirm it appears in `/admin` and update its status.
6. If Razorpay is enabled, set its webhook URL to `https://<project>.pages.dev/api/webhook` and run one online-payment test.

## Important

This deployment is a Cloudflare Worker, so do not select Vite as the Cloudflare framework preset; the repository's build configuration handles Vite. Rotate any secret previously shown in screenshots before public launch.
