# Production launch setup

Hosting choice: Netlify. Start with its assigned netlify.app address; a paid custom domain is optional. Use a separate Supabase project for staging. Accounts must be owned by the restaurant.

## Required account actions
1. In Supabase API Keys, create a replacement secret for every exposed key. Update local .env and Netlify server environment settings, then revoke exposed keys. Do not send keys in chat. A code change cannot rotate an account credential.
2. In Supabase SQL Editor, execute the entire supabase/operations-upgrade.sql file. Never paste only part of a function. Run npm run check:production afterward.
3. Import this repository into the restaurant's Netlify account. Build command: npm run build; output: dist. Set Node 22. Configure variables from .env.example with real values using Netlify environment settings. Private keys must never have a VITE_ prefix. Set SITE_URL to the assigned HTTPS domain and rebuild.
4. Configure Supabase Auth site URL and allowed redirect URLs for the deployed site. Add only the intended staging and production origins.
5. Verify HTTPS before launch. Netlify provisions HTTPS for its domains; custom-domain certificates depend on correct DNS. See https://docs.netlify.com/manage/domains/secure-domains-with-https/https-ssl/.

## Staging verification
Use a dedicated Supabase staging project, not production customer data. Initialize its base schema and admin migrations, then apply operations-upgrade.sql and enable-order-realtime.sql. Create separate staff test accounts and check each permitted and forbidden action. Run the prepared supabase/test-inventory-rollback.sql in staging. Test two buyers ordering the last unit concurrently, cancellation restores inventory once, and delivery/pickup complete through paid cash collection and customer tracking. Isolated browser tests do not substitute for this check.

## Backups and restoration
Enable managed backups/PITR as appropriate in the Supabase account before launch. Check plan availability and retention in the dashboard. Follow https://supabase.com/docs/guides/platform/backups and https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore for database exports and restores. Database backups do not replace separate backups of uploaded Storage files. Keep encrypted copies outside the site repository, restrict access, and test restoration into staging before calling backups verified. No backup job or restore has been executed by this update.

## Monitoring
The deployed GET /.netlify/functions/health endpoint returns 200 when database access works, or 503 otherwise, without disclosing configuration. It does not certify every database migration or permission; use check:production for that. Configure an uptime monitor for this endpoint at a five-minute interval and send alerts to the restaurant owner. Use Netlify function logs to investigate failures. An external monitoring account and alert recipient still need setup; no automatic messages are enabled by this update.

## Launch gate
- npm test and npm run build pass; CI now fails on build errors.
- npm run check:production passes with the deployment environment.
- Previously exposed secrets are revoked and replacement keys verified.
- Live staging permission, inventory and order lifecycle checks pass.
- Backup restore drill and monitoring alerts are verified.
- Publish COD/pickup only until payment-provider test mode and refunds are tested.

Code preparation alone does not complete account setup, migrations, key rotation, deployment, backups or monitoring activation.
