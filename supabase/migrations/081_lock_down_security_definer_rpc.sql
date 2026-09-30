-- 081_lock_down_security_definer_rpc
--
-- Supabase advisors 0028/0029: SECURITY DEFINER functions in public were
-- EXECUTABLE by anon/authenticated through /rest/v1/rpc. Several are
-- privilege-escalation primitives (exec_sql runs arbitrary SQL as postgres;
-- add_credits / set_subscription_status / update_youtube_tokens take any
-- user id with no auth.uid() check).
--
-- Call-site audit (frontend repo): zero supabase.rpc() calls; the browser only
-- uses auth.*, and .from() on affiliate_clicks, mobile_waitlist, reels.
-- So every function below becomes service_role-only, except current_user_role():
-- five RLS policies on public.users (all TO PUBLIC) call it, and policy
-- expressions run with the caller's privileges, so anon and authenticated must
-- keep EXECUTE or every request touching users errors. It is safe to expose: the
-- body is `select role from users where id = auth.uid()` (caller's own row; NULL
-- for anon). It remains flagged by lint 0028/0029 by design.
--
-- Trigger functions (handle_new_user, prevent_role_escalation) are not checked
-- for EXECUTE at fire time, so revoking is safe for them.
--
-- exec_sql is dropped. For rollback, its definition was:
--   create function public.exec_sql(sql text) returns void
--   language plpgsql security definer as $$ begin execute sql; end; $$;

begin;

-- ---------------------------------------------------------------------------
-- 0. Guard: abort if anything other than a trigger/cron/definer body depends on
--    a function we are about to revoke (RLS policy, column default, CHECK).
--    Those are evaluated as the calling role and would start failing.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn, d.classid::regclass as dep_class, d.objid
    from pg_depend d
    join pg_proc p on p.oid = d.refobjid
    where d.refclassid = 'pg_proc'::regclass
      and d.classid in ('pg_policy'::regclass, 'pg_attrdef'::regclass, 'pg_constraint'::regclass)
      and p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'add_credits','admin_cancel_draft','admin_cancel_job','admin_inspect_draft',
        'admin_rerun_job','deduct_credits','enqueue_publish_job','ensure_user_account',
        'exec_sql','fail_stuck_jobs','handle_new_user','increment_tts_minutes',
        'prevent_role_escalation','retry_failed_draft','set_subscription_status',
        'supersede_publish_job','update_youtube_tokens')
  loop
    raise exception 'Cannot revoke %: still referenced by % (objid %)', r.fn, r.dep_class, r.objid;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 1. exec_sql: arbitrary SQL as postgres. Nothing in the frontend uses it.
--    (Backend repo not searched from this session: confirm before applying.)
-- ---------------------------------------------------------------------------
drop function if exists public.exec_sql(text);

-- ---------------------------------------------------------------------------
-- 2. Server-only functions: service_role (and the owner) only.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.add_credits(uuid, integer),
  public.deduct_credits(uuid, integer),
  public.set_subscription_status(uuid, text),
  public.update_youtube_tokens(uuid, text, text, timestamptz, boolean),
  public.admin_cancel_draft(uuid),
  public.admin_cancel_job(uuid),
  public.admin_inspect_draft(uuid),
  public.admin_rerun_job(uuid),
  public.enqueue_publish_job(uuid),
  public.supersede_publish_job(uuid),
  public.retry_failed_draft(uuid),
  public.ensure_user_account(uuid),
  public.fail_stuck_jobs(integer),
  public.increment_tts_minutes(uuid, numeric),
  public.handle_new_user(),
  public.prevent_role_escalation()
from public, anon, authenticated;

grant execute on function
  public.add_credits(uuid, integer),
  public.deduct_credits(uuid, integer),
  public.set_subscription_status(uuid, text),
  public.update_youtube_tokens(uuid, text, text, timestamptz, boolean),
  public.admin_cancel_draft(uuid),
  public.admin_cancel_job(uuid),
  public.admin_inspect_draft(uuid),
  public.admin_rerun_job(uuid),
  public.enqueue_publish_job(uuid),
  public.supersede_publish_job(uuid),
  public.retry_failed_draft(uuid),
  public.ensure_user_account(uuid),
  public.fail_stuck_jobs(integer),
  public.increment_tts_minutes(uuid, numeric),
  public.handle_new_user(),
  public.prevent_role_escalation()
to service_role;

-- ---------------------------------------------------------------------------
-- 3. current_user_role(): needed by RLS policies on public.users (TO PUBLIC).
--    Grants are made explicit (anon, authenticated, service_role) and PUBLIC is
--    dropped; it already derives everything from auth.uid().
-- ---------------------------------------------------------------------------
revoke execute on function public.current_user_role() from public;
grant  execute on function public.current_user_role() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Pin search_path on every remaining SECURITY DEFINER function.
-- ---------------------------------------------------------------------------
alter function public.add_credits(uuid, integer)                                    set search_path = public, pg_temp;
alter function public.deduct_credits(uuid, integer)                                 set search_path = public, pg_temp;
alter function public.set_subscription_status(uuid, text)                           set search_path = public, pg_temp;
alter function public.update_youtube_tokens(uuid, text, text, timestamptz, boolean) set search_path = public, pg_temp;
alter function public.admin_cancel_draft(uuid)                                      set search_path = public, pg_temp;
alter function public.admin_cancel_job(uuid)                                        set search_path = public, pg_temp;
alter function public.admin_inspect_draft(uuid)                                     set search_path = public, pg_temp;
alter function public.admin_rerun_job(uuid)                                         set search_path = public, pg_temp;
alter function public.enqueue_publish_job(uuid)                                     set search_path = public, pg_temp;
alter function public.supersede_publish_job(uuid)                                   set search_path = public, pg_temp;
alter function public.retry_failed_draft(uuid)                                      set search_path = public, pg_temp;
alter function public.ensure_user_account(uuid)                                     set search_path = public, pg_temp;
alter function public.fail_stuck_jobs(integer)                                      set search_path = public, pg_temp;
alter function public.increment_tts_minutes(uuid, numeric)                          set search_path = public, pg_temp;
alter function public.handle_new_user()                                             set search_path = public, pg_temp;
alter function public.prevent_role_escalation()                                     set search_path = public, pg_temp;
alter function public.current_user_role()                                           set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 5. Post-condition: roll everything back unless the lockdown actually holds.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  if to_regprocedure('public.exec_sql(text)') is not null then
    raise exception 'exec_sql still exists';
  end if;

  for r in
    select p.oid::regprocedure as fn,
           has_function_privilege('anon', p.oid, 'execute')          as anon_x,
           has_function_privilege('authenticated', p.oid, 'execute') as auth_x,
           p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef
      and pg_get_userbyid(p.proowner) = 'postgres'
  loop
    if r.proname <> 'current_user_role' then
      if r.anon_x then
        raise exception '% still executable by anon', r.fn;
      end if;
      if r.auth_x then
        raise exception '% still executable by authenticated', r.fn;
      end if;
    end if;
    if not exists (select 1 from pg_proc x where x.oid = r.fn::oid
                   and exists (select 1 from unnest(x.proconfig) c where c like 'search_path=%')) then
      raise exception '% has no pinned search_path', r.fn;
    end if;
  end loop;
end $$;

commit;
