-- M0 security tests: default-deny, append-only audit, outbox/jobs isolation, flags.
-- Runs with psql -v ON_ERROR_STOP=1 as a superuser connection; roles are switched per assertion.
\set ON_ERROR_STOP 1

create function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'ASSERTION FAILED: %', msg; end if; end $$;

-- run a scalar query as a role (+ optional member id); returns text
create function pg_temp.scalar_as(r text, sub text, q text) returns text language plpgsql as $$
declare v text;
begin
  execute format('set local role %I', r);
  perform set_config('request.jwt.claim.sub', coalesce(sub,''), true);
  execute q into v;
  reset role;
  return v;
end $$;

-- expect a statement to fail with a given SQLSTATE when run as role
create function pg_temp.expect_fail(r text, sub text, q text, state text, msg text) returns void language plpgsql as $$
begin
  begin
    execute format('set local role %I', r);
    perform set_config('request.jwt.claim.sub', coalesce(sub,''), true);
    execute q;
    reset role;
  exception when others then
    reset role;
    if sqlstate <> state then
      raise exception 'ASSERTION FAILED: % (expected %, got % : %)', msg, state, sqlstate, sqlerrm;
    end if;
    return;
  end;
  raise exception 'ASSERTION FAILED: % (statement unexpectedly succeeded)', msg;
end $$;

\set alice '11111111-1111-1111-1111-111111111111'

begin;

-- 1. anon is locked out of every managed schema
select pg_temp.expect_fail('anon', null, 'select 1 from reference.relationship_goals', '42501', 'anon must not read reference data');
select pg_temp.expect_fail('anon', null, 'select 1 from audit.audit_logs', '42501', 'anon must not read audit');

-- 2. members read reference data but cannot write it
select pg_temp.check(pg_temp.scalar_as('authenticated', :'alice', 'select count(*)::text from reference.relationship_goals') = '5', 'member sees 5 relationship goals');
select pg_temp.check(pg_temp.scalar_as('authenticated', :'alice', $q$select label from reference.relationship_goal_labels where goal_id='not_sure' and locale='en'$q$) = 'Not sure yet', 'Not sure is a first-class goal');
select pg_temp.expect_fail('authenticated', :'alice', $q$insert into reference.relationship_goals(id,sort_order) values ('hack',9)$q$, '42501', 'member must not insert reference data');
select pg_temp.expect_fail('authenticated', :'alice', $q$update reference.countries set launch_enabled = true$q$, '42501', 'member must not enable a country');

-- 3. audit log: no direct member access
select pg_temp.expect_fail('authenticated', :'alice', 'select * from audit.audit_logs', '42501', 'member must not read audit log');
select pg_temp.expect_fail('authenticated', :'alice', $q$insert into audit.audit_logs(actor_type,actor_id,action) values ('member',gen_random_uuid(),'forged.event')$q$, '42501', 'member must not forge audit rows directly');

-- 4. member can only write audit via record_event, and it stamps THEIR id
select pg_temp.scalar_as('authenticated', :'alice', $q$select audit.record_event('profile.viewed','story','s1',null,'corr-123456')::text$q$);
select pg_temp.check((select actor_id::text from audit.audit_logs where action='profile.viewed') = :'alice', 'actor id is taken from the session, not the caller');
select pg_temp.expect_fail('authenticated', null, $q$select audit.record_event('anon.try')$q$, '28000', 'unauthenticated cannot write audit');
select pg_temp.expect_fail('authenticated', :'alice', $q$select audit.record_event('BAD ACTION!')$q$, '23514', 'action format enforced');

-- 5. audit is append-only even for service_role
select pg_temp.expect_fail('service_role', null, $q$update audit.audit_logs set action='tampered.x'$q$, '42501', 'service_role cannot update audit');
select pg_temp.expect_fail('service_role', null, $q$delete from audit.audit_logs$q$, '42501', 'service_role cannot delete audit');
select pg_temp.expect_fail('service_role', null, $q$truncate audit.audit_logs$q$, '42501', 'service_role cannot truncate audit');

