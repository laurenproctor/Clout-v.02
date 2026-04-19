-- =============================================================================
-- Clout v.02 — Supabase Schema
-- Extensions, Enums, Tables, Indexes, RLS, Helper Functions, Policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'creator',
  'brand',
  'agency',
  'admin'
);

create type public.campaign_status as enum (
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
);

create type public.deal_status as enum (
  'pending',
  'accepted',
  'rejected',
  'countered',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.content_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'published'
);

create type public.platform_type as enum (
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'linkedin',
  'pinterest',
  'twitch',
  'podcast',
  'blog',
  'other'
);

create type public.notification_type as enum (
  'deal_offer',
  'deal_accepted',
  'deal_rejected',
  'deal_countered',
  'content_approved',
  'content_rejected',
  'payment_sent',
  'payment_received',
  'campaign_invite',
  'message',
  'system'
);

create type public.payment_status as enum (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);

-- ---------------------------------------------------------------------------
-- TABLE 1: profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext not null unique,
  username      citext not null unique,
  display_name  text,
  avatar_url    text,
  bio           text,
  website       text,
  role          public.user_role not null default 'creator',
  is_verified   boolean not null default false,
  is_active     boolean not null default true,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TABLE 2: creator_profiles
-- ---------------------------------------------------------------------------
create table public.creator_profiles (
  id                uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  niche             text[],
  location          text,
  languages         text[] default '{"en"}',
  min_rate_usd      numeric(12, 2),
  max_rate_usd      numeric(12, 2),
  media_kit_url     text,
  total_reach       bigint,
  avg_engagement    numeric(5, 4),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (profile_id)
);

-- ---------------------------------------------------------------------------
-- TABLE 3: brand_profiles
-- ---------------------------------------------------------------------------
create table public.brand_profiles (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  company_name    text not null,
  industry        text,
  website         text,
  logo_url        text,
  description     text,
  budget_usd      numeric(14, 2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id)
);

