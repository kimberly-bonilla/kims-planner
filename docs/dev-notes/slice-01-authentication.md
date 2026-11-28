# Slice 1: Sign up, log in, log out (development notes)

**PRD requirements:** ACC-1 (sign up, log in, log out) and ACC-2 (users only ever see their own data). Also NFR-3 (database-level data isolation) and NFR-8 (accessibility).
**Shipped:** PR #1 (`07c4ef5`) and fix PR #2 (`5e28964`), merged to `main` as `e3711ce` on Nov 25, 2026.
**Live:** https://kims-planner-kimberlyb.vercel.app

---

## 1. Problem it solves

Kim's Planner stores private information: guest names, emails and phone numbers, budgets, and vendor conversations. Before any of that can exist, the app has to know **who is using it** and must guarantee that **nobody can see anyone else's data**. Slice 1 adds accounts, login sessions, a protected area of the site (`/app`), and the first database table (`profiles`) locked down so each user can only see their own row.

Every later slice builds on this. Events, guests, budget and vendors all belong to a user, so they all depend on Slice 1.

## 2. User problem or business need

- **For the user:** "I want my wedding plans saved, private, and waiting for me when I come back, on my laptop or my phone."
- **For the business:** a subscription product needs accounts. The free plan's one-event limit, the Premium upgrade, billing and notifications all attach to a user, and you can't charge for or limit something you can't tie to a person.
- **For trust:** the product handles other people's personal data (guest contact details). A data leak between accounts would end the product, so isolation is enforced in the database, not just hidden in the UI.

## 3. Database tables involved and why they exist

### `auth.users` (owned by Supabase Auth, not created by us)
Supabase's built-in table of accounts: email, hashed password, confirmation status and metadata. We never write to it directly; Supabase Auth manages it. We read it indirectly through the session.

### `public.profiles` (created in `supabase/migrations/20261125042441_profiles.sql`)

| Column | Type | Why |
| --- | --- | --- |
| `id` | `uuid`, primary key, references `auth.users(id)` on delete cascade | One profile per account. Deleting the account deletes the profile. |
| `display_name` | `text`, 1 to 80 characters, nullable | Shown in "Welcome, Taylor" and the account menu. Later used as the sender name on vendor emails (INT-8). |
| `is_admin` | `boolean`, default `false` | Unlocks the vendor admin dashboard in Slice 7. Users must never be able to change it. |
| `created_at`, `updated_at` | `timestamptz` | Auditing. `updated_at` is kept current by a trigger. |

**Why a separate `profiles` table instead of only `auth.users`?** The `auth` schema belongs to Supabase and isn't exposed through the app's API. App-specific fields (display name, admin flag, and later default currency and active event) belong in our own `public` schema, where we control the columns and the security rules.

**Other database objects in the same migration:**
- `public.set_updated_at()` is a reusable trigger function. Every future table will reuse it to keep `updated_at` current.
- `public.handle_new_user()` plus the trigger `on_auth_user_created` creates the profile row automatically when Supabase Auth inserts a new user. It copies `display_name` from the sign-up metadata, trimmed and capped at 80 characters.

## 4. API endpoints involved and their purpose

The project uses **Server Actions** for changes made from inside the app and **Route Handlers** only for things called by outside systems (PRD decision TEC-1).

| Endpoint | Kind | Purpose |
| --- | --- | --- |
| `signUp(prevState, formData)` | Server Action (`app/(auth)/actions.ts`) | Validates name, email and password with Zod, then calls `supabase.auth.signUp`. If email confirmation is off (local or CI), redirects to `/app`. If it's on (production), returns a "check your email" state. |
| `logIn(prevState, formData)` | Server Action | Validates, calls `signInWithPassword`, then redirects to the safe `next` path (default `/app`). |
| `logOut()` | Server Action | Calls `signOut` (clears the session cookies) and redirects to `/login`. |
| `GET /auth/callback` | Route Handler (`app/auth/callback/route.ts`) | Where the confirmation email link lands. Exchanges `?code=` (PKCE) or verifies `?token_hash=&type=` for a session, then redirects into the app. Sends a failed link to `/login?error=link`. |
| `GET /api/health` | Route Handler (from Slice 0) | Liveness check, unchanged. |

**Middleware** (`middleware.ts`) isn't an endpoint, but it runs before every request to `/app`, `/login`, `/signup` and `/auth/*`. It refreshes the session cookie and handles redirects.

