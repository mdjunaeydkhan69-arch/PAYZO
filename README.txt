PAYZO working-code milestone 1 — Supabase sign-in + role checks

WHAT THIS VERSION DOES
- Public page only shows Agency Login and Host Login.
- Uses Supabase Auth email/password sign-in.
- Checks profiles.id = auth user id, status=active, and expected role before showing portal.
- Separate admin.html has no link from the public page and checks role=main_admin + status=active.
- Shows real withdrawal rows only if existing table columns and RLS policies allow them. No fake balances are shown.

IMPORTANT LIMITS
This is working application code, but it is NOT deployed or verified against the live database yet. Do not call it production-ready until the key is configured, SQL/RLS policies are reviewed, and login/role isolation is tested. Withdrawal approval buttons need a matching secure UPDATE policy and are not payment processing.

ONE REQUIRED CONFIG STEP
1. Open config.js.
2. Replace PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE with the Supabase project's Publishable key (or legacy anon key). This is the browser-safe public key; NEVER paste service_role or a database password here.
3. Keep config.js in the same folder as index.html and admin.html.

SUPABASE PROJECT
https://mgulicshqkbrgvpeeagu.supabase.co

EXPECTED PROFILES FIELDS
id (must equal auth.users.id), uid, full_name, role, status, agency_id.
Allowed role values used here: host, agency, main_admin. Support accounts are denied by this member portal.
Expected withdrawals fields follow the existing PAYZO setup. If column names differ, adjust queries before deployment.

ADMIN ENTRY
admin.html is a separate file with no public-page link. Hiding the URL is not security; server-side Supabase RLS must prevent all non-main_admin access.

DEPLOYMENT
This folder must be hosted on HTTPS (e.g. Cloudflare Pages or another static host). Opening index.html as a local file may not work reliably with Supabase Auth.