-- 6. outbox: no direct access; enqueue is idempotent
select pg_temp.expect_fail('authenticated', :'alice', 'select * from audit.outbox_events', '42501', 'member must not read outbox');
select pg_temp.scalar_as('authenticated', :'alice', $q$select audit.enqueue_event('interest','i1','interest.expressed','{"n":1}','dk-1')::text$q$);
select pg_temp.scalar_as('authenticated', :'alice', $q$select audit.enqueue_event('interest','i1','interest.expressed','{"n":1}','dk-1')::text$q$);
select pg_temp.check((select count(*) from audit.outbox_events where dedupe_key='dk-1') = 1, 'retry with same dedupe key creates one event');
select pg_temp.expect_fail('authenticated', null, $q$select audit.enqueue_event('a1','b','c.d')$q$, '28000', 'unauthenticated cannot enqueue');

-- 7. jobs: members can't touch; only service_role can claim; retries then dead-letter
select pg_temp.expect_fail('authenticated', :'alice', 'select * from audit.jobs', '42501', 'member must not read jobs');
select pg_temp.expect_fail('authenticated', :'alice', $q$select * from audit.claim_jobs('q',1,'w')$q$, '42501', 'member must not claim jobs');
insert into audit.jobs(queue,payload,max_attempts) values ('test','{}',2);
select pg_temp.check(pg_temp.scalar_as('service_role', null, $q$select count(*)::text from audit.claim_jobs('test',10,'w1')$q$) = '1', 'worker claims the job');
select pg_temp.check(pg_temp.scalar_as('service_role', null, $q$select count(*)::text from audit.claim_jobs('test',10,'w2')$q$) = '0', 'a running job is not claimed twice');
select pg_temp.scalar_as('service_role', null, $q$select audit.fail_job((select id from audit.jobs where queue='test'),'boom','0 seconds')::text$q$);
select pg_temp.check((select status from audit.jobs where queue='test') = 'queued', 'first failure re-queues');
select pg_temp.check(pg_temp.scalar_as('service_role', null, $q$select count(*)::text from audit.claim_jobs('test',10,'w1')$q$) = '1', 'job is retried');
select pg_temp.scalar_as('service_role', null, $q$select audit.fail_job((select id from audit.jobs where queue='test'),'boom again','0 seconds')::text$q$);
select pg_temp.check((select status from audit.jobs where queue='test') = 'dead', 'exhausted job is dead-lettered');

-- 8. feature flags: readable by members, never writable
insert into admin.feature_flags(key,enabled,owner,rollback_note) values ('ai.profile_writing', false, 'founder', 'disable via this row');
select pg_temp.check(pg_temp.scalar_as('authenticated', :'alice', $q$select count(*)::text from admin.feature_flags$q$) = '1', 'member can read flags');
select pg_temp.expect_fail('authenticated', :'alice', $q$update admin.feature_flags set enabled = true$q$, '42501', 'member must not change flags');

-- 9. STRUCTURAL default-deny guarantees across ALL managed schemas
select pg_temp.check((
  select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname in ('identity','person','story','discovery','communication','trust','premium','ai',
                       'notification','analytics','admin','reference','audit')
     and c.relkind in ('r','p') and not c.relrowsecurity) = 0,
  'every table in every managed schema has RLS enabled');
select pg_temp.check((
  select count(*) from information_schema.role_table_grants
   where grantee in ('anon','PUBLIC')
     and table_schema in ('identity','person','story','discovery','communication','trust','premium','ai',
                          'notification','analytics','admin','reference','audit','app')) = 0,
  'anon/PUBLIC hold no table privileges in managed schemas');
select pg_temp.check((
  select count(*) from information_schema.role_routine_grants
   where grantee in ('anon','PUBLIC') and routine_schema in ('audit','app','admin','reference')) = 0,
  'anon/PUBLIC cannot execute any managed function');

rollback;
\echo 'M0 RLS TESTS PASSED'
