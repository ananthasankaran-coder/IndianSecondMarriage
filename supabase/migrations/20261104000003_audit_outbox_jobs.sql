-- M0 / EPIC-12, EPIC-07 — Audit log (append-only), transactional outbox, job queue
-- (handbook §9.2, §9.3, §10.5, §12.4). Assumption A-03: `jobs` lives in `audit` next to the outbox
-- because both are cross-domain infrastructure.
--
-- SECURITY MODEL (ADR-001): the app server connects as `authenticated` (with the member's JWT claims)
-- or `service_role`. Members can NOT read or write these tables directly. They can only call the narrow
-- SECURITY DEFINER functions below. These schemas must never be added to the Supabase Data API
-- "exposed schemas" list (checked in M9).

-- ---------------------------------------------------------------- audit_logs
create table audit.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  occurred_at    timestamptz not null default now(),
  actor_type     text not null check (actor_type in ('member','staff','system')),
  actor_id       uuid,
  action         text not null check (action ~ '^[a-z0-9_.]{3,80}$'),
  target_type    text check (target_type is null or target_type ~ '^[a-z0-9_.]{2,60}$'),
  target_id      text check (target_id is null or length(target_id) <= 100),
  reason         text check (reason is null or length(reason) <= 500),
  correlation_id text check (correlation_id is null or length(correlation_id) <= 64),
  metadata       jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 8192),
  check (actor_type = 'system' or actor_id is not null)
);
create index audit_logs_occurred_idx on audit.audit_logs (occurred_at desc);
create index audit_logs_actor_idx    on audit.audit_logs (actor_id, occurred_at desc);
create index audit_logs_target_idx   on audit.audit_logs (target_type, target_id, occurred_at desc);

-- Append-only: blocked for EVERY role, including service_role and table owners.
create function audit.deny_mutation() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'audit_logs is append-only' using errcode = 'insufficient_privilege';
end $$;
create trigger audit_logs_no_update_delete before update or delete on audit.audit_logs
  for each row execute function audit.deny_mutation();
create trigger audit_logs_no_truncate before truncate on audit.audit_logs
  for each statement execute function audit.deny_mutation();

alter table audit.audit_logs enable row level security;  -- no policies = deny all for non-bypass roles
revoke all on audit.audit_logs from anon, authenticated;

