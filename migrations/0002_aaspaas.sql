-- AasPaas: profiles, room listings, geofence presence, alerts, admin activity.

create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  phone text not null,
  role text not null default 'tenant',
  address text not null,
  lat double precision,
  lng double precision,
  radius_km integer not null default 3,
  last_lat double precision,
  last_lng double precision,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_chk check (role in ('tenant', 'landlord', 'admin')),
  constraint profiles_radius_chk check (radius_km between 1 and 10)
);

create table if not exists listings (
  id text primary key,
  owner_id text not null,
  title text not null,
  room_type text not null,
  rent_inr integer not null,
  furnishing text not null,
  description text not null default '',
  address text not null,
  lat double precision not null,
  lng double precision not null,
  contact_name text not null,
  contact_phone text not null,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_available_idx on listings (available);
create index if not exists listings_owner_idx on listings (owner_id);

create table if not exists presence (
  tenant_id text not null,
  listing_id text not null,
  inside boolean not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, listing_id)
);

create table if not exists geofence_events (
  id serial primary key,
  tenant_id text not null,
  listing_id text not null,
  distance_m integer not null,
  contact_name text not null,
  contact_phone text not null,
  listing_title text not null,
  rent_inr integer not null,
  address text not null,
  created_at timestamptz not null default now()
);

create index if not exists geofence_events_tenant_idx on geofence_events (tenant_id, id desc);

create table if not exists activity (
  id serial primary key,
  actor_id text not null,
  kind text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_recent_idx on activity (id desc);
