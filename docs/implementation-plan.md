# Kim's Planner — Technical Implementation Plan (vertical slices)

**Product name:** Kim's Planner — used for the website, the iPhone and Android apps, the script wordmark, page titles, app store listings, the PWA name and the sender name on all outgoing email. The PRD's working title was "Wedding & Event Planner".

## Context

The PRD (v1.0, Nov 20 2026) describes a subscription SaaS: a free event organizer (guests, budget, vendors, checklist, calendar) plus Premium AI Vendor Outreach (AI-written inquiries sent to many vendors, replies captured in a hub, comparison, Confirm Vendor), on web + iOS + Android. The project folder `event-planner/` is empty, so this is a greenfield plan. The goal is to break the PRD into **small vertical slices** that one junior developer can build, test and ship one at a time, each ending in something a user can see and use on the live URL.

Requirement IDs (ACC-1, BUD-4, OUT-5 …) refer to the PRD so every slice can become a GitHub issue / milestone.

---

## Ground rules that apply to every slice

**Repository layout (decided in Slice 0 so mobile never forces a restructure — TEC-7, NFR-9):**
```
event-planner/
  apps/web/          Next.js 15 App Router (website + API Routes)
  apps/mobile/       Expo app (added in Slice 22)
  packages/core/     Plain TypeScript business logic + Zod schemas + types (shared)
  supabase/          migrations/, seed.sql, config.toml
  .github/workflows/ ci.yml
```
pnpm workspaces. `packages/core` has no React or Next imports, so both apps and tests can use it.

**How data flows**
- Web reads data in **Server Components** and changes it with **Server Actions** (validated with Zod schemas from `packages/core`) — TEC-1.
- **API Routes** (`apps/web/app/api/...`) exist only for outside callers: Stripe, RevenueCat, Postmark inbound, Vercel Cron, and the mobile app's premium/server-only actions.
- Mobile does plain CRUD (guests, budget, tasks…) **directly against Supabase** with the user's session; Row Level Security protects it. It calls API Routes only for things that need secrets (AI, sending email, Confirm Vendor, Stripe/RevenueCat).

**Every slice must ship with**
1. A Supabase migration (`supabase migration new <name>`), RLS enabled on every new user-owned table with an `owner = auth.uid()` policy (directly or through `events.owner_id`) — NFR-3, TEC-2.
2. Vitest unit tests for any pure logic added to `packages/core`.
3. At least one Playwright test for the slice's main happy path (or extend an existing one).
4. CI green (lint, type check, tests) and a Vercel preview deploy that a reviewer clicks through.
5. Mobile-width check (375px) — DES-5, NFR-1.

**Definition of "done" for a slice:** acceptance criteria pass on the preview URL, merged to `main`, deployed to production URL.

**Naming conventions used below**
- *Action* = Server Action in `apps/web/app/(app)/.../actions.ts`
- *Route* = API Route
- *Core* = function in `packages/core/src/...`

---

## Phase 1 — Foundation

### Slice 0 — Project skeleton, design tokens, live URL
**Goal:** A themed "Coming soon" page is live on Vercel, CI runs on every PR.

- **Features:** monorepo; Next.js 15 + TS strict; Tailwind + shadcn/ui themed with PRD §9 tokens; fonts (Cormorant Garamond, DM Sans, one script face via `next/font/google`); Supabase project linked; GitHub Actions; Vercel deploys from `main` + previews.
- **Database changes:** none (empty first migration to prove the pipeline works).
- **API endpoints:** `GET /api/health` → `{ ok: true }`.
- **Pages:** `/` placeholder landing page with the "Kim's Planner" script wordmark; `APP_NAME = "Kim's Planner"` constant in `packages/core/brand.ts`, used for `<title>`, metadata, emails and (later) the Expo `app.json` name — never hard-coded elsewhere.
- **Components:** `Button`, `Card`, `Input`, `Label` (shadcn, re-themed); `Wordmark`; `LaceBorder` (CSS/SVG scallop, decorative only — DES-3).
- **Dependencies:** none (first slice). Accounts needed: GitHub, Vercel, Supabase.
- **Acceptance criteria:**
  - [ ] Production URL shows the "Kim's Planner" landing page with Plum Wine text on ivory and correct fonts; browser tab title reads "Kim's Planner".
  - [ ] `tailwind.config` exposes tokens by role (`bg-chablis`, `text-plum`, `bg-sage`…), not raw hex in components.
  - [ ] A PR triggers CI (lint, typecheck, vitest, playwright) and a preview deploy.
  - [ ] `supabase db reset` runs locally without error.
  - [ ] Text contrast of the landing page passes an axe check.

### Slice 1 — Sign up, log in, log out (ACC-1, ACC-2)
**Goal:** A person can create an account, log in, and see an empty, protected dashboard.

- **Features:** email + password auth with Supabase Auth (cookie sessions via `@supabase/ssr`); middleware that redirects signed-out users from `/app/*`; profile row created on sign-up; log out.
- **Database changes:** `profiles (id uuid PK → auth.users, display_name text, is_admin bool default false, created_at)`; trigger `on_auth_user_created` inserts profile; RLS: user reads/updates own row (cannot change `is_admin`).
- **API endpoints:** Actions `signUp`, `logIn`, `logOut`; Route `GET /auth/callback` (email confirmation).
- **Pages:** `/signup`, `/login`, `/app` (empty dashboard: "Let's create your first event").
- **Components:** `AuthForm`, `AppShell` (top bar + side nav on desktop, bottom tab bar on mobile), `UserMenu`.
- **Dependencies:** Slice 0.
- **Acceptance criteria:**
  - [ ] New user can sign up, gets confirmed, lands on `/app`.
  - [ ] Visiting `/app` signed out redirects to `/login`.
  - [ ] Log out clears the session; back button does not show private data.
  - [ ] Wrong password shows an inline error, not a crash.
  - [ ] Playwright: sign up → see dashboard → log out.

---

## Phase 2 — Free MVP on the web

### Slice 2 — Create and edit an event (EVT-1…EVT-4)
**Goal:** User creates their one event and edits it any time.