-- ---------------------------------------------------------------------------
-- TABLE 4: social_accounts
-- ---------------------------------------------------------------------------
create table public.social_accounts (
  id               uuid primary key default uuid_generate_v4(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  platform         public.platform_type not null,
  handle           text not null,
  profile_url      text,
  followers_count  bigint default 0,
  following_count  bigint default 0,
  posts_count      bigint default 0,
  avg_likes        numeric(12, 2),
  avg_comments     numeric(12, 2),
  engagement_rate  numeric(5, 4),
  verified         boolean not null default false,
  access_token     text,        -- encrypted at rest via Vault or app layer
  refresh_token    text,
  token_expires_at timestamptz,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (profile_id, platform, handle)
);

-- ---------------------------------------------------------------------------
-- TABLE 5: campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id               uuid primary key default uuid_generate_v4(),
  brand_profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  title            text not null,
  description      text,
  status           public.campaign_status not null default 'draft',
  budget_usd       numeric(14, 2),
  start_date       date,
  end_date         date,
  target_platforms public.platform_type[],
  target_niches    text[],
  requirements     jsonb default '{}',
  deliverables     jsonb default '[]',
  is_public        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TABLE 6: deals
-- ---------------------------------------------------------------------------
create table public.deals (
  id                  uuid primary key default uuid_generate_v4(),
  campaign_id         uuid references public.campaigns(id) on delete set null,
  brand_profile_id    uuid not null references public.brand_profiles(id) on delete cascade,
  creator_profile_id  uuid not null references public.creator_profiles(id) on delete cascade,
  status              public.deal_status not null default 'pending',
  offered_by          uuid not null references public.profiles(id),
  rate_usd            numeric(12, 2) not null,
  platform            public.platform_type,
  deliverables        jsonb default '[]',
  notes               text,
  deadline            date,
  contracted_at       timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TABLE 7: deal_messages
-- ---------------------------------------------------------------------------
create table public.deal_messages (
  id         uuid primary key default uuid_generate_v4(),
  deal_id    uuid not null references public.deals(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TABLE 8: content_submissions
-- ---------------------------------------------------------------------------
create table public.content_submissions (
  id                  uuid primary key default uuid_generate_v4(),
  deal_id             uuid not null references public.deals(id) on delete cascade,
  creator_profile_id  uuid not null references public.creator_profiles(id) on delete cascade,
  status              public.content_status not null default 'draft',
  title               text,
  description         text,
  content_url         text,
  thumbnail_url       text,
  platform            public.platform_type,
  published_url       text,
  published_at        timestamptz,
  reviewer_notes      text,
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TABLE 9: payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id                  uuid primary key default uuid_generate_v4(),
  deal_id             uuid not null references public.deals(id) on delete cascade,
  payer_profile_id    uuid not null references public.profiles(id),
  payee_profile_id    uuid not null references public.profiles(id),
  amount_usd          numeric(12, 2) not null,
  platform_fee_usd    numeric(12, 2) not null default 0,
  net_amount_usd      numeric(12, 2) generated always as (amount_usd - platform_fee_usd) stored,
  status              public.payment_status not null default 'pending',
  stripe_payment_id   text,
  stripe_transfer_id  text,
  notes               text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TABLE 10: notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  type        public.notification_type not null,
  title       text not null,
  body        text,
  data        jsonb default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TABLE 11: saved_creators
-- (brands bookmark creators for future campaigns)
-- ---------------------------------------------------------------------------
create table public.saved_creators (
  id                  uuid primary key default uuid_generate_v4(),
  brand_profile_id    uuid not null references public.brand_profiles(id) on delete cascade,
  creator_profile_id  uuid not null references public.creator_profiles(id) on delete cascade,
  notes               text,
  created_at          timestamptz not null default now(),
  unique (brand_profile_id, creator_profile_id)
);

-- ---------------------------------------------------------------------------
-- TABLE 12: reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references public.deals(id) on delete cascade,
  reviewer_id     uuid not null references public.profiles(id) on delete cascade,
  reviewee_id     uuid not null references public.profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  comment         text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (deal_id, reviewer_id)
);

-- ---------------------------------------------------------------------------
-- TABLE 13: audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  table_name  text,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- profiles
create index idx_profiles_username   on public.profiles(username);
create index idx_profiles_role       on public.profiles(role);
create index idx_profiles_is_active  on public.profiles(is_active);

-- creator_profiles
create index idx_creator_profiles_profile_id on public.creator_profiles(profile_id);
create index idx_creator_profiles_niche      on public.creator_profiles using gin(niche);
create index idx_creator_profiles_reach      on public.creator_profiles(total_reach desc nulls last);

-- brand_profiles
create index idx_brand_profiles_profile_id on public.brand_profiles(profile_id);

-- social_accounts
create index idx_social_accounts_profile_id on public.social_accounts(profile_id);
create index idx_social_accounts_platform   on public.social_accounts(platform);

-- campaigns
create index idx_campaigns_brand_profile_id on public.campaigns(brand_profile_id);
create index idx_campaigns_status           on public.campaigns(status);
create index idx_campaigns_is_public        on public.campaigns(is_public) where is_public = true;
create index idx_campaigns_dates            on public.campaigns(start_date, end_date);

-- deals
create index idx_deals_campaign_id         on public.deals(campaign_id);
create index idx_deals_brand_profile_id    on public.deals(brand_profile_id);
create index idx_deals_creator_profile_id  on public.deals(creator_profile_id);
create index idx_deals_status              on public.deals(status);
create index idx_deals_created_at          on public.deals(created_at desc);

-- deal_messages
create index idx_deal_messages_deal_id    on public.deal_messages(deal_id);
create index idx_deal_messages_sender_id  on public.deal_messages(sender_id);
create index idx_deal_messages_created_at on public.deal_messages(deal_id, created_at desc);

-- content_submissions
create index idx_content_submissions_deal_id            on public.content_submissions(deal_id);
create index idx_content_submissions_creator_profile_id on public.content_submissions(creator_profile_id);
create index idx_content_submissions_status             on public.content_submissions(status);

-- payments
create index idx_payments_deal_id         on public.payments(deal_id);
create index idx_payments_payer           on public.payments(payer_profile_id);
create index idx_payments_payee           on public.payments(payee_profile_id);
create index idx_payments_status          on public.payments(status);

-- notifications
create index idx_notifications_profile_id on public.notifications(profile_id);
create index idx_notifications_unread     on public.notifications(profile_id) where read_at is null;
create index idx_notifications_created_at on public.notifications(profile_id, created_at desc);

-- saved_creators
create index idx_saved_creators_brand_profile_id   on public.saved_creators(brand_profile_id);
create index idx_saved_creators_creator_profile_id on public.saved_creators(creator_profile_id);

-- reviews
create index idx_reviews_deal_id      on public.reviews(deal_id);
create index idx_reviews_reviewer_id  on public.reviews(reviewer_id);
create index idx_reviews_reviewee_id  on public.reviews(reviewee_id);

-- audit_logs
create index idx_audit_logs_actor_id   on public.audit_logs(actor_id);
create index idx_audit_logs_table_name on public.audit_logs(table_name, record_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.creator_profiles    enable row level security;
alter table public.brand_profiles      enable row level security;
alter table public.social_accounts     enable row level security;
alter table public.campaigns           enable row level security;
alter table public.deals               enable row level security;
alter table public.deal_messages       enable row level security;
alter table public.content_submissions enable row level security;
alter table public.payments            enable row level security;
alter table public.notifications       enable row level security;
alter table public.saved_creators      enable row level security;
alter table public.reviews             enable row level security;
alter table public.audit_logs          enable row level security;

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

-- 1. auth_uid(): shorthand for the currently authenticated user's UUID
create or replace function public.auth_uid()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select auth.uid();
$$;

-- 2. is_admin(): returns true if the current user has the 'admin' role
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

-- 3. owns_profile(profile_id): true when the caller owns the given profile
create or replace function public.owns_profile(profile_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth.uid() = profile_id;
$$;

-- 4. is_deal_participant(deal_id): true when the caller is the brand or creator on a deal
create or replace function public.is_deal_participant(p_deal_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deals d
    join public.brand_profiles   bp on bp.id = d.brand_profile_id
    join public.creator_profiles cp on cp.id = d.creator_profile_id
    where d.id = p_deal_id
      and (bp.profile_id = auth.uid() or cp.profile_id = auth.uid())
  );
$$;

-- 5. set_updated_at(): trigger function that keeps updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply set_updated_at trigger to mutable tables
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_creator_profiles_updated_at
  before update on public.creator_profiles
  for each row execute function public.set_updated_at();

create trigger trg_brand_profiles_updated_at
  before update on public.brand_profiles
  for each row execute function public.set_updated_at();

create trigger trg_social_accounts_updated_at
  before update on public.social_accounts
  for each row execute function public.set_updated_at();

create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create trigger trg_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create trigger trg_content_submissions_updated_at
  before update on public.content_submissions
  for each row execute function public.set_updated_at();

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------------------------

-- ---- profiles ----
create policy "profiles: users can view all active profiles"
  on public.profiles for select
  using (is_active = true or auth_uid() = id or is_admin());

create policy "profiles: users can insert their own profile"
  on public.profiles for insert
  with check (auth_uid() = id);

create policy "profiles: users can update their own profile"
  on public.profiles for update
  using (auth_uid() = id)
  with check (auth_uid() = id);

create policy "profiles: admins can delete profiles"
  on public.profiles for delete
  using (is_admin());

-- ---- creator_profiles ----
create policy "creator_profiles: anyone can view"
  on public.creator_profiles for select
  using (true);

create policy "creator_profiles: owner can insert"
  on public.creator_profiles for insert
  with check (owns_profile(profile_id));

create policy "creator_profiles: owner can update"
  on public.creator_profiles for update
  using (owns_profile(profile_id));

create policy "creator_profiles: owner or admin can delete"
  on public.creator_profiles for delete
  using (owns_profile(profile_id) or is_admin());

-- ---- brand_profiles ----
create policy "brand_profiles: anyone can view"
  on public.brand_profiles for select
  using (true);

create policy "brand_profiles: owner can insert"
  on public.brand_profiles for insert
  with check (owns_profile(profile_id));

create policy "brand_profiles: owner can update"
  on public.brand_profiles for update
  using (owns_profile(profile_id));

create policy "brand_profiles: owner or admin can delete"
  on public.brand_profiles for delete
  using (owns_profile(profile_id) or is_admin());

-- ---- social_accounts ----
create policy "social_accounts: owner can view all their own"
  on public.social_accounts for select
  using (owns_profile(profile_id) or is_admin());

create policy "social_accounts: authenticated users can view non-token fields"
  on public.social_accounts for select
  using (auth.uid() is not null);

create policy "social_accounts: owner can insert"
  on public.social_accounts for insert
  with check (owns_profile(profile_id));

create policy "social_accounts: owner can update"
  on public.social_accounts for update
  using (owns_profile(profile_id));

create policy "social_accounts: owner or admin can delete"
  on public.social_accounts for delete
  using (owns_profile(profile_id) or is_admin());

-- ---- campaigns ----
create policy "campaigns: public campaigns visible to all authenticated"
  on public.campaigns for select
  using (
    is_public = true
    or is_admin()
    or exists (
      select 1 from public.brand_profiles bp
      where bp.id = campaigns.brand_profile_id
        and bp.profile_id = auth_uid()
    )
  );

create policy "campaigns: brand owner can insert"
  on public.campaigns for insert
  with check (
    exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
  );

create policy "campaigns: brand owner can update"
  on public.campaigns for update
  using (
    exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
  );

create policy "campaigns: brand owner or admin can delete"
  on public.campaigns for delete
  using (
    is_admin()
    or exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
  );

-- ---- deals ----
create policy "deals: participants and admins can view"
  on public.deals for select
  using (is_deal_participant(id) or is_admin());

create policy "deals: brand owner or creator can insert"
  on public.deals for insert
  with check (
    exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
    or exists (
      select 1 from public.creator_profiles cp
      where cp.id = creator_profile_id
        and cp.profile_id = auth_uid()
    )
  );

create policy "deals: participants can update"
  on public.deals for update
  using (is_deal_participant(id));

create policy "deals: only admins can delete"
  on public.deals for delete
  using (is_admin());

-- ---- deal_messages ----
create policy "deal_messages: participants can view"
  on public.deal_messages for select
  using (is_deal_participant(deal_id) or is_admin());

create policy "deal_messages: participants can insert"
  on public.deal_messages for insert
  with check (
    is_deal_participant(deal_id)
    and auth_uid() = sender_id
  );

create policy "deal_messages: sender can update (edit)"
  on public.deal_messages for update
  using (auth_uid() = sender_id);

create policy "deal_messages: admins can delete"
  on public.deal_messages for delete
  using (is_admin());

-- ---- content_submissions ----
create policy "content_submissions: participants and admins can view"
  on public.content_submissions for select
  using (is_deal_participant(deal_id) or is_admin());

create policy "content_submissions: creator can insert"
  on public.content_submissions for insert
  with check (
    exists (
      select 1 from public.creator_profiles cp
      where cp.id = creator_profile_id
        and cp.profile_id = auth_uid()
    )
  );

create policy "content_submissions: creator or reviewer can update"
  on public.content_submissions for update
  using (
    exists (
      select 1 from public.creator_profiles cp
      where cp.id = creator_profile_id
        and cp.profile_id = auth_uid()
    )
    or is_admin()
  );

create policy "content_submissions: admins can delete"
  on public.content_submissions for delete
  using (is_admin());

-- ---- payments ----
create policy "payments: payer or payee or admin can view"
  on public.payments for select
  using (
    auth_uid() = payer_profile_id
    or auth_uid() = payee_profile_id
    or is_admin()
  );

create policy "payments: only system/admin can insert"
  on public.payments for insert
  with check (is_admin());

create policy "payments: only admin can update"
  on public.payments for update
  using (is_admin());

create policy "payments: only admin can delete"
  on public.payments for delete
  using (is_admin());

-- ---- notifications ----
create policy "notifications: owner can view their own"
  on public.notifications for select
  using (auth_uid() = profile_id);

create policy "notifications: system/admin can insert"
  on public.notifications for insert
  with check (is_admin() or auth_uid() = profile_id);

create policy "notifications: owner can update (mark read)"
  on public.notifications for update
  using (auth_uid() = profile_id);

create policy "notifications: owner or admin can delete"
  on public.notifications for delete
  using (auth_uid() = profile_id or is_admin());

-- ---- saved_creators ----
create policy "saved_creators: brand owner can view their own"
  on public.saved_creators for select
  using (
    exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
    or is_admin()
  );

create policy "saved_creators: brand owner can insert"
  on public.saved_creators for insert
  with check (
    exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
  );

create policy "saved_creators: brand owner can update notes"
  on public.saved_creators for update
  using (
    exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
  );

create policy "saved_creators: brand owner or admin can delete"
  on public.saved_creators for delete
  using (
    exists (
      select 1 from public.brand_profiles bp
      where bp.id = brand_profile_id
        and bp.profile_id = auth_uid()
    )
    or is_admin()
  );

-- ---- reviews ----
create policy "reviews: public reviews visible to all authenticated"
  on public.reviews for select
  using (is_public = true or auth_uid() = reviewer_id or is_admin());

create policy "reviews: deal participants can insert"
  on public.reviews for insert
  with check (
    auth_uid() = reviewer_id
    and is_deal_participant(deal_id)
  );

create policy "reviews: reviewer can update their own"
  on public.reviews for update
  using (auth_uid() = reviewer_id);

create policy "reviews: reviewer or admin can delete"
  on public.reviews for delete
  using (auth_uid() = reviewer_id or is_admin());

-- ---- audit_logs ----
create policy "audit_logs: only admins can view"
  on public.audit_logs for select
  using (is_admin());

create policy "audit_logs: system inserts only (via security definer functions)"
  on public.audit_logs for insert
  with check (is_admin());

create policy "audit_logs: immutable — no updates"
  on public.audit_logs for update
  using (false);

create policy "audit_logs: immutable — no deletes"
  on public.audit_logs for delete
  using (false);
