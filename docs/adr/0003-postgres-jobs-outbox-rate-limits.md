# ADR-0003: Postgres-backed outbox, jobs and rate limits (no Redis / queue vendor)

- Status: **Approved** (as part of the architecture plan, 2026-11-04)

## Decision
- Domain events are written to `audit.outbox_events` inside the same transaction as the business change.
- Background work uses `audit.jobs`, claimed with `FOR UPDATE SKIP LOCKED`, bounded retries with exponential
  backoff, and dead-lettering (see migration `…0003_audit_outbox_jobs.sql`, tested in `m0_foundation.test.sql`).
- A secured cron endpoint (`CRON_SECRET`) drives workers; the scheduler is Vercel Cron or Supabase `pg_cron`
  (depends on the plan chosen in decision D10).
- Rate limits use a Postgres counter table (added in M1), keyed by phone hash / account / IP bucket.

## Why
Avoids adding Redis/queue vendors ("no unnecessary technologies"). Alpha load is small. The job and event
interfaces are adapters, so a dedicated queue can replace Postgres later without domain changes.