- **Features:** create event form; edit page; event switcher placeholder; **free limit of 1 event** enforced on the server through `canCreateEvent(userId)` (for now every user is free; Slice 13 plugs in Premium). **Currency (CAD or USD):** user picks a default currency in account settings; each event has its own currency, pre-filled from that default and changeable in the event form.
- **Database changes:** enum `currency_code` (cad, usd); `profiles.default_currency currency_code default 'usd'`; enum `event_type` (wedding, engagement_party, bridal_shower, baby_shower, graduation_party, birthday_party, anniversary, corporate_event, other); `events (id, owner_id → auth.users, name, type event_type, custom_type text null, event_date date, city, venue, currency currency_code not null, created_at, updated_at)`; check: `custom_type` required when `type = 'other'`; RLS owner-only.
- **API endpoints:** Actions `createEvent`, `updateEvent`, `updateAccountSettings` (display name, default currency). Core: `eventSchema` (Zod), `canCreateEvent`, `formatMoney(cents, currency)` (uses `Intl.NumberFormat`, shows "CA$" vs "US$" so the two are never confused).
- **Pages:** `/app/events/new`, `/app/events/[eventId]/settings`, `/app/settings/account`. `/app` redirects to the user's event when one exists.
- **Components:** `EventForm` (type select reveals "custom type" input for Other; currency select), `CurrencySelect`, `DatePicker`.
- **Dependencies:** Slice 1.
- **Acceptance criteria:**
  - [ ] User creates an event with all five fields; it appears after reload.
  - [ ] Choosing "Other" requires a custom type name.
  - [ ] All fields are editable and saved.
  - [ ] A second create attempt (UI hidden *and* direct action call) is rejected with an "upgrade for unlimited events" message.
  - [ ] New event's currency defaults to the account's default; changing it on the event or in account settings is saved.
  - [ ] User B cannot read or update User A's event (test with two accounts via Supabase client — proves RLS).

### Slice 3 — Dashboard with countdown (DSH-1)
**Goal:** The event home page feels alive: name, date, days-to-go countdown, and empty cards for the summaries that later slices fill.

- **Features:** countdown ("142 days to go", "Today!", "3 days ago"); summary card placeholders with links.
- **Database changes:** none.
- **API endpoints:** none (Server Component reads `events`). Core: `daysUntil(date, today)`.
- **Pages:** `/app/events/[eventId]` (dashboard).
- **Components:** `CountdownCard`, `SummaryCard` (generic: title, big number, sub-text, link, empty state).
- **Dependencies:** Slice 2.
- **Acceptance criteria:**
  - [ ] Countdown is correct across time zones (unit-tested for today, future, past, leap years).
  - [ ] Dashboard is one column on phones, a grid on laptops.

### Slice 4 — Guest list and RSVPs (GST-1…GST-4, DSH-2)
**Goal:** User manages guests and sees RSVP counts on the list and dashboard.

- **Features:** add/edit/delete guest; five fields only; status pills; totals row (Invited, Attending, Declined, Pending) like the Ivory & Bloom reference; search by name; dashboard guest card.
- **Database changes:** enum `rsvp_status` (attending, declined, pending); `guests (id, event_id → events on delete cascade, name, email null, phone null, rsvp_status default 'pending', notes null, created_at, updated_at)`; index on `event_id`; RLS via owning event.
- **API endpoints:** Actions `addGuest`, `updateGuest`, `deleteGuest`, `setRsvpStatus`. Core: `guestSchema`, `countRsvps(guests)`.
- **Pages:** `/app/events/[eventId]/guests`.
- **Components:** `GuestTable` (desktop table / mobile card list), `GuestFormDialog`, `RsvpPill`, `RsvpTotals`, `ConfirmDeleteDialog` (reusable).
- **Dependencies:** Slice 3.
- **Acceptance criteria:**
  - [ ] New guest defaults to Pending.
  - [ ] Changing a pill updates totals instantly and after reload.
  - [ ] Dashboard shows guest count + Attending/Declined/Pending.
  - [ ] Invalid email is rejected with a field error.
  - [ ] 300 guests render without noticeable delay (NFR-2).
  - [ ] Vitest: `countRsvps`; Playwright: sign up → create event → add first guest (TEC-9 test).

### Slice 5 — Budget categories and expenses (BUD-1…BUD-3, roll-up part of BUD-4, DSH-3)
**Goal:** User tracks estimated vs actual cost per category and for the whole event.

- **Features:** suggested starting categories (Venue, Catering, Cake, Photography, Flowers, Entertainment) offered on first visit with one click; add/rename/delete category; add/edit/delete expense; per-category and event totals; dashboard budget card.
- **Database changes:** `budget_categories (id, event_id, name, sort_order)`; `expenses (id, category_id → budget_categories on delete cascade, description, estimated_cost numeric(12,2) null, actual_cost numeric(12,2) null, source_saved_vendor_id null, needs_price bool default false, created_at)` (the last two columns are used in Slice 9); RLS via event.
- **API endpoints:** Actions `createCategory`, `renameCategory`, `deleteCategory`, `addSuggestedCategories`, `addExpense`, `updateExpense`, `deleteExpense`. Core: `budgetTotals(categories, expenses)` (money in integer cents internally).
- **Pages:** `/app/events/[eventId]/budget`.
- **Components:** `BudgetSummary`, `CategorySection` (collapsible), `ExpenseRow` (inline edit), `MoneyInput`.
- **Dependencies:** Slice 3.
- **Acceptance criteria:**
  - [ ] Totals roll up per category and overall; empty costs count as 0.
  - [ ] Deleting a category asks for confirmation and removes its expenses.
  - [ ] Dashboard shows estimated and actual totals.
  - [ ] All amounts display in the event's currency (CA$ or US$); switching the event's currency changes the label only — no conversion.
  - [ ] Vitest covers rounding (e.g. 0.1 + 0.2), empty values and `formatMoney` for CAD and USD.

### Slice 6 — Vendor directory, read-only (VND-1, VND-2)
**Goal:** User browses and searches a directory of real-looking vendor profiles.

