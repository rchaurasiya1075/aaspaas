-- Tenant budget and seeker type, landlord listing details, inquiry leads.

alter table profiles add column if not exists seeker_type text not null default '';
alter table profiles add column if not exists budget_min integer not null default 0;
alter table profiles add column if not exists budget_max integer not null default 0;

alter table profiles drop constraint if exists profiles_seeker_chk;
alter table profiles add constraint profiles_seeker_chk
  check (seeker_type in ('', 'student', 'working', 'family'));

alter table listings add column if not exists deposit_inr integer not null default 0;
alter table listings add column if not exists amenities text not null default '';
alter table listings add column if not exists house_no text not null default '';
alter table listings add column if not exists area text not null default '';
alter table listings add column if not exists city text not null default '';
alter table listings add column if not exists pincode text not null default '';
alter table listings add column if not exists photos text not null default '';

create table if not exists leads (
  id text primary key,
  listing_id text not null,
  tenant_id text not null,
  tenant_name text not null,
  tenant_phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists leads_listing_idx on leads (listing_id);
create index if not exists leads_owner_lookup_idx on leads (tenant_id);
