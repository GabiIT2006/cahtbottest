-- ============================================================
-- BotPanel – Supabase Schema
-- Rulează acest SQL în Supabase > SQL Editor > New query
-- ============================================================

-- Tabela clienți
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  domain text not null,
  active boolean default true,
  color text default '#185FA5',
  bot_name text default 'Virtueller Assistent',
  greeting text default 'Guten Tag! Wie kann ich Ihnen helfen?',
  phone text,
  email text,
  address text,
  description text,
  slot_duration int default 30,
  dsgvo boolean default true,
  webhook text,
  created_at timestamp with time zone default now()
);

-- Tabela servicii per client
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  duration int not null default 30,
  price text default 'kostenlos',
  color text default '#185FA5',
  created_at timestamp with time zone default now()
);

-- Tabela ore deschidere per client (7 zile, index 0=Luni ... 6=Duminică)
create table if not exists opening_hours (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  day_index int not null check (day_index between 0 and 6),
  is_open boolean default false,
  time_from text default '09:00',
  time_to text default '17:00'
);

-- Tabela programări
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  service_name text not null,
  booking_date date not null,
  booking_time text not null,
  status text default 'new' check (status in ('new', 'done', 'cancelled')),
  created_at timestamp with time zone default now()
);

-- RLS (Row Level Security) - dezactivat pentru simplitate în dev
-- Activează mai târziu cu auth propriu
alter table clients disable row level security;
alter table services disable row level security;
alter table opening_hours disable row level security;
alter table bookings disable row level security;

-- Date demo (opțional - șterge dacă nu vrei)
insert into clients (id, name, domain, active, color, bot_name, greeting, phone, email, address, description, slot_duration)
values (
  '11111111-1111-1111-1111-111111111111',
  'Muster GmbH',
  'mustergmbh.de',
  true,
  '#185FA5',
  'Virtueller Assistent',
  'Guten Tag! Wie kann ich Ihnen helfen?',
  '+49 30 12345678',
  'info@mustergmbh.de',
  'Musterstraße 1, 10115 Berlin',
  'Wir sind ein professionelles Beratungsunternehmen mit Sitz in Berlin.',
  30
);

insert into services (client_id, name, duration, price, color) values
  ('11111111-1111-1111-1111-111111111111', 'Beratungsgespräch', 60, 'kostenlos', '#185FA5'),
  ('11111111-1111-1111-1111-111111111111', 'Erstgespräch', 30, 'kostenlos', '#0F6E56'),
  ('11111111-1111-1111-1111-111111111111', 'Folgetermin', 45, '45 €', '#854F0B');

insert into opening_hours (client_id, day_index, is_open, time_from, time_to) values
  ('11111111-1111-1111-1111-111111111111', 0, true, '08:00', '18:00'),
  ('11111111-1111-1111-1111-111111111111', 1, true, '08:00', '18:00'),
  ('11111111-1111-1111-1111-111111111111', 2, true, '08:00', '18:00'),
  ('11111111-1111-1111-1111-111111111111', 3, true, '08:00', '18:00'),
  ('11111111-1111-1111-1111-111111111111', 4, true, '08:00', '17:00'),
  ('11111111-1111-1111-1111-111111111111', 5, false, '09:00', '13:00'),
  ('11111111-1111-1111-1111-111111111111', 6, false, '', '');
