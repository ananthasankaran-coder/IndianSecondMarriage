-- M0 / EPIC-12 — Foundation: schemas and default-deny posture (handbook §9.1, §9.3, ADR-001)
-- Rollback: drop the schemas below (only safe before any data exists).

create schema if not exists identity;
create schema if not exists person;
create schema if not exists story;
create schema if not exists discovery;
create schema if not exists communication;
create schema if not exists trust;
create schema if not exists premium;
create schema if not exists ai;
create schema if not exists notification;
create schema if not exists analytics;
create schema if not exists admin;
create schema if not exists reference;
create schema if not exists audit;
create schema if not exists app;  -- shared helper functions only; never holds data

-- Default deny: nothing is reachable by PUBLIC or anon in any managed schema.
-- Access is granted explicitly, per schema and per table, together with RLS policies.
do $$
declare s text;
begin
  foreach s in array array['identity','person','story','discovery','communication','trust',
                           'premium','ai','notification','analytics','admin','reference','audit','app']
  loop
    execute format('revoke all on schema %I from public', s);
    execute format('revoke all on schema %I from anon', s);
    execute format('alter default privileges in schema %I revoke all on tables from public', s);
    execute format('alter default privileges in schema %I revoke all on functions from public', s);
  end loop;
end $$;

grant usage on schema app, reference, audit, admin to authenticated, service_role;

-- Keeps updated_at honest (handbook §7.4).
create or replace function app.set_updated_at() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function app.set_updated_at() from public;
grant execute on function app.set_updated_at() to authenticated, service_role;
