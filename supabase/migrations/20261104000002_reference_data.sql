-- M0 — Reference data with stable IDs and localized labels (handbook §8.4, App. A).
-- Values are non-policy vocabularies. Editable later via ADM-009 (service role, audited).

create table reference.countries (
  code            char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name            text not null,
  phone_code      text not null check (phone_code ~ '^\+[0-9]{1,4}$'),
  default_currency char(3) not null,
  default_locale  text not null,
  launch_enabled  boolean not null default false,  -- country rollout switch (App. A)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table reference.currencies (
  code        char(3) primary key check (code ~ '^[A-Z]{3}$'),
  name        text not null,
  minor_units smallint not null check (minor_units between 0 and 4)
);
alter table reference.countries
  add constraint countries_currency_fk foreign key (default_currency) references reference.currencies(code);

create table reference.languages (
  code   text primary key check (code ~ '^[a-z]{2,3}$'),
  name   text not null,
  active boolean not null default true
);

-- Stable identifiers; labels are localized separately (handbook §2.5).
create table reference.relationship_goals (
  id         text primary key check (id ~ '^[a-z_]{3,40}$'),
  sort_order smallint not null,
  active     boolean not null default true
);
create table reference.relationship_goal_labels (
  goal_id text not null references reference.relationship_goals(id) on delete cascade,
  locale  text not null,
  label   text not null,
  primary key (goal_id, locale)
);

create trigger countries_updated_at before update on reference.countries
  for each row execute function app.set_updated_at();

-- RLS: default deny; read-only for signed-in users; writes only via service role (bypasses RLS).
alter table reference.countries               enable row level security;
alter table reference.currencies              enable row level security;
alter table reference.languages               enable row level security;
alter table reference.relationship_goals      enable row level security;
alter table reference.relationship_goal_labels enable row level security;

grant select on all tables in schema reference to authenticated;
grant select, insert, update, delete on all tables in schema reference to service_role;

create policy countries_read on reference.countries for select to authenticated using (true);
create policy currencies_read on reference.currencies for select to authenticated using (true);
create policy languages_read on reference.languages for select to authenticated using (active);
create policy goals_read on reference.relationship_goals for select to authenticated using (active);
create policy goal_labels_read on reference.relationship_goal_labels for select to authenticated
  using (exists (select 1 from reference.relationship_goals g where g.id = goal_id and g.active));

-- Seed (idempotent). India is the first launch market but launch_enabled stays false until approved.
insert into reference.currencies (code, name, minor_units) values ('INR','Indian Rupee',2)
  on conflict do nothing;
insert into reference.countries (code, name, phone_code, default_currency, default_locale, launch_enabled)
  values ('IN','India','+91','INR','en-IN', false) on conflict do nothing;

insert into reference.languages (code, name) values
  ('en','English'),('hi','Hindi'),('kn','Kannada'),('ta','Tamil'),('te','Telugu'),('ml','Malayalam'),
  ('mr','Marathi'),('bn','Bengali'),('gu','Gujarati'),('pa','Punjabi'),('ur','Urdu')
  on conflict do nothing;

-- Handbook §2.5. "Not sure" is a first-class option.
insert into reference.relationship_goals (id, sort_order) values
  ('marriage',1),('long_term_relationship',2),('companionship',3),('exploring',4),('not_sure',5)
  on conflict do nothing;
insert into reference.relationship_goal_labels (goal_id, locale, label) values
  ('marriage','en','Marriage'),
  ('long_term_relationship','en','Long-term relationship'),
  ('companionship','en','Companionship'),
  ('exploring','en','Exploring'),
  ('not_sure','en','Not sure yet')
  on conflict do nothing;
