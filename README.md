# Kim's Planner

Wedding & event planning: guests, budget, vendors and deadlines in one place.
The build follows the vertical slices in [docs/implementation-plan.md](docs/implementation-plan.md).

## Repository layout

```
apps/web/        Next.js 15 website + API Routes
apps/mobile/     Expo app (added in Slice 22)
packages/core/   Shared TypeScript: brand, design tokens, business logic
supabase/        Database migrations and seed data
.github/         CI (lint, type check, unit tests, build, Playwright, migrations)
```

## Getting started

Requires Node 22.12+ (CI uses Node 24, see `.nvmrc`).

```bash
npm install
npm run dev            # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint (blocks raw hex colours outside the theme) |
| `npm run typecheck` | TypeScript in every workspace |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build of the website |
| `npm run e2e` | Playwright tests, desktop and phone, with an axe accessibility check |
| `npm run test:integration -w @kims-planner/web` | Row Level Security tests (needs `supabase start`; runs in CI) |
| `npm run db:new <name>` | New Supabase migration |
| `npm run db:reset` | Rebuild the local database from migrations (needs Docker) |

## Design tokens

Colours come from PRD section 9 and live in two places that a test keeps in sync:
`packages/core/src/theme.ts` (for code and the mobile app) and `apps/web/app/globals.css`
(Tailwind classes such as `bg-chablis`, `text-plum`, `border-rosy`, `bg-sage`).
Fonts: Cormorant Garamond (headlines, `font-serif`), DM Sans (interface, `font-sans`),
Pinyon Script (brand moments only, `font-script`).

## One-time hosting setup

1. **GitHub:** create a repository and push `main`. CI runs on every pull request.
2. **Vercel:** import the repository and set **Root Directory** to `apps/web`.
   Vercel then deploys `main` to production and every pull request to a preview URL.
3. **Supabase:** create a project, then `npx supabase link --project-ref <ref>`.
   Copy `.env.example` to `apps/web/.env.local` and add the URL and anon key
   (needed from Slice 1).
4. **Supabase Auth settings** (Dashboard → Authentication):
   - URL Configuration → Site URL: `https://kims-planner-kimberly21.vercel.app`
   - Redirect URLs: `https://kims-planner-kimberly21.vercel.app/**`,
     `https://*-kimberly21.vercel.app/**` (previews) and `http://localhost:3000/**`
   - Sign In / Providers → Email: minimum password length **8** (matches the app).
5. **Apply migrations to the hosted database:** `npx supabase db push --remote --dry-run`
   to preview, then `npx supabase db push --remote`. (Supabase CLI 3 targets the local
   Docker database unless you pass `--remote`.)

## Troubleshooting

- `EINVAL: invalid argument, readlink ... .next` on Windows: OneDrive is syncing the
  build folder. Delete `apps/web/.next` and start again.
