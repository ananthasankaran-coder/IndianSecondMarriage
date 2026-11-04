# ADR-0001: Server-mediated, user-scoped RLS access

- Status: **Approved** (founder, 2026-11-04)
- Owner: Founder / Engineering
- Related: Handbook §7.3, §9.3, §10.2, §15.3, §16.3

## Context
The handbook mandates default-deny RLS, "never rely solely on frontend authorization", service-role keys
server-only, and a 13-schema Postgres layout. Supabase's browser Data API works best with few exposed
schemas, and exposing many widens the attack surface.

## Decision
1. The browser **never queries domain tables directly**. All reads/writes go through `/api/v1` route handlers.
2. Route handlers run each request **as the signed-in member**: open a transaction, set the member's JWT
   claims and the `authenticated` role, then query. **RLS applies to every member request.**
3. Business rules live in domain services. Concurrency-sensitive rules (e.g. Mutual Interest) run in one
   transaction backed by unique constraints.
4. The **service role** is used only in allow-listed places (`src/server/database`, `src/server/jobs`,
   admin actions, webhooks). `scripts/check-boundaries.mjs` fails CI if it appears elsewhere.
5. Realtime messaging uses Supabase Realtime, which is also subject to RLS.
6. Managed schemas (`identity` … `audit`) are **never added to the Data API exposed-schemas list**
   (verified in M9). SECURITY DEFINER helper functions (`audit.record_event`, `audit.enqueue_event`) rely on this.

## Consequences
+ One authorization path to test; RLS is a genuine second layer, not decoration.
+ Easy to evolve (rate limits, idempotency, validation) in one place.
- Slightly more server code than direct client queries. Accepted.
- Needs a pooled connection (Supabase transaction pooler) with `SET LOCAL` per transaction.

## Rollback
Domain code is behind repositories; switching to PostgREST later would change only the repository layer.