- **Features:** list with category filter (10 categories), city filter, text search; vendor profile page (business info, contact details, website, description).
- **Database changes:** enum `vendor_category` (bakers, photographers, florists, makeup_artists, hairstylists, djs, caterers, venues, decorators, transportation); `vendors (id, business_name, category, city, contact_email, phone, website, description, is_published bool default true, created_at)`; trigram/`tsvector` index for search; RLS: any signed-in user can `select` published rows; no client writes. `supabase/seed.sql` with ~30 sample vendors (fake emails on a domain you own for testing).
- **API endpoints:** none (Server Component queries with search params). Core: `vendorSearchSchema`.
- **Pages:** `/app/vendors`, `/app/vendors/[vendorId]`.
- **Components:** `VendorCard`, `VendorFilters`, `CategoryChips`, `VendorProfile`, `EmptyState`.
- **Dependencies:** Slice 1 (directory is not event-specific).
- **Acceptance criteria:**
  - [ ] Filtering by "Bakers" and city "Toronto" shows only matching vendors.
  - [ ] Search matches business name and description.
  - [ ] Search state lives in the URL (shareable, back button works).
  - [ ] A user cannot insert/update vendors from the browser (RLS test).

### Slice 7 — Admin dashboard for vendor profiles (VND-4)
**Goal:** You (the founder) can add, edit, unpublish and delete vendor profiles without touching SQL.

- **Features:** admin-only area; vendor CRUD form; publish/unpublish toggle.
- **Database changes:** RLS policies on `vendors` allowing insert/update/delete when `profiles.is_admin = true` for `auth.uid()`; set your own account to admin via a one-off SQL in the migration notes (not in code).
- **API endpoints:** Actions `adminCreateVendor`, `adminUpdateVendor`, `adminDeleteVendor`, each calling Core `requireAdmin()`.
- **Pages:** `/admin/vendors`, `/admin/vendors/new`, `/admin/vendors/[vendorId]`.
- **Components:** `AdminVendorTable`, `VendorForm`.
- **Dependencies:** Slice 6.
- **Acceptance criteria:**
  - [ ] Non-admin visiting `/admin` gets 404; direct action calls are rejected.
  - [ ] Admin-created vendor appears in the directory immediately; unpublished ones disappear.

### Slice 8 — Favorite vendors and track status (VND-3, VST-1, VST-2 without the budget part)
**Goal:** User saves vendors to their event and moves them through Saved → Contacted → Replied → Confirmed.

- **Features:** heart button on cards and profile; "My vendors" page grouped by category; status dropdown; unfavorite.
- **Database changes:** enum `vendor_status` (saved, contacted, replied, confirmed); `saved_vendors (id, event_id, vendor_id → vendors, status default 'saved', confirmed_cost numeric null, confirmed_snapshot jsonb null, confirmed_at null, created_at, unique(event_id, vendor_id))`; RLS via event.
- **API endpoints:** Actions `saveVendor`, `unsaveVendor`, `setVendorStatus`.
- **Pages:** `/app/events/[eventId]/vendors` (My vendors).
- **Components:** `FavoriteButton` (optimistic), `SavedVendorList`, `VendorStatusSelect`, `StatusBadge`.
- **Dependencies:** Slices 2 and 6.
- **Acceptance criteria:**
  - [ ] Favoriting from the directory adds the vendor to My vendors with status Saved.
  - [ ] Saving the same vendor twice is impossible (unique constraint, friendly message).
  - [ ] Status changes persist; badges use the right colors with ≥4.5:1 text contrast.

### Slice 9 — Confirming a vendor highlights the budget line (BUD-4, VST-2, free half of CNF)
**Goal:** Setting a vendor to Confirmed highlights its budget line and asks the user to enter the price.

- **Features:** when status → Confirmed, run one transaction: set status/confirmed_at, store `confirmed_snapshot` (business name, email, phone, website), find a budget category matching the vendor category (mapping table in Core, e.g. bakers → "Cake"), flag a matching expense `needs_price = true` and link `source_saved_vendor_id`. If no matching line exists, show a banner "Create a Cake budget line for [Vendor]?" which creates category/expense with the flag. Highlighted row (Rosewater background + message "Add the price you agreed with [Vendor]"). Entering an actual cost clears the flag.
- **Database changes:** Postgres function `confirm_saved_vendor(saved_vendor_id uuid)` (`security invoker`, so RLS still applies) doing the transaction; index on `expenses.needs_price`.
- **API endpoints:** Action `confirmVendor` (calls the RPC); `updateExpense` clears `needs_price` when `actual_cost` is set. Core: `categoryForVendor(vendorCategory)`.
- **Pages:** budget page and My vendors (updated).
- **Components:** `NeedsPriceBanner`, highlighted state in `ExpenseRow`, `CreateBudgetLinePrompt`.
- **Dependencies:** Slices 5 and 8.
- **Acceptance criteria:**
  - [ ] Confirming a baker with a "Cake" line → that line is highlighted with the include-price message.
  - [ ] Confirming with no matching line → prompt offers to create it; accepting creates a highlighted line.
  - [ ] Typing the price clears the highlight; price is never filled automatically.
  - [ ] Works for free users.
  - [ ] Vitest for the category mapping; SQL test (or Playwright) that the transaction is all-or-nothing.

### Slice 10 — Editable checklist (CHK-1…CHK-3)
**Goal:** Every new event starts with the default wedding checklist, fully editable.

- **Features:** starter checklist copied into the event on creation (about 30 items with suggested due dates relative to the event date, e.g. "Book venue — 12 months before"); check off; add/edit/delete; set/clear due date; filter (All / To do / Done); progress bar.
- **Database changes:** `tasks (id, event_id, title, due_date null, done bool default false, source text check in ('starter','custom'), sort_order, created_at)`; starter list stored as a constant in `packages/core/checklist/starter.ts` (not a table — simpler to change); `createEvent` inserts the starter tasks in the same transaction. Backfill migration for events created before this slice.
- **API endpoints:** Actions `addTask`, `updateTask`, `toggleTask`, `deleteTask`. Core: `buildStarterTasks(eventDate)`.
- **Pages:** `/app/events/[eventId]/checklist`.
- **Components:** `ChecklistItem` (inline edit), `AddTaskInput`, `ProgressBar`, `TaskFilters`.
- **Dependencies:** Slice 2.
- **Acceptance criteria:**
  - [ ] A birthday event also starts with the wedding checklist (CHK-1), and "wedding dress" can be renamed to "birthday girl dress".
  - [ ] Due dates are computed from the event date; past-due items show a subtle warning.
  - [ ] Checking off survives reload; progress bar updates.

