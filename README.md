# Bala Finance — Web (frontend-only)

A frontend-only conversion of the original **bala-finance** app (React/Vite/TS frontend +
Java Spring Boot/MySQL/Kafka backend) into a single React + Vite + TypeScript application with
**no backend at all**. All data lives in the browser's IndexedDB. Deployable to Vercel's free
static-hosting tier.

> **Read this before you use it for real records.** See "Security model & trade-offs" below —
> this is a genuinely different app from the original in terms of data safety, not just a
> re-skin. Decide it's the right trade-off for your use case before relying on it.

## 1. What changed, and why

The original project's `frontend/` was **already** React + Vite + TypeScript — nothing there
needed a technology conversion. The actual backend, `backend/`, was a full Spring Boot
application (91 source files): MySQL + Flyway migrations, JWT auth, Kafka producers/consumers
for audit logging, Apache POI for Excel import, iText for PDF reports.

Converting to "frontend-only" means that backend is gone. Its logic has been reimplemented as
plain TypeScript running in the browser, and every read/write of `MySQL` has become a read/write
of `IndexedDB`. Concretely:

| Original (Spring Boot) | This version |
|---|---|
| MySQL tables (`financial_records`, `persons`, `payments`, `interest_records`, `renewals`, `users`) | IndexedDB object stores, same shape (`src/db/database.ts`) |
| `*ServiceImpl.java` business logic (validation, calculations, renewal chains, dashboard aggregates) | `src/services/*.ts` — same logic, same edge cases, ported line-by-line |
| JWT auth (`AuthServiceImpl`, `JwtTokenProvider`) against a `users` table seeded by Flyway (`admin` / `ChangeMe123!`) | Local session (`src/services/authService.ts`) against the same seeded `admin` / `ChangeMe123!` account, now stored in IndexedDB, hashed with PBKDF2 in the browser |
| Apache POI Excel parsing (`ExcelImportServiceImpl`) | SheetJS (`xlsx` package) — same column names (incl. the `"Intrest Amt"` / `"Principle Amt"` spellings), same date-format list, same validation states (`VALID`/`FLAGGED`/`INVALID`) |
| iText PDF / POI XLSX report generation (`ReportServiceImpl`) | `jsPDF` + `jspdf-autotable` for PDF, `xlsx` for `.xlsx` — same six report types, same headers/columns |
| Kafka audit log / notification consumers | **Removed.** There's no second system to notify, and no server to keep an audit trail out of the user's own reach. Not reimplemented — see "What was intentionally dropped" below. |

**Every page, component, and style file is byte-for-byte identical to the original** —
`Dashboard.tsx`, `FinancialRecords.tsx`, `Interest.tsx`, `Renewals.tsx`, `ExcelImport.tsx`,
`Reports.tsx`, `Login.tsx`, all of `components/`, `tailwind.config.js`, `index.css`. Only the
`src/api/*.ts` layer changed — from calling `axios` against `/api/...` to calling the new
`src/services/*.ts` layer directly — and `AuthContext.tsx`, which no longer deals with JWTs.
Because the `api/*.ts` files kept the exact same exported function names and types, no page
component needed to change at all. This was deliberate: it's the single biggest thing keeping
this a faithful conversion rather than a rewrite.

One small **addition**: `Settings.tsx` now has a "Change password" section. The original had no
such screen (password changes were presumably a DB operation), but a hardcoded default password
is meaningless without a way to change it once there's no backend admin to do it for you, so this
was added.

### What was intentionally dropped

- **Kafka audit log / notifications.** These fed a second system (Kafka topics/consumers) that
  doesn't exist here. There's no meaningful "audit trail separate from the data" in a
  single-browser app — the data *is* the record.
- **Multi-user support / RBAC beyond a single local account.** The original had a `users` table
  with roles; this version seeds exactly one `admin` account. Nothing in the frontend ever
  created additional users, so nothing is lost that was actually reachable from the UI.
