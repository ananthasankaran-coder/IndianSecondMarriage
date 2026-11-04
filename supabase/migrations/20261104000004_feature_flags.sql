-- M0 / ADM-012 — Feature flags with environment/country scope, owner and rollback note.
-- Safe defaults live in code (src/server/flags/flags.ts); rows here only override them.

create table admin.feature_flags (
  id            uuid primary key default gen_random_uuid(),
  key           text not null check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'),
  enabled       boolean not null,
  environment   text check (environment in ('local','development','staging','production')),
  country       char(2) references reference.countries(code),
  owner         text not null check (length(owner) between 2 and 100),
  rollback_note text not null check (length(rollback_note) between 5 and 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
-- one row per (key, environment, country) scope; NULL scope = "all"
create unique index feature_flags_scope_uq
  on admin.feature_flags (key, coalesce(environment,''), coalesce(country::text,''));
create trigger feature_flags_updated_at before update on admin.feature_flags
  for each row execute function app.set_updated_at();

alter table admin.feature_flags enable row level security;
revoke all on admin.feature_flags from anon;
grant select on admin.feature_flags to authenticated;        -- flag state is not sensitive
grant select, insert, update, delete on admin.feature_flags to service_role;
create policy feature_flags_read on admin.feature_flags for select to authenticated using (true);
-- No insert/update/delete policy: members can never change flags. Staff changes (M6) use the
-- service role and are audited.