Behind these, the app talks to Supabase's own HTTP APIs (`/auth/v1/*` for accounts, `/rest/v1/profiles` for data) through the `@supabase/supabase-js` client.

## 5. Files created or modified and why they are important

### Database
- **`supabase/migrations/20261125042441_profiles.sql`:** the `profiles` table, Row Level Security policies, column privileges and the sign-up trigger. The single most security-critical file in the slice.
- **`supabase/config.toml`:** local auth settings. Site URL `http://localhost:3000`, allowed redirect URLs, minimum password length 8 (matches the app's validation).

### Shared logic (`packages/core`, plain TypeScript with no React or Next)
- **`src/auth.ts`:** Zod schemas (`signUpSchema`, `logInSchema`), `firstFieldErrors` (turns Zod errors into one message per field), `safeRedirectPath` (blocks open redirects) and `friendlyAuthError` (maps Supabase errors to human text). It lives here so the future mobile app reuses the exact same rules.
- **`src/auth.test.ts`:** 17 unit tests for the above.

### Supabase plumbing (`apps/web/lib`)
- **`lib/env.ts`:** reads the two public Supabase settings, fails with a helpful message if they're missing, and strips an accidental `/rest/v1/` from the URL (a real bug we hit; see section 11).
- **`lib/supabase/server.ts`:** creates a Supabase client for Server Components, Server Actions and Route Handlers using Next's cookie store. It acts *as the signed-in user*, so the database security rules always apply.
- **`lib/supabase/middleware.ts`:** `updateSession()` refreshes the session cookie, checks whether the user is signed in, and redirects (signed out on `/app` goes to `/login?next=…`; signed in on `/login` goes to `/app`). Also marks private pages `Cache-Control: no-store`.
- **`middleware.ts`:** wires `updateSession` in, with a `matcher` limited to auth-related paths.
- **`lib/auth.ts`:** `requireUser()` returns the verified user plus profile, or redirects to `/login`. Wrapped in React `cache()` so the layout and the page share one lookup per request.

### Pages and actions (`apps/web/app`)
- **`(auth)/actions.ts`:** the three Server Actions.
- **`(auth)/layout.tsx`:** centered card with the wordmark and lace border, shared by log-in and sign-up.
- **`(auth)/login/page.tsx` and `(auth)/signup/page.tsx`:** the two forms. Log-in also shows the "link expired" message.
- **`auth/callback/route.ts`:** the email confirmation handler.
- **`(app)/app/layout.tsx`:** the protected layout. Calls `requireUser()` and wraps everything in `AppShell`. Marked `force-dynamic` so per-user pages are never prerendered.
- **`(app)/app/page.tsx`:** the empty dashboard ("Welcome, {first name}" and "Let's create your first event").
- **`page.tsx` (modified):** the landing page's "Coming soon" became "Create your free account" and "Log in" buttons.

The parentheses in `(auth)` and `(app)` are **route groups**: they organise files and share layouts without appearing in the URL.

### Components (`apps/web/components`)
- **`auth/auth-form.tsx`:** one client component for both forms. Uses React 19's `useActionState` for the server result and `useFormStatus` for the "Please wait…" button. Accessible field errors use `aria-invalid` and `aria-describedby`.
- **`app-shell/app-shell.tsx`:** the signed-in frame: header, side nav on laptops, bottom tab bar on phones, and a "Skip to content" link.
- **`app-shell/app-nav.tsx` and `nav-items.ts`:** navigation (one item for now; later slices add more), with `aria-current="page"` on the active link.
- **`app-shell/user-menu.tsx`:** avatar initial, name and Log out. Built on a native `<details>` element so it works without JavaScript.

### Tests and CI
- **`tests/integration/helpers.ts`:** reusable helpers that create real test users in a *local* Supabase and sign them in. Every future slice uses these to prove Row Level Security.
- **`tests/integration/profiles-rls.int.test.ts`:** 8 database security tests.
- **`e2e/auth.spec.ts`:** browser tests for the full account lifecycle.
- **`vitest.integration.config.ts` and `vitest.config.ts`:** keep slow database tests separate from fast unit tests.
- **`.github/workflows/ci.yml`:** now starts a throwaway local Supabase in CI, runs the database tests against it, then the browser tests.
- **`README.md`:** hosted Supabase Auth settings, `db push --remote`, and OneDrive troubleshooting.

## 6. Authentication flow step by step

### Sign up (production, email confirmation on)
1. The user fills in name, email and password on `/signup` and submits.
2. The browser posts the form to the `signUp` Server Action (no API route needed; Next handles the request).
3. `signUpSchema` validates and normalises: trims the name, lowercases the email, checks the password is 8 to 72 characters. Failures return field errors and the form re-renders with the user's input kept (never the password).
4. The action calls `supabase.auth.signUp({ email, password, options: { data: { display_name }, emailRedirectTo: <site>/auth/callback?next=/app } })`.
5. Supabase inserts into `auth.users`. The database trigger `on_auth_user_created` fires and inserts the matching `profiles` row with the display name.
6. Supabase emails a confirmation link. No session exists yet, so the action returns `{ status: "check-email" }` and the form shows "Check your email".
7. The user clicks the link. Supabase verifies it and redirects to `/auth/callback?code=…` (or `?token_hash=…&type=…` with a custom email template).
8. The callback exchanges the code for a session. Supabase's SSR helper writes the session into **HTTP cookies**, and the user is redirected to `/app`.

*(Locally and in CI, email confirmation is off, so `signUp` returns a session immediately and step 3 of the action redirects straight to `/app`.)*

### Log in
1. The user submits email and password on `/login` (possibly `/login?next=/app/...` if they were bounced from a protected page).
2. `logIn` validates, then calls `signInWithPassword`.
3. On failure it returns a friendly message ("Your email or password is incorrect.") and keeps the email filled in.
4. On success Supabase sets the session cookies, and the action redirects to `safeRedirectPath(next)`, which only allows paths on our own site.

### Every request to a protected page
1. **Middleware** runs first. It builds a Supabase client from the request cookies and calls `getClaims()`, which verifies the access token and refreshes it if it has expired, writing new cookies onto the response.
2. Not signed in and on `/app…` → redirect to `/login?next=<where they were going>`.
3. Signed in and on `/login` or `/signup` → redirect to `/app`.
4. The **layout** then calls `requireUser()` → `getUser()`, which asks Supabase's Auth server to confirm the user. That's a second, authoritative check before any private data is rendered.
5. The page renders with `Cache-Control: private, no-store` so the browser won't keep a copy.

### Log out
1. The user opens the account menu and clicks Log out. That's a form posting to the `logOut` action.
2. `signOut()` revokes the session and clears the cookies, then redirects to `/login`.
3. Pressing Back requests `/app` again (nothing was cached), the middleware sees no session, and redirects to `/login`.

## 7. How the feature works from the user's perspective

- The landing page has **Create your free account** and **Log in** buttons.
- **Sign-up** asks for name, email and password ("At least 8 characters"). Mistakes show next to the right field in plain language, and what you typed stays.
- In production you see **"Check your email"**. The link in the email signs you in and opens your dashboard.
- **Log-in** says "Welcome back". A wrong password shows "Your email or password is incorrect."
- The **dashboard** greets you by first name and invites you to create your first event (that arrives in Slice 2).
- Laptops show a side menu, and phones show a bottom tab bar with large tap targets.
- The **account menu** (your initial, top right) shows your name and email and has Log out.
- If you open a private link while signed out, you're asked to log in and then taken to the page you wanted.

## 8. How the feature works technically

- **Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase Auth plus Postgres, `@supabase/ssr` for cookie-based sessions, Zod for validation, Tailwind for styling.
- **Sessions live in cookies, not `localStorage`.** `@supabase/ssr` stores the access and refresh tokens in cookies, so the *server* can read them. That's what lets Server Components render the right user's data and lets middleware protect pages before any HTML is sent.
- **Three Supabase clients, one per context:** server (Server Components, Actions, Route Handlers, using `next/headers` cookies), middleware (using request and response cookies), and plain `supabase-js` clients in tests. All use the *public* (anon or publishable) key. The powerful service-role key is never in the web app; only tests use it.
- **Two layers of identity checks:** `getClaims()` in middleware (fast token verification plus refresh) and `getUser()` in the layout (a round trip to the Auth server, authoritative). Supabase warns that `getSession()` data from cookies must not be trusted on the server, so it's never used.
- **Server Actions with progressive enhancement:** the forms are plain `<form action={…}>`, so they submit even before JavaScript loads. `useActionState` then adds inline errors without a page reload.
- **Validation is shared** from `packages/core`, so the web app today and the Expo app later run identical rules.
- **Data access always goes through Row Level Security.** Even if application code had a bug, the database refuses to return another user's profile.

## 9. Security considerations implemented

| Risk | What we did |
| --- | --- |
| Seeing another user's data | **Row Level Security** on `profiles`: `select` and `update` only where `auth.uid() = id`. No insert or delete policies at all. Tested with two real users. |
| Privilege escalation (making yourself admin) | **Column-level privileges:** `authenticated` may only update `display_name`. `is_admin` can only be changed by hand in SQL. |
| Trigger abuse | `handle_new_user` is `security definer` (it needs to write to `profiles`) but has `set search_path = ''` (prevents search-path hijacking) and `execute` revoked from all client roles. |
| Open redirect (`?next=https://evil.example`) | `safeRedirectPath` only allows same-site paths. It rejects `//host`, `/\host`, absolute URLs and control characters. Unit tested. |
| Leaking internals in error messages | `friendlyAuthError` maps known errors and returns a generic message for anything else. |
| Account enumeration | Log-in uses one message for "wrong email" and "wrong password". Supabase also hides whether an email is already registered when confirmation is on. |
| Private pages in the browser cache | `Cache-Control: private, no-store` on `/app/*`. The Back button after log-out is tested. |
| Trusting unverified cookies | The server uses `getClaims()` and `getUser()`, never `getSession()`, for identity. |
| Personal data in URLs | The "check your email" screen comes from action state, not a `?email=` query string. |
| Password limits | Minimum 8 characters (app and Supabase config match). Maximum 72 characters because bcrypt ignores anything longer. |
| Secrets in git | `.env.local` is git-ignored. Only the public key is used by the app. The service-role key exists only in CI's throwaway local stack. |
| Testing against production | Database and sign-up tests run only when the Supabase URL is `localhost` or `127.0.0.1` (`hasLocalSupabase`) or `E2E_SUPABASE=local`. They can never create users in the real project. |
| Outage blast radius | The middleware `matcher` only covers auth paths, so the public landing page and `/api/health` stay up even if Supabase settings are missing. |

## 10. Tests added

**Unit tests (Vitest, `packages/core/src/auth.test.ts`): 17 tests**
- Sign-up schema: valid input is normalised (trimmed name, lowercased email), there's one error message per field, and passwords over 72 characters are rejected.
- Log-in schema: missing fields produce friendly messages.
- `safeRedirectPath`: allows `/app` and paths with query strings, and rejects 9 dangerous inputs.
- `friendlyAuthError`: maps known Supabase messages and never leaks unknown technical text.

**Database integration tests (Vitest against a local Supabase, `profiles-rls.int.test.ts`): 8 tests**
1. Sign-up creates a profile with the display name, with `is_admin` false.
2. A user can read their own profile.
3. A user can't read another user's profile; listing all profiles returns only their own.
4. A signed-out visitor sees no profiles.
5. A user can change their own display name.
6. A user can't change someone else's profile.
7. A user can't set `is_admin` (permission error, value unchanged).
8. A user can't insert or delete profiles.

**Browser tests (Playwright, `e2e/auth.spec.ts`): 4 tests, each run on desktop and phone (8 runs)**
- Signed-out `/app` redirects to `/login?next=%2Fapp`.
- Log-in and sign-up pages pass an automated WCAG 2.1 AA check (axe).
- Bad sign-up input shows the three field errors, keeps the typed email, and sets `aria-invalid`.
- **Full lifecycle:** sign up → dashboard (plus an accessibility check) → signed-in users skip `/login` → log out → Back doesn't show the dashboard → wrong password error → correct password logs back in.

**CI:** on every PR and on `main`, GitHub Actions runs lint, type check, unit tests, starts a local Supabase (database and auth only), runs the database tests, builds, and runs all 12 Playwright tests.

## 11. Bugs encountered

1. **Every Supabase call returned 404.** The Supabase URL in `.env.local` had been pasted as `https://<project>.supabase.co/rest/v1/`. The client appends its own paths, so requests went to `/rest/v1/auth/v1/...`.
2. **`npx supabase db push` tried to reach a local Docker database and failed.** In Supabase CLI 3, `db push` targets the local database by default.
3. **The dev server crashed with `EINVAL: invalid argument, readlink …\.next\…`.** The project lives inside OneDrive, which was syncing Next's build folder and turning files into cloud placeholders.
4. **GitHub's checks didn't run after pushing the branch.** The workflow only triggers on `pull_request` and on pushes to `main`.
5. **The full sign-up test failed on desktop with an accessibility violation:** `label-content-name-mismatch`. The account menu button had `aria-label="Account menu for Taylor Rose"` while its visible text was "Taylor Rose".
6. **The same test failed on phone with a Playwright "strict mode violation":** `getByRole('alert')` matched two elements, the form's error message *and* Next.js's hidden route announcer (`<div role="alert" id="__next-route-announcer__">`).
7. **The live site seemed not to have Slice 1 (404 on `/login`).** Vercel was deploying to a *new* project (`kims-planner` under `kimberlyb`), but I was checking the old project's URLs (`-kimberly21`), which still served Slice 0.
8. **PR #1 was merged while its checks were failing,** so `main` briefly had a red build.

## 12. How the bugs were fixed

1. **URL:** removed the suffix in `.env.local`, and made `lib/env.ts` strip `/rest/v1/` and trailing slashes so the mistake can't break the app again.
2. **db push:** used `npx supabase db push --remote --dry-run` to preview, then `npx supabase db push --remote`. Corrected the README.
3. **OneDrive:** deleted `apps/web/.next` and restarted. Documented it in the README's Troubleshooting section. (A longer-term fix is moving the repo out of OneDrive, or excluding `.next` from sync.)
4. **CI trigger:** opened a pull request, which is the intended workflow anyway (checks plus a Vercel preview before merging).
5. **Accessibility:** removed the `aria-label` and made the accessible name start with the visible name, followed by screen-reader-only text: `<span className="sr-only">, account menu</span>`. Verified by rendering the shell on a temporary page: the old version failed with the exact same axe rule and the new one passed on desktop and phone. The temporary files were then deleted.
6. **Strict mode:** scoped the locator to the form: `page.locator("form").getByRole("alert")`, with a comment explaining the hidden announcer.
7. **Vercel:** found the real project name in the Vercel status on the GitHub commit, then probed the new domains. The live URL is now `kims-planner-kimberlyb.vercel.app`, and the README and Supabase redirect settings were updated to match.
8. **Red main:** fixed forward in PR #2, then confirmed both the PR run and the `main` run passed (12/12 browser tests, none skipped).

## 13. Key technical decisions and why they were chosen

- **Supabase Auth instead of building auth myself:** password hashing, email confirmation, token refresh and rate limiting are hard to get right. Supabase was already the database, so its auth plugs straight into Row Level Security (`auth.uid()`).
- **Cookie sessions via `@supabase/ssr`:** the server needs to know the user to render private pages and protect routes. `localStorage` tokens are invisible to the server.
- **Server Actions instead of API routes for forms:** less code, type-safe, and forms work before JavaScript loads. API routes are reserved for outside callers (Stripe, email webhooks, cron, and later the mobile app), per the PRD.
- **Security in the database (RLS), not just the app:** a bug in one page can't leak data if the database itself refuses. The PRD requires this (NFR-3).
- **A trigger to create profiles:** the profile is created in the same database transaction as the account, so there's never an account without a profile, even if the app crashes mid-request.
- **Column privileges for `is_admin`:** RLS controls *which rows* you can touch. Column grants control *which fields*. Both were needed.
- **Validation in `packages/core`:** one set of rules for web and mobile, testable without a browser.
- **Middleware `getClaims()` plus layout `getUser()`:** fast checks on every request and an authoritative check before private data renders.
- **Middleware only on auth paths:** keeps the public site independent of Supabase.
- **`<details>` for the user menu:** native, keyboard-accessible, works without JavaScript, and needs no dropdown library.
- **Tests against a throwaway local Supabase in CI:** real database behaviour (RLS, triggers) is tested without ever touching production data.
- **A confirmation callback that supports both `code` and `token_hash`:** the default email works now, and switching to the cross-device `token_hash` template later needs no code change.
- **Branch → PR → checks → merge:** every slice gets a preview deploy and the full test suite before it reaches users.

## 14. What I learned from this slice

- **Authentication and authorisation are different.** Auth proves *who* you are (Supabase Auth). Authorisation decides *what you can touch* (RLS plus column privileges). Both are needed.
- **RLS is row-level, not column-level.** Without the column grant, a user could have updated their own row's `is_admin`. A policy alone wouldn't stop it.
- **Server-side rendering changes how sessions work.** Tokens must be in cookies, and middleware must refresh them, because Server Components can't write cookies.
- **Don't trust what you can't verify.** `getSession()` just reads a cookie. `getClaims()` and `getUser()` verify it.
- **Accessibility rules are specific and testable.** WCAG 2.5.3 means the accessible name must contain the visible text, so an `aria-label` can make things *worse*. Automated axe checks in CI caught what I'd never have spotted by eye.
- **Frameworks add invisible elements.** Next.js's route announcer is a hidden `role="alert"`, so tests should locate elements within a meaningful container.
- **Read the tool's current docs.** The Supabase CLI changed `db push`'s default between versions, and checking `--help` for the installed version settled it.
- **"Deployment succeeded" doesn't mean "my URL shows it".** Check which project and domain a deployment belongs to.
- **Wait for green before merging.** CI is only useful if it gates the merge (a good next step is a GitHub branch protection rule).
- **Keep build folders out of cloud-sync folders** like OneDrive.

## 15. Resume talking points

- Implemented email and password authentication for a Next.js 15 and Supabase SaaS app: cookie-based SSR sessions, route protection in middleware, Server Actions, and email-confirmation handling with PKCE and token-hash support.
- Designed database-enforced data isolation with PostgreSQL Row Level Security and column-level privileges. Wrote 8 integration tests proving cross-account access and privilege escalation are blocked.
- Built a CI pipeline (GitHub Actions) that starts an ephemeral Supabase stack to run database security tests and end-to-end Playwright tests on desktop and mobile viewports for every pull request.
- Built automated WCAG 2.1 AA checks (axe) into end-to-end tests. They caught and led to a fix for a "label in name" (2.5.3) violation before release.
- Hardened authentication flows against open redirects, account enumeration, error-message leakage and cached private pages, all covered by unit tests.

## 16. Interview talking points

**"Walk me through how authentication works in your app."**
Supabase Auth issues an access token and a refresh token, stored in HTTP cookies by `@supabase/ssr`. Middleware runs before protected routes, verifies the token with `getClaims()` and refreshes it if it has expired, then redirects signed-out users to `/login?next=…`. The protected layout does a second, authoritative `getUser()` call before rendering. Forms post to Server Actions that validate with Zod and call Supabase.

**"How do you make sure one user can't see another user's data?"**
In the database, not just the UI. Every user-owned table has Row Level Security with `auth.uid() = owner`. On `profiles`, users can only `select` and `update` their own row, have no insert or delete rights, and through column grants can only update `display_name`, so they can't make themselves admin. I prove it with integration tests that create two real users in a throwaway local Supabase and try to read and modify each other's rows.

**"Why Server Actions instead of a REST API?"**
For in-app form submissions they're less code, end-to-end type-safe, and work without JavaScript. I keep API routes for external callers (webhooks, cron, the future mobile app), so each has a clear purpose.

**"Tell me about a bug you found and fixed."**
The full sign-up test passed on mobile but failed on desktop with an accessibility violation. The account menu had `aria-label="Account menu for Taylor Rose"` while showing "Taylor Rose". WCAG 2.5.3 requires the accessible name to contain the visible text, so voice-control users who say "click Taylor Rose" would fail. It only failed on desktop because on phones the name is hidden. I reproduced it on a temporary page, confirmed the old version failed with the same rule and the fix passed, and replaced the label with the visible name plus screen-reader-only text.

Also: the same test on mobile hit a Playwright strict-mode error, because Next.js renders a hidden `role="alert"` route announcer. Scoping the locator to the form fixed it. The lesson was that tests should target elements inside a meaningful container.

**"How do you test security-sensitive code without touching production?"**
CI starts a local Supabase in Docker, exports its URL and keys, and runs tests against that. The test helpers refuse to run unless the URL is `localhost` or `127.0.0.1`, so they can't accidentally create users in the real project.

**"What would you improve?"**
- Branch protection so PRs can't merge until checks pass (one PR was merged while red).
- A custom email template using `token_hash`, so confirmation links work on a different device than the one used to sign up.
- "Forgot password" and rate-limit messaging.
- Moving the repo out of OneDrive.
- Updating the GitHub Actions versions that still target Node 20.

**"What's the trade-off of putting logic in database triggers?"**
The profile is guaranteed to exist atomically with the account, even if the app crashes. The cost is that the logic is less visible to someone reading only the TypeScript, so I comment it in the migration and cover it with an integration test.
