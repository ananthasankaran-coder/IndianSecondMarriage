# Relationship Discovery Platform

AI-assisted relationship discovery for adults seeking meaningful long-term relationships. India first; global-ready.
Spec: *Founder & Engineering Handbook v0.9*. Status: **M0 (foundation) built; awaiting founder approval.**

Non-technical? Start with [`docs/founder/founder-guide.md`](docs/founder/founder-guide.md).

## Stack
Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS · shadcn/ui · Supabase (Auth, PostgreSQL, Storage) ·
Vercel · Gemini (server-side only, flags off). Modular monolith, REST under `/api/v1`, default-deny RLS.

## Quick start
```bash
cp .env.example .env.local        # fill in Supabase values (use a staging project, never production)
npm install                       # generates package-lock.json: commit it
npm run dev                       # http://localhost:3000
npm run check                     # boundaries + typecheck + lint + unit tests + RLS tests
```
Database: `npx supabase init` (once) then `npx supabase start` (needs Docker) and `npx supabase db reset` to apply
`supabase/migrations`. For a hosted project: `npx supabase link` then `npx supabase db push`.

## Layout
```
src/app              routes (UI) and /api/v1 handlers
src/components       ui (shadcn) + shared components
src/domains/*        business rules per domain (identity, person, story, discovery, trust, communication, premium, ai, notification, admin)
src/server           http envelope/errors, auth, authorization, database, jobs, events, observability, flags
src/config           validated environment
supabase/migrations  versioned SQL (+ RLS in the same file as each table)
supabase/tests       RLS tests and the local Supabase shim (tests only)
docs                 adr/, api/openapi.yaml, product/ (decisions, traceability), runbooks/, founder/
scripts              check-boundaries.mjs, test-rls.sh
```

## Rules that CI enforces
- `check:boundaries`: UI cannot import server modules; service-role key only in allow-listed modules; no cross-domain internals; no forbidden product terms.
- `test:rls`: every table has RLS; anon/PUBLIC have no privileges; audit log is append-only even for the service role; members cannot touch outbox/jobs/flags.
- Unit tests for API envelope, safe errors, log redaction, env validation (no secret values in errors), and flag defaults.

## Deploying to Vercel (summary)
1. Import the GitHub repo in Vercel. 2. Add the environment variables from `.env.example` (production values only in the Production scope).
3. Run migrations against the matching Supabase project. 4. Keep `REGISTRATION_MIN_AGE` empty in production until legal approval (registration stays closed). Full guide arrives in M9.

## API
Contract in [`docs/api/openapi.yaml`](docs/api/openapi.yaml). Envelope: `{success:true,data,meta}` / `{success:false,error:{code,message,details?},meta}`.