- **The `Payment` entity's write path.** The original frontend never had a screen to create
  payments (there's no `Payments.tsx` — check `App.tsx`'s routes, there never was one). The data
  model, dashboard "Total paid" sum, and the Payment report still exist and work correctly; they
  will simply show/export nothing until payments exist, exactly like the original app before any
  payment was ever recorded through it.

## 2. Security model & trade-offs (read this)

The original app had real server-side security: passwords hashed with BCrypt on a server you
don't control from the browser, JWTs issued and verified server-side, a MySQL database behind
your backend's network boundary.

This version has **none of that**, because there is no server:

- **Single browser, single device.** Data in IndexedDB is local to one browser profile on one
  machine. It does not sync. Clearing browser data / "Clear site data" / an incognito window /
  a different browser all mean a different (empty) dataset.
- **"Login" is a local gate, not real security.** The password is hashed (PBKDF2-SHA256, 150k
  iterations, random salt — see `src/lib/password.ts`) so it isn't stored in plaintext, but
  anyone with access to the browser's dev tools has access to everything the login screen was
  gatekeeping. Treat the login screen as a "don't leave this open on a shared computer"
  convenience, not a security boundary.
- **No backup, no multi-device access, no audit trail.** If the browser's storage is cleared,
  the data is gone. There is no server copy.
- **Default credentials are public.** `admin` / `ChangeMe123!` is in this README and in the
  source. **Change it immediately** via Settings → Change password after your first login.

If you need real multi-user access, backups, or actual security guarantees, you need a backend
and a database — i.e., a different set of trade-offs than "frontend-only" implies. This version
is a reasonable fit for a single person's personal ledger, used on one device, where convenience
and zero hosting cost matter more than the guarantees a server provides.

## 3. Project structure

```
bala-finance-web/
├── index.html
├── package.json
├── vite.config.ts
├── vercel.json                  # Vercel build + SPA rewrite config
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json / tsconfig.node.json
└── src/
    ├── main.tsx                 # seeds the default admin account, then renders <App/>
    ├── App.tsx                  # unchanged — route table
    ├── db/
    │   └── database.ts          # IndexedDB wrapper + schema + first-run seeding
    ├── lib/
    │   ├── decimal.ts           # money rounding (mirrors BigDecimal.setScale(2, HALF_UP))
    │   └── password.ts          # local PBKDF2 password hashing
    ├── services/                # the ported "backend" — one file per original Java service
    │   ├── types.ts             # internal row shapes (mirrors the JPA entities)
    │   ├── authService.ts
    │   ├── personService.ts
    │   ├── financialRecordService.ts
    │   ├── interestService.ts
    │   ├── dashboardService.ts
    │   ├── excelImportService.ts
    │   └── reportService.ts
    ├── api/                     # same file names/exports as the original — now call services/
    │   ├── records.ts / persons.ts / interest.ts / renewals.ts
    │   └── dashboard.ts / excelImport.ts / reports.ts
    ├── context/
    │   ├── AuthContext.tsx      # local session instead of JWT
    │   └── ToastContext.tsx     # unchanged
    ├── components/              # unchanged
    ├── pages/                   # unchanged, except Settings.tsx (added change-password)
    ├── types/index.ts           # unchanged — response DTO shapes
    └── styles/index.css         # unchanged
```

## 4. `package.json` / build tooling

- **Removed:** `axios` (no HTTP calls left to make).
- **Added:** `xlsx` (SheetJS — Excel parsing/writing), `jspdf` + `jspdf-autotable` (PDF report
  generation). Both are pure client-side, no native/binary dependencies, work fine in a Vite
  build.
- Everything else — React 18, Vite 5, TypeScript 5.5 (strict), Tailwind, React Router 6,
  TanStack Query 5, Recharts, lucide-react, clsx — is unchanged from the original frontend.
  TanStack Query is still used exactly as before; it's a fine async cache/state layer even
  when the "fetcher" is a local IndexedDB call instead of an HTTP request, and keeping it
  avoided touching any page component.