### Slice 11 — Calendar (month + week) and dashboard upcoming lists (CAL-1…CAL-3, DSH-4)
**Goal:** User sees appointments and task deadlines on a month view and weekly planner, and the dashboard lists what's next.

- **Features:** create/edit/delete appointment (title, kind, start date/time, notes, optional saved vendor); kinds: appointment, vendor_consultation, dress_fitting, hair_appointment, deadline; month view (script month title, hairline grid, highlighted today); week view (7 boxes); tasks with due dates appear as read-only chips that link to the checklist; dashboard "Upcoming" (next 5 tasks + next 5 appointments).
- **Database changes:** enum `appointment_kind`; `appointments (id, event_id, title, kind, starts_at timestamptz, notes, saved_vendor_id null, created_at)`; index `(event_id, starts_at)`.
- **API endpoints:** Actions `createAppointment`, `updateAppointment`, `deleteAppointment`. Core: `buildMonthGrid(year, month)`, `buildWeek(date)`, `mergeCalendarItems(tasks, appointments)`, `upcomingItems(now, …)`.
- **Pages:** `/app/events/[eventId]/calendar?view=month|week&date=YYYY-MM-DD`.
- **Components:** `MonthView`, `WeekView`, `CalendarItemChip`, `AppointmentFormDialog`, `ViewToggle`, `UpcomingList`.
- **Dependencies:** Slices 8 (optional vendor link) and 10 (tasks).
- **Acceptance criteria:**
  - [ ] Appointments and task due dates appear on the right day in both views.
  - [ ] Navigating months/weeks updates the URL.
  - [ ] On phones the month view shows dots + a day list underneath; tap targets ≥44px.
  - [ ] Dashboard shows upcoming tasks and appointments sorted by date.
  - [ ] Vitest: month grid for months starting on any weekday, DST changes.

### Slice 12 — In-app notifications (NTF-1, RSVP trigger)
**Goal:** A bell shows notifications the user can open and mark as read. First live trigger: RSVP status change.

- **Features:** bell with unread count; dropdown/page list; mark one / mark all as read; clicking opens the linked page. Core `notify(userId, type, payload)` helper used by all future triggers.
- **Database changes:** enum `notification_type` (vendor_reply, appointment_upcoming, rsvp_update, budget_reminder, task_due, event_reminder); `notifications (id, user_id, event_id null, type, title, body, link, read_at null, channels_sent text[] default '{}', created_at)`; RLS owner-only (select/update `read_at`); inserts by server only.
- **API endpoints:** Actions `markNotificationRead`, `markAllRead`. Core: `notify()` (server-only, service role).
- **Pages:** `/app/notifications`.
- **Components:** `NotificationBell`, `NotificationList`, `NotificationItem`.
- **Dependencies:** Slice 4.
- **Acceptance criteria:**
  - [ ] Changing a guest's RSVP creates one "RSVP update" notification.
  - [ ] Unread count updates after marking read; read state persists.
  - [ ] Users never see each other's notifications (RLS test).

> **Milestone check (PRD release step 2):** all eight steps of Flow A work on a phone browser and laptop. Run a full Playwright Flow A test before starting Phase 3.

---

## Phase 3 — Premium on the web

### Slice 13 — Stripe subscription, trial, and Premium gating (PRM-1, PRM-2, INT-1…INT-4, EVT-1, TEC-3)
**Goal:** User can start a 3-day free trial, pay $8.99/month or $89/year, and immediately create unlimited events; cancelling keeps data but leaves only one event editable.

- **Features:** pricing page; Stripe Checkout (both prices, `trial_period_days: 3`); Customer Portal link in settings; webhook sync; `requirePremium()` guard; `canCreateEvent` now allows unlimited for Premium; event switcher; read-only mode for extra events after cancellation (user picks which event stays editable); upgrade prompt component reused for every premium feature (PRM-1).
- **Database changes:** `subscriptions (user_id PK, source text check in ('stripe','revenuecat'), stripe_customer_id, stripe_subscription_id, revenuecat_app_user_id null, status text, price_interval text, trial_end, current_period_end, updated_at)`; RLS: user selects own row, no client writes; `profiles.active_event_id` (the editable event when not Premium); `webhook_events (id text PK, source, received_at, processed_at, error)` for idempotency and visible failures (NFR-7); helper SQL function `is_event_editable(event_id)` used by write policies on event child tables.
- **API endpoints:** Actions `startCheckout(interval)`, `openCustomerPortal`, `setActiveEvent`; Route `POST /api/webhooks/stripe` (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed; signature verified). Core: `isPremium(subscription, now)`, `requirePremium(userId)`, `canCreateEvent`, `canEditEvent`.
- **Pages:** `/pricing`, `/app/settings/billing`, `/app/upgrade` (or dialog).
- **Components:** `PricingCards` (monthly/yearly toggle), `UpgradePrompt` (explains the feature + CTA), `PremiumBadge`, `EventSwitcher`, `ReadOnlyBanner`.
- **Dependencies:** Slice 2 (and all free slices for read-only enforcement).
- **Acceptance criteria:**
  - [ ] Test-mode checkout grants Premium within seconds of the webhook; trial end date is shown.
  - [ ] Premium user can create a second and third event.
  - [ ] Cancel in the portal → access stays until period end → afterwards only the active event is editable; others show the read-only banner and writes are refused by RLS, not just hidden buttons.
  - [ ] Replaying the same webhook twice does not double-apply (idempotency).
  - [ ] Failed webhook processing is recorded in `webhook_events.error`.
  - [ ] Vitest: `isPremium` for trialing, active, past_due, canceled-before/after period end.
  - [ ] Playwright: free user opening a premium page sees `UpgradePrompt` (TEC-9 gating test).

### Slice 14 — Inquiry builder with inspiration photos (OUT-1…OUT-3)
**Goal:** Premium user selects several saved vendors in one category and builds an inquiry (details, notes, questions, photos), saved as a draft.

