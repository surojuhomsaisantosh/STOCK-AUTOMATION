-- ============================================================================
-- Per-Franchise Feature Toggles
-- Run this in the Supabase SQL editor BEFORE deploying the frontend changes.
-- The app reads/writes these columns, so it will error until they exist.
-- ============================================================================

-- 1. COLUMNS -----------------------------------------------------------------
-- DEFAULT true = no regression on deploy: every franchise that can order today
-- still can. Central turns OFF the exceptions (or uses "Disable all" once).
alter table public.profiles
  add column if not exists order_stock_enabled   boolean not null default true,
  add column if not exists stock_request_enabled boolean not null default true;

-- Backfill any pre-existing rows that predate the default.
update public.profiles
   set order_stock_enabled   = coalesce(order_stock_enabled, true),
       stock_request_enabled = coalesce(stock_request_enabled, true)
 where order_stock_enabled is null
    or stock_request_enabled is null;


-- 2. WRITE GUARD -------------------------------------------------------------
-- Franchise owners already hold UPDATE on their own profiles row (that is how
-- franchise_settings.jsx writes refund_enabled). The RLS policy is
--   profiles_update_own  USING (id = auth.uid())
-- with no WITH CHECK and no column list, so a franchise owner may rewrite ANY
-- column on their own row. Without this trigger an owner could:
--
--   * re-enable their own feature cards  -> the toggles become cosmetic
--   * set is_active = true               -> undo a Central deactivation
--   * set role = 'central'               -> FULL ADMIN TAKEOVER, because
--                                           is_central_user() reads
--                                           profiles.role from the TABLE
--   * set franchise_id = '<other>'       -> read/write another outlet's bills,
--                                           menus, staff, logs and requests
--                                           (franchise_id is the RLS boundary
--                                           on all of those tables)
--
-- A BEFORE UPDATE trigger is used rather than column-level REVOKE because
-- Central Admin authenticates as the same `authenticated` role as everyone
-- else, so a blanket revoke would lock Central out too.
--
-- NOTE on signup: handle_new_franchise_profile() upserts profiles with
-- ON CONFLICT DO UPDATE SET franchise_id = EXCLUDED.franchise_id. That runs
-- from GoTrue, which does not set request.jwt.claims, so it takes the
-- null-claims bypass below and is unaffected.

create or replace function public.guard_franchise_feature_columns()
returns trigger
language plpgsql
security definer          -- needs to read profiles.role bypassing RLS
set search_path = public
as $$
declare
  jwt_role text;
  caller   uuid;
begin
  -- Only inspect when a guarded column actually changes. `is distinct from`
  -- keeps full-row updates that merely echo the current values working.
  if new.order_stock_enabled   is distinct from old.order_stock_enabled
     or new.stock_request_enabled is distinct from old.stock_request_enabled
     or new.is_active             is distinct from old.is_active
     or new.role                  is distinct from old.role
     or new.franchise_id          is distinct from old.franchise_id
  then
    begin
      jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
    exception when others then
      jwt_role := null;
    end;

    -- Direct DB access (SQL editor, migrations) and service_role callers
    -- (edge functions such as register-user / admin-delete-user) bypass.
    if jwt_role is null or jwt_role = 'service_role' then
      return new;
    end if;

    caller := auth.uid();
    if caller is null then
      raise exception 'Not authorised to change role, franchise, account status or feature flags';
    end if;

    if not exists (
      select 1 from public.profiles p
       where p.id = caller and p.role = 'central'
    ) then
      raise exception 'Only Central Admin may change role, franchise, account status or feature flags';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_franchise_feature_columns on public.profiles;
create trigger trg_guard_franchise_feature_columns
  before update on public.profiles
  for each row execute function public.guard_franchise_feature_columns();


-- 3. VERIFY ------------------------------------------------------------------
-- Expect: both columns present, every franchise row true.
-- select franchise_id, role, is_active, order_stock_enabled, stock_request_enabled
--   from public.profiles order by role, franchise_id;
--
-- Then, logged in as a FRANCHISE owner, EACH of these must be rejected:
--   update public.profiles set order_stock_enabled = false where id = auth.uid();
--   update public.profiles set is_active           = true  where id = auth.uid();
--   update public.profiles set role         = 'central'    where id = auth.uid();  -- takeover
--   update public.profiles set franchise_id = 'OTHER'      where id = auth.uid();  -- cross-tenant
-- while this must still SUCCEED (existing franchise_settings.jsx feature):
--   update public.profiles set refund_enabled = true where id = auth.uid();