- `vite.config.ts`: the original had a dev-server proxy to `http://localhost:8080` for `/api` —
  removed, since there's no backend to proxy to.

## 5. Responsive design

No changes were needed here — the original frontend was already responsive (Tailwind, mobile-
first utility classes, `overflow-x-auto` on tables, a fixed sidebar that's usable down to phone
widths). This conversion didn't touch any styling, so whatever the original app's responsive
behavior was, this one has too. Worth checking on an actual phone before you rely on it, but
nothing here changed that behavior.

## 6. Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. First run seeds the local admin account automatically
(username `admin`, password `ChangeMe123!`) — go straight to Settings and change it.

> **A note on this delivery:** this sandbox has no network access, so I was not able to run
> `npm install` / `npm run build` here to get a real compiler's confirmation. I did a careful
> manual pass for type errors (this project's `tsconfig.json` has `strict`, `noUnusedLocals`,
> and `noUnusedParameters` all on) and fixed the issues I found by inspection, but please run
> the build yourself before deploying, and tell me about any errors — I'll fix them.

## 7. Production build

```bash
npm run build      # tsc -b && vite build → output in dist/
npm run preview    # optional: serve the production build locally to sanity-check it
```

## 8. Deploying to Vercel

**Option A — Vercel CLI**
```bash
npm i -g vercel      # if you don't have it
vercel login
vercel                # first deploy — follow the prompts (framework: Vite, build: npm run build, output: dist)
vercel --prod          # promote to production
```

**Option B — Vercel dashboard**
1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In Vercel: **New Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory
   `dist` — `vercel.json` already sets these, so the defaults should just work.
4. Deploy. No environment variables are required — there's no backend URL to configure.

`vercel.json` includes a catch-all rewrite to `index.html` so client-side routes (`/records`,
`/interest`, etc.) work on refresh/direct navigation, since this is a single-page app.

No database, no environment secrets, no server — it's a static site, so it fits comfortably in
Vercel's free tier.

## 9. Functionality-preserved checklist

| Feature | Status |
|---|---|
| Login (against seeded account) | ✅ same credentials, local instead of server-verified |
| Dashboard summary cards (original/outstanding/interest/paid totals, status counts) | ✅ same aggregation logic |
| Dashboard charts (outstanding by person, monthly interest, by year) | ✅ same grouping/sums, same year-dropdown behavior |
| Financial Records: list, filter (status/person), sort by date, paginate | ✅ |
| Financial Records: create / edit / delete / delete-all | ✅ same validation (positive original amount, non-negative interest) |
| Interest: view/edit rate, amount, paid, auto-computed outstanding | ✅ same clamping-at-zero logic |
| Renewals: renew a record (closes original, opens linked new record) | ✅ same "can't renew a CLOSED/RENEWED record" rule |
| Renewals: view renewal chain | ✅ same forward/backward chain walk |
| Excel import: preview with per-row validation (VALID/FLAGGED/INVALID) | ✅ same column names, date formats, status mapping, "Total Amount" row skip |
| Excel import: confirm (optionally including flagged rows), person auto-create | ✅ same case-insensitive person matching |
| Reports: all 6 types (Outstanding, Person-wise, Interest, Payment, Monthly, Yearly) × 2 formats (XLSX, PDF) | ✅ same headers/columns |
| Responsive layout (desktop/tablet/mobile) | ✅ unchanged — same Tailwind classes throughout |
| Settings: view account, sign out | ✅ |
| Settings: change password | ➕ added (necessary given the new auth model) |
| Multi-user accounts, Kafka audit log, Payment-creation UI | ❌ dropped — see "What was intentionally dropped" (Payment UI never existed in the original frontend either) |

## 10. If you want to go back to a real backend later

Everything backend-shaped lives in `src/services/` behind the same function signatures the
`src/api/*.ts` files already expose. If you ever stand up a server again, the smallest path back
is to make `src/api/*.ts` call `fetch`/`axios` again instead of `src/services/*.ts` — no page
component would need to change, for the same reason none needed to change this time.