- **Features:** "Contact vendors" button on My vendors (multi-select within one category); inquiry form prefilled with event details; free-text notes; list of questions (add/remove); photo/palette upload (max 10 images, 5 MB each, jpg/png/webp/heic→jpg); draft autosave; list of inquiries.
- **Database changes:** enum `inquiry_status` (draft, approved, sending, sent); `inquiries (id, event_id, category vendor_category, event_details jsonb, notes, questions text[], draft_email_subject, draft_email_body, approved_email_subject, approved_email_body, status default 'draft', sent_at null, created_at)`; `inquiry_attachments (id, inquiry_id, storage_path, kind check in ('photo','palette'), created_at)`; `inquiry_vendors (id, inquiry_id, saved_vendor_id, reply_token text unique, send_status text default 'pending', sent_at, error)`; private Storage bucket `inquiry-attachments` with path `{user_id}/{inquiry_id}/{file}` and storage RLS by first path segment.
- **API endpoints:** Actions `createInquiry(eventId, savedVendorIds)`, `updateInquiryDraft`, `addAttachment` (signed upload URL), `removeAttachment`, `deleteDraftInquiry`; all call `requirePremium`.
- **Pages:** `/app/events/[eventId]/inquiries`, `/app/events/[eventId]/inquiries/[inquiryId]` (builder, step 1).
- **Components:** `VendorMultiSelect`, `InquiryForm`, `QuestionsEditor`, `PhotoUploader` (drag/drop + mobile camera roll), `AttachmentGrid` (arch-shaped swatch style from the mood board reference), `StepIndicator` (Details → Draft → Review → Sent).
- **Dependencies:** Slices 8 and 13.
- **Acceptance criteria:**
  - [ ] Selecting five bakers creates one inquiry with five `inquiry_vendors` rows.
  - [ ] Vendors from different categories cannot be mixed in one inquiry.
  - [ ] Photos upload, show thumbnails via signed URLs, and are unreadable by another user.
  - [ ] Leaving and returning restores the draft.
  - [ ] Free user sees `UpgradePrompt` instead of the builder.

### Slice 15 — AI-drafted inquiry email, review, edit, approve (OUT-4, OUT-5, INT-5, INT-7, NFR-6, TEC-5)
**Goal:** AI writes one professional email from the inquiry; the user edits and approves it. Nothing is sent yet.

