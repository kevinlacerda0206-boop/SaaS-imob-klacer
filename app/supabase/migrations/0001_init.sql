-- Schema inicial do MVP SaaS Imobiliário
-- Multi-tenant desde o início: toda tabela de dados carrega account_id,
-- e RLS garante que cada conta (imobiliária) só vê seus próprios dados.

create extension if not exists "pgcrypto";

-- ── Tenants ──────────────────────────────────────────────────────────────
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Um perfil por usuário autenticado (auth.users), vinculado a uma conta.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete cascade,
  name text not null,
  role text not null check (role in ('corretor', 'gestor')),
  created_at timestamptz not null default now()
);

create index profiles_account_id_idx on profiles (account_id);

-- ── Leads ────────────────────────────────────────────────────────────────
create table leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  broker_id uuid not null references profiles (id) on delete set null,
  name text not null,
  phone text,
  origin text,
  property_interest text,
  stage text not null default 'novo'
    check (stage in ('novo', 'atendimento', 'proposta', 'fechado', 'perdido')),
  tags text[] not null default '{}',
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_account_id_idx on leads (account_id);
create index leads_broker_id_idx on leads (broker_id);
create index leads_tags_idx on leads using gin (tags);
create index leads_stage_idx on leads (account_id, stage);

-- ── Notas livres por lead ────────────────────────────────────────────────
create table notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete set null,
  text text not null,
  created_at timestamptz not null default now()
);

create index notes_lead_id_idx on notes (lead_id);

-- ── Lembretes e visitas ──────────────────────────────────────────────────
create table reminders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  kind text not null check (kind in ('followup', 'visita')),
  text text not null,
  due_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index reminders_lead_id_idx on reminders (lead_id);
create index reminders_due_at_idx on reminders (account_id, done, due_at);

-- ── Registro da conversa (auditoria da extração de intenção) ────────────
create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete set null,
  lead_id uuid references leads (id) on delete set null,
  role text not null check (role in ('user', 'system')),
  text text not null,
  raw_extraction jsonb,
  created_at timestamptz not null default now()
);

create index conversation_messages_account_id_idx on conversation_messages (account_id, created_at);

-- ── Scripts de reativação ────────────────────────────────────────────────
create table reactivation_scripts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  min_inactive_days int not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index reactivation_scripts_account_id_idx on reactivation_scripts (account_id);

-- ── updated_at automático em leads ───────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ── Row Level Security: isolamento por conta ─────────────────────────────
alter table accounts enable row level security;
alter table profiles enable row level security;
alter table leads enable row level security;
alter table notes enable row level security;
alter table reminders enable row level security;
alter table conversation_messages enable row level security;
alter table reactivation_scripts enable row level security;

create or replace function current_account_id()
returns uuid language sql stable as $$
  select account_id from profiles where id = auth.uid()
$$;

create policy "profiles: view own account" on profiles
  for select using (account_id = current_account_id());

create policy "accounts: view own" on accounts
  for select using (id = current_account_id());

create policy "leads: full access within account" on leads
  for all using (account_id = current_account_id())
  with check (account_id = current_account_id());

create policy "notes: full access within account" on notes
  for all using (account_id = current_account_id())
  with check (account_id = current_account_id());

create policy "reminders: full access within account" on reminders
  for all using (account_id = current_account_id())
  with check (account_id = current_account_id());

create policy "conversation_messages: full access within account" on conversation_messages
  for all using (account_id = current_account_id())
  with check (account_id = current_account_id());

create policy "reactivation_scripts: full access within account" on reactivation_scripts
  for all using (account_id = current_account_id())
  with check (account_id = current_account_id());