create function audit.record_event(
  p_action text, p_target_type text default null, p_target_id text default null,
  p_reason text default null, p_correlation_id text default null, p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = pg_catalog, audit as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  insert into audit.audit_logs (actor_type, actor_id, action, target_type, target_id, reason, correlation_id, metadata)
  values ('member', v_actor, p_action, p_target_type, p_target_id, p_reason, p_correlation_id, coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------- outbox
create table audit.outbox_events (
  id             uuid primary key default gen_random_uuid(),
  aggregate_type text not null check (aggregate_type ~ '^[a-z0-9_.]{2,60}$'),
  aggregate_id   text not null check (length(aggregate_id) <= 100),
  event_type     text not null check (event_type ~ '^[a-z0-9_.]{3,80}$'),
  payload        jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 16384),
  dedupe_key     text unique check (dedupe_key is null or length(dedupe_key) <= 200),
  created_at     timestamptz not null default now(),
  available_at   timestamptz not null default now(),
  processed_at   timestamptz,
  attempts       integer not null default 0
);
create index outbox_pending_idx on audit.outbox_events (available_at) where processed_at is null;

alter table audit.outbox_events enable row level security;
revoke all on audit.outbox_events from anon, authenticated;

-- Domain services call this inside their own business transaction (same-transaction guarantee).
-- dedupe_key makes retries idempotent: a repeat returns the original event id.
create function audit.enqueue_event(
  p_aggregate_type text, p_aggregate_id text, p_event_type text,
  p_payload jsonb default '{}'::jsonb, p_dedupe_key text default null
) returns uuid
language plpgsql security definer set search_path = pg_catalog, audit as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  insert into audit.outbox_events (aggregate_type, aggregate_id, event_type, payload, dedupe_key)
  values (p_aggregate_type, p_aggregate_id, p_event_type, coalesce(p_payload,'{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from audit.outbox_events where dedupe_key = p_dedupe_key;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------- jobs
create table audit.jobs (
  id           uuid primary key default gen_random_uuid(),
  queue        text not null check (queue ~ '^[a-z0-9_.]{2,60}$'),
  payload      jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 16384),
  status       text not null default 'queued' check (status in ('queued','running','succeeded','dead')),
  attempts     integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  run_at       timestamptz not null default now(),
  locked_at    timestamptz,
  locked_by    text,
  last_error   text,   -- short, sanitized; never PII (handbook §12.2)
  dedupe_key   text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index jobs_claim_idx on audit.jobs (queue, run_at) where status in ('queued','running');
create trigger jobs_updated_at before update on audit.jobs for each row execute function app.set_updated_at();

alter table audit.jobs enable row level security;
revoke all on audit.jobs from anon, authenticated;

-- Worker-only functions (service_role). Bounded, retryable, dead-lettering (handbook §10.5).
create function audit.claim_jobs(p_queue text, p_limit integer, p_worker text)
returns setof audit.jobs
language plpgsql security definer set search_path = pg_catalog, audit as $$
begin
  -- exhausted jobs whose worker vanished become dead letters
  update audit.jobs set status = 'dead', locked_at = null, locked_by = null,
         last_error = coalesce(last_error, 'worker lost; attempts exhausted')
   where queue = p_queue and status = 'running'
     and locked_at < now() - interval '10 minutes' and attempts >= max_attempts;

  return query
  with c as (
    select id from audit.jobs
     where queue = p_queue
       and ((status = 'queued' and run_at <= now())
         or (status = 'running' and locked_at < now() - interval '10 minutes' and attempts < max_attempts))
     order by run_at
     limit least(greatest(p_limit, 1), 100)
     for update skip locked)
  update audit.jobs j
     set status = 'running', locked_at = now(), locked_by = left(p_worker, 100), attempts = j.attempts + 1
    from c where j.id = c.id
  returning j.*;
end $$;

create function audit.complete_job(p_id uuid) returns void
language sql security definer set search_path = pg_catalog, audit as $$
  update audit.jobs set status = 'succeeded', locked_at = null, locked_by = null where id = p_id;
$$;

create function audit.fail_job(p_id uuid, p_error text, p_backoff interval default interval '1 minute')
returns void language sql security definer set search_path = pg_catalog, audit as $$
  update audit.jobs
     set status     = case when attempts >= max_attempts then 'dead' else 'queued' end,
         run_at     = now() + p_backoff * power(2, greatest(attempts - 1, 0)),
         last_error = left(p_error, 500), locked_at = null, locked_by = null
   where id = p_id;
$$;

-- ---------------------------------------------------------------- privileges
revoke all on function audit.deny_mutation() from public;
revoke all on function audit.record_event(text,text,text,text,text,jsonb) from public;
revoke all on function audit.enqueue_event(text,text,text,jsonb,text) from public;
revoke all on function audit.claim_jobs(text,integer,text) from public;
revoke all on function audit.complete_job(uuid) from public;
revoke all on function audit.fail_job(uuid,text,interval) from public;

grant execute on function audit.record_event(text,text,text,text,text,jsonb) to authenticated, service_role;
grant execute on function audit.enqueue_event(text,text,text,jsonb,text) to authenticated, service_role;
grant execute on function audit.claim_jobs(text,integer,text) to service_role;
grant execute on function audit.complete_job(uuid) to service_role;
grant execute on function audit.fail_job(uuid,text,interval) to service_role;
grant select, insert on audit.audit_logs, audit.outbox_events to service_role;
grant select, insert, update on audit.jobs to service_role;
grant update on audit.outbox_events to service_role;