- **Features:** "Write my email" button; generated subject + body shown in an editor; "Regenerate"; manual edits; "Approve" locks the text (status → approved); per-user daily AI limit with a friendly message when reached.
- **Database changes:** `ai_usage (user_id, day date, kind text, count int, primary key(user_id, day, kind))`.
- **API endpoints:** Action `draftInquiryEmail(inquiryId)` (server-only OpenAI call; model from `OPENAI_MODEL` env var; `max_output_tokens` capped; prompt includes event details, notes, questions, attachment descriptions, user's display name; returns JSON `{subject, body}` validated with Zod); Action `approveInquiry(inquiryId, subject, body)`. Core: `buildInquiryPrompt(input)` (pure, unit-testable), `checkAndIncrementAiUsage`. Route `POST /api/inquiries/[id]/draft` mirrors the action for mobile later.
- **Pages:** builder step 2 and 3 on `/app/events/[eventId]/inquiries/[inquiryId]`.
- **Components:** `EmailDraftEditor`, `RegenerateButton`, `ApproveDialog` ("This will be sent to 5 vendors: …"), `AiLimitNotice`.
- **Dependencies:** Slice 14.
- **Acceptance criteria:**
  - [ ] Draft mentions the event type and date and asks the user's questions (snapshot-tested prompt builder).
  - [ ] User edits survive reload; approve stores the edited text, not the AI text.
  - [ ] No route sends email at this point; approved status is visible.
  - [ ] Exceeding the daily limit returns a clear message; OpenAI key never reaches the browser.
  - [ ] OpenAI errors show "Try again" and do not lose the user's input.

### Slice 16 — Send inquiries to all selected vendors (OUT-6, INT-8, NFR-5, TEC-4)
**Goal:** On approval, one email goes to each vendor from your domain with a unique reply address; statuses become Contacted; the sent message is visible in the app.

- **Features:** "Send to 5 vendors" after approval; per-vendor send via Postmark (sender name = user's display name, `From: "{User name} via Kim's Planner" <outreach@yourdomain>`, `Reply-To: reply+{token}@inbound.yourdomain`); photos as attachments (fallback to signed links if total > 10 MB); per-vendor send status with retry for failures; rate limit (e.g. max 25 vendor emails/user/day and 5 inquiries/hour); status → Contacted per vendor that succeeded; outbound `messages` row per vendor.
- **Database changes:** enum `message_direction` (outbound, inbound); `messages (id, inquiry_vendor_id, direction, from_email, to_email, subject, body_text, body_html null, provider_message_id, sent_or_received_at, created_at)`; RLS via inquiry → event; generate `reply_token` (random 24-char, URL-safe) on `inquiry_vendors` insert.
- **API endpoints:** Action `sendInquiry(inquiryId)` (requirePremium, checks status = approved, rate limit, loops vendors, idempotent per `inquiry_vendor`), Action `retryVendorSend(inquiryVendorId)`. Core: `buildOutboundEmail(...)`, `rateLimit(userId, key, limit, window)`. Infrastructure: Postmark server + sender domain with SPF/DKIM, inbound domain MX.
- **Pages:** `/app/events/[eventId]/inquiries/[inquiryId]` "Sent" state; `/app/events/[eventId]/hub` (first version: list of conversations showing the sent email).
- **Components:** `SendProgressList` (per vendor: sent / failed + retry), `ConversationList`, `MessageBubble`.
- **Dependencies:** Slice 15.
- **Acceptance criteria:**
  - [ ] Sending to five test vendor addresses delivers five separate emails (no vendor sees the others).
  - [ ] Each email's Reply-To contains a different token.
  - [ ] Each successfully sent vendor shows Contacted; a failed send shows "Failed — Retry" and is logged (NFR-7).
  - [ ] Clicking Send twice does not send twice.
  - [ ] Rate limit blocks excess sends with a clear message.

### Slice 17 — Capture vendor replies (HUB-1, HUB-2, INT-9, new-reply notification)
**Goal:** When a vendor replies from Gmail/Outlook/Apple Mail, the reply appears in the app, status becomes Replied, and the user is notified in-app and by email.

- **Features:** Postmark inbound webhook; match by `MailboxHash` → `reply_token`; strip quoted history (store full raw too); save attachments from vendors to Storage; status → Replied (only if not already Confirmed); `notify()` vendor_reply in-app + notification email ("Sweet Layers Bakery replied to your inquiry"); unknown tokens logged, not dropped.
- **Database changes:** `message_attachments (id, message_id, storage_path, filename, content_type)`; `messages.body_raw`; `inbound_failures (id, received_at, payload jsonb, reason)`.
- **API endpoints:** Route `POST /api/webhooks/postmark-inbound` (basic-auth protected URL, service role, idempotent on Postmark MessageID). Core: `extractReplyText(text)`, `matchInbound(mailboxHash)`, `sendNotificationEmail(...)`.
- **Pages:** hub (now shows inbound messages), notifications.
- **Components:** `MessageBubble` (inbound variant), `AttachmentList`, unread dot on `ConversationList`.
- **Dependencies:** Slices 12 and 16.
- **Acceptance criteria:**
  - [ ] Replying from a real Gmail account to a sent inquiry shows the reply in the hub within a minute.
  - [ ] Vendor status changes to Replied automatically.
  - [ ] User gets one in-app notification and one email per reply.
  - [ ] A second reply from the same vendor lands in the same conversation.
  - [ ] Webhook with an unknown token returns 200 and writes `inbound_failures`.
  - [ ] Vitest: quote stripping on Gmail, Outlook and Apple Mail sample emails.

### Slice 18 — Vendor Communication Hub, full view (HUB-3)
**Goal:** One place to read every vendor conversation across all inquiries, with full history per vendor.

- **Features:** two-pane layout on desktop (conversation list / thread), stacked on mobile; filter by category and status; unread vs read per conversation; vendor header with contact details and status; link back to inquiry.
- **Database changes:** `inquiry_vendors.last_read_at`; view `conversation_summaries` (last message, unread count) with `security_invoker = true`.
- **API endpoints:** Action `markConversationRead`.
- **Pages:** `/app/events/[eventId]/hub`, `/app/events/[eventId]/hub/[inquiryVendorId]`.
- **Components:** `HubLayout`, `ConversationList` (final), `ThreadView`, `VendorHeader`, `HubFilters`.
- **Dependencies:** Slice 17.
- **Acceptance criteria:**
  - [ ] All conversations from all inquiries in the event appear, newest activity first.
  - [ ] Opening a conversation clears its unread state.
  - [ ] Thread shows outbound and inbound messages in order with attachments.
  - [ ] Free user (or lapsed Premium) sees `UpgradePrompt`; their stored messages are not deleted.

### Slice 18b — Reply to vendors from inside the hub
**Goal:** The user continues a vendor conversation without leaving the app; the vendor's next reply lands in the same thread.

- **Features:** reply box under each thread; optional photo attachments (reuse `PhotoUploader`); optional "Help me write this" AI draft (reuses Slice 15 limits; text always shown before sending); sent from the same outreach address with the same `reply+{token}` Reply-To, plus `In-Reply-To`/`References` headers from the vendor's last message so it threads in the vendor's mail app; same per-user rate limit as Slice 16; status is not changed by a follow-up (stays Replied/Confirmed).
- **Database changes:** `messages.in_reply_to_message_id null`; `messages.email_message_id` (RFC Message-ID, stored for inbound and outbound) for threading headers.
- **API endpoints:** Action `sendHubReply(inquiryVendorId, body, attachmentIds)` (requirePremium, rate limit, idempotency key per submit); Action `draftHubReply(inquiryVendorId, instructions)`; Route `POST /api/hub/[inquiryVendorId]/reply` for mobile.
- **Pages:** `/app/events/[eventId]/hub/[inquiryVendorId]`.
- **Components:** `ReplyComposer`, `SendingState` (sending / failed + retry on the bubble).
- **Dependencies:** Slice 18.
- **Acceptance criteria:**
  - [ ] Reply sent from the hub arrives in the vendor's Gmail in the same thread as the original inquiry.
  - [ ] The vendor's answer to that reply appears in the same hub conversation.
  - [ ] A failed send shows on the message with Retry and is logged; double-click sends once.
  - [ ] Free / lapsed users can read history but see `UpgradePrompt` instead of the composer.

### Slice 19 — Vendor comparison (CMP-1)
**Goal:** User compares replying vendors side by side on price, availability, services, history and notes, typing the values in themselves.

- **Features:** comparison table per category (columns = vendors on desktop, cards on mobile); editable fields price, availability, services, notes beside each vendor; communication history column = message count + last reply date + link to thread; also editable from the thread side panel.
- **Database changes:** `comparison_notes (saved_vendor_id PK, price text, availability text, services text, notes text, updated_at)`; RLS via saved vendor → event.
- **API endpoints:** Action `upsertComparisonNotes`.
- **Pages:** `/app/events/[eventId]/compare?category=bakers`.
- **Components:** `ComparisonTable`, `ComparisonCell` (inline edit, autosave), `ComparisonPanel` (in thread view).
- **Dependencies:** Slice 18.
- **Acceptance criteria:**
  - [ ] Values typed in the hub panel appear in the comparison table and vice versa.
  - [ ] Nothing is auto-extracted from emails.
  - [ ] Table is readable at 375px.

### Slice 20 — Confirm Vendor from the hub (CNF-1…CNF-4)
**Goal:** One click on **Confirm Vendor** marks the winner Confirmed, saves their details, keeps every message, and triggers the budget price prompt.

- **Features:** Confirm Vendor button in thread header and comparison table; confirmation dialog; reuses Slice 9's `confirm_saved_vendor` RPC (status, snapshot, budget flag) — messages untouched; confirmed vendor shown on dashboard ("Your vendors") and in event settings.
- **Database changes:** none new (snapshot uses `saved_vendors.confirmed_snapshot`; optional: include comparison price as a hint, still not auto-filled).
- **API endpoints:** reuse Action `confirmVendor`; Route `POST /api/saved-vendors/[id]/confirm` for mobile.
- **Pages:** hub, compare, dashboard (confirmed vendors card).
- **Components:** `ConfirmVendorButton`, `ConfirmVendorDialog`, `ConfirmedVendorsCard`.
- **Dependencies:** Slices 9 and 19.
- **Acceptance criteria:**
  - [ ] Confirming from the hub: status Confirmed, budget line highlighted with include-price message, vendor details saved, thread still fully visible.
  - [ ] Playwright Flow B with mocked Postmark/OpenAI: one inquiry → five vendors → simulated replies (POST to inbound webhook) → compare → confirm.

> **Milestone check (PRD release step 3):** a test user sends one real inquiry to five test vendor inboxes, receives replies, and confirms one.

---

## Phase 4 — AI planning chat and reminders

### Slice 21a — AI planning chat (CHT-1, CHT-2, INT-6)
**Goal:** Premium users chat with an assistant that knows their event.

- **Features:** chat page with streaming answers; system prompt with event type, date, city, guest counts, budget totals, confirmed vendors, open tasks; suggestion chips ("Make me a 12-month timeline", "Which vendors do I still need?"); history per event; daily message limit; clear history.
- **Database changes:** `ai_chat_messages (id, user_id, event_id, role check in ('user','assistant'), content, created_at)`; reuse `ai_usage`.
- **API endpoints:** Route `POST /api/chat` (streaming, requirePremium, rate limit; used by web and mobile). Core: `buildEventContext(eventId)`, `buildChatMessages(history, context)` (last N messages only to cap cost).
- **Pages:** `/app/events/[eventId]/assistant`.
- **Components:** `ChatThread`, `ChatInput`, `SuggestionChips`, `MarkdownMessage`.
- **Dependencies:** Slice 13 (and data from free slices for context).
- **Acceptance criteria:**
  - [ ] Asking "How many days until my event?" gives the correct number (context works).
  - [ ] Answers stream; history reloads; free users see `UpgradePrompt`.
  - [ ] Limit reached → friendly message, no OpenAI call made.

### Slice 21b — Scheduled reminders, email notifications, notification settings (NTF-2, NTF-3, TEC-6)
**Goal:** Every trigger in PRD §8 reaches the user in-app and by email, and the user can switch channels on or off.

- **Features:** daily (hourly for appointments) cron; default timings: appointment 24 h before, task on due date morning + 3 days before, event reminder 30/7/1 days before, budget reminder weekly if any `needs_price` line or actual > estimated (assumption — see Open questions); dedupe so each reminder fires once; notification settings page with toggles per channel (push toggle shown now, active in Slice 25); email footer with settings link.
- **Database changes:** `notification_preferences (user_id PK, in_app bool, email bool, push bool, defaults true)`; `reminder_log (key text PK, sent_at)` for dedupe (key e.g. `task:{id}:due`).
- **API endpoints:** Route `GET /api/cron/reminders` (protected by `CRON_SECRET`, configured in `vercel.json`); Action `updateNotificationPreferences`. Core: `findDueReminders(now, data)` (pure, heavily unit-tested), `notify()` now respects preferences and sends email.
- **Pages:** `/app/settings/notifications`.
- **Components:** `ChannelToggles`, `EmailTemplate` (React Email or simple HTML, themed).
- **Dependencies:** Slices 11, 12, 17.
- **Acceptance criteria:**
  - [ ] Running the cron twice in a row sends each reminder once.
  - [ ] Turning email off stops emails but in-app still appears.
  - [ ] Vitest: `findDueReminders` across time zones and edge dates.
  - [ ] All six triggers verified in-app and by email on staging (PRD release step 4).

---

## Phase 5 — iPhone and Android apps (Expo)

### Slice 22 — Mobile app shell and sign-in
**Goal:** The Expo app installs on a phone (via Expo Go / internal build), the user signs in with the same account and sees their dashboard.

- **Features:** `apps/mobile` with Expo Router, TypeScript, shared `packages/core`; Supabase client with secure storage; login/signup/logout; dashboard (countdown, guest/RSVP, budget, upcoming) using the same Core functions; theme tokens exported from `packages/core/theme` and used by both apps.
- **Database changes:** none.
- **API endpoints:** none new (direct Supabase with RLS).
- **Screens:** Login, Sign up, Dashboard, Event switcher.
- **Components:** RN equivalents: `Button`, `Card`, `SummaryCard`, `CountdownCard`, bottom tab navigator (Dashboard, Guests, Budget, Vendors, More).
- **Dependencies:** Slice 21b (web complete); Apple Developer + Google Play accounts; EAS.
- **Acceptance criteria:**
  - [ ] Same account sees the same event data on web and phone.
  - [ ] Session persists across app restarts; logout clears it.
  - [ ] CI type-checks the mobile app.

### Slice 23 — Mobile free features
**Goal:** Flow A works completely on the phone.

- **Features:** guests, budget (with needs-price highlight), vendor directory + favorites + status + confirm, checklist, calendar (month + week), notifications list, event create/edit (free limit enforced by RLS policy + Route), settings.
- **Database changes:** move the one-event limit into an RLS `insert` policy / trigger on `events` (so the direct-Supabase mobile path cannot bypass it).
- **API endpoints:** reuse Route `POST /api/saved-vendors/[id]/confirm` (or call RPC directly — it's security invoker).
- **Screens:** Guests, Guest form, Budget, Expense form, Directory, Vendor profile, My vendors, Checklist, Calendar, Appointment form, Notifications, Settings.
- **Components:** mobile versions of the web components, sharing Zod schemas and Core logic.
- **Dependencies:** Slice 22.
- **Acceptance criteria:**
  - [ ] Flow A steps 1–8 completed on an iPhone and an Android device.
  - [ ] Changes on phone appear on web after refresh and vice versa.
  - [ ] Second free event is blocked on mobile too.

### Slice 24 — Mobile Premium features and in-app purchase (RevenueCat)
**Goal:** Flow B works on the phone, and users can subscribe through the App Store / Google Play.

- **Features:** RevenueCat paywall (monthly/yearly, 3-day trial); RevenueCat webhook updates `subscriptions` (source = revenuecat); premium status shared with web; inquiry builder with camera-roll upload; AI draft/review/approve/send; hub, comparison, Confirm Vendor; planning chat.
- **Database changes:** none (uses `subscriptions.source`, `revenuecat_app_user_id` = Supabase user id).
- **API endpoints:** Route `POST /api/webhooks/revenuecat`; mobile-callable Routes with `Authorization: Bearer <supabase jwt>`: `POST /api/inquiries/[id]/draft`, `POST /api/inquiries/[id]/approve`, `POST /api/inquiries/[id]/send`, `POST /api/chat`, `POST /api/saved-vendors/[id]/confirm`. All call the same Core functions as the Server Actions.
- **Screens:** Paywall, Inquiry builder (steps), Hub list, Thread (with reply composer — Route from Slice 18b), Compare, Assistant.
- **Components:** `Paywall`, mobile `PhotoUploader`, `ThreadView`, `ChatThread`.
- **Dependencies:** Slices 23 and 20, 21a.
- **Acceptance criteria:**
  - [ ] Sandbox purchase on iOS and Android grants Premium on phone **and** web.
  - [ ] A web (Stripe) subscriber is Premium on the phone without buying again.
  - [ ] Flow B completed on a phone.

### Slice 25 — Push notifications (mobile push + PWA web push)
**Goal:** All six triggers also reach the user as push notifications on phones and on the installed web app.

- **Features:** Expo push token registration; PWA manifest + service worker + web push (VAPID) on the website; `notify()` sends push when enabled; tapping a push opens the linked screen.
- **Database changes:** `push_subscriptions (id, user_id, kind check in ('expo','webpush'), token_or_endpoint text unique, keys jsonb null, created_at, last_used_at)`; delete on invalid-token responses.
- **API endpoints:** Actions/Routes `registerPushDevice`, `unregisterPushDevice`.
- **Screens/Pages:** permission prompt screen, notification settings (push toggle active).
- **Components:** `PushPermissionPrompt`, service worker `sw.js`.
- **Dependencies:** Slices 21b, 22.
- **Acceptance criteria:**
  - [ ] A vendor reply produces a push on a physical iPhone and Android phone and on an installed PWA.
  - [ ] Turning push off stops pushes only.
  - [ ] Dead tokens are cleaned up.

---

## Phase 6 — Launch preparation

### Slice 26 — Public site, legal, monitoring, beta, store submission
**Goal:** The product is ready for real users and launches on web, App Store and Google Play together.

- **Features:** marketing landing page + pricing; terms, privacy policy, email-sending and directory-listing review by a lawyer (NFR-4); "delete my account and data" in settings; vendor profile removal request link; error monitoring (Sentry on web + mobile); usage limits reviewed; closed beta with real planners and couples; App Store / Play listings and review.
- **Database changes:** `delete_my_account()` function (cascades user data, removes storage files via server job).
- **API endpoints:** Action `deleteAccount`; Route `POST /api/vendor-removal-request` (simple form → email to support).
- **Pages:** `/`, `/pricing`, `/terms`, `/privacy`, `/vendors/remove-listing`, `/app/settings/account`.
- **Components:** `MarketingHero`, `FeatureSection`, `LegalPage`, `DeleteAccountDialog`.
- **Dependencies:** all previous slices.
- **Acceptance criteria:**
  - [ ] Deleting an account removes all of that user's rows and files (verified by query).
  - [ ] Errors from web and mobile appear in monitoring.
  - [ ] Both apps approved in the stores; web, iOS and Android go live the same day.

---

## Slice dependency overview

```
0 → 1 → 2 → 3 → 4 → 12
            ├→ 5 ─────────┐
1 → 6 → 7   │             ├→ 9
      └→ 8 ─┴─────────────┘
2 → 10 → 11 (needs 8, 10)
2 → 13 → 14 → 15 → 16 → 17 (needs 12) → 18 → 18b → 19 → 20 (needs 9)
13 → 21a ;  11 + 12 + 17 → 21b
21b → 22 → 23 → 24 (needs 20, 21a) ;  21b + 22 → 25 → 26
```
Slices 5, 6–7 and 10 can be done in any order after their dependencies; everything else is sequential.

## Decisions confirmed with the founder (Nov 20, 2026 — fills the missing PRD §15)

1. **Trial:** 3-day free trial on web (Stripe) and in the apps (App Store / Google Play via RevenueCat).
2. **Budget reminder:** weekly, when a confirmed vendor's budget line still needs a price or actual spending exceeds the estimate (Slice 21b).
3. **Replying from the hub:** included as Slice 18b.
4. **Free users:** set vendor statuses by hand; automatic Contacted/Replied is Premium only.
5. **Vendor → budget category mapping:** fixed table in Core (bakers → Cake, florists → Flowers, photographers → Photography, caterers → Catering, venues → Venue, djs → Entertainment, makeup artists / hairstylists → Beauty, decorators → Decor, transportation → Transportation).
6. **Currency:** CAD and USD. Default set in account settings, chosen per event, amounts stored as `numeric(12,2)`, no conversion between currencies (Slices 2 and 5).

**Still open (doesn't block early slices):** the subscription price is $8.99/$89 USD in the PRD. Decide before Slice 13 whether Canadian customers also get CAD Stripe prices (one extra Stripe price per interval; app stores localise prices on their own).

## Verification (how to test the plan as it's built)

- Each slice: `pnpm lint && pnpm typecheck && pnpm test` (Vitest) and `pnpm e2e` (Playwright) locally against `supabase start`; CI runs the same on every PR.
- RLS: a reusable Vitest helper that signs in two users and asserts User B cannot read/write User A's rows — added to every slice that creates a table.
- External services: Stripe CLI (`stripe listen`) for webhooks, Postmark sandbox server + real test inboxes for outreach, OpenAI mocked in CI and real on preview.
- Milestones: Flow A Playwright test after Slice 12, Flow B test after Slice 20, manual Flow A + B on phones after Slice 24.
