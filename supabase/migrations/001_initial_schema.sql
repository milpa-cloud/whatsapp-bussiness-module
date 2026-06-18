-- ============================================================
-- Taller — Schema inicial
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- contacts
-- ------------------------------------------------------------
create table contacts (
  id         uuid primary key default uuid_generate_v4(),
  phone      text unique not null,  -- formato: 521XXXXXXXXXX
  name       text,
  type       text not null default 'lead'
             check (type in ('lead', 'cliente', 'proveedor')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
create table projects (
  id                uuid primary key default uuid_generate_v4(),
  contact_id        uuid not null references contacts(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  status            text not null default 'cotizacion'
                    check (status in ('cotizacion', 'aprobado', 'produccion', 'entrega', 'completado')),
  estimated_delivery date,
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- conversations
-- ------------------------------------------------------------
create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  contact_id      uuid not null references contacts(id) on delete cascade,
  project_id      uuid references projects(id) on delete set null,
  status          text not null default 'active'
                  check (status in ('active', 'archived')),
  mode            text not null default 'bot'
                  check (mode in ('bot', 'human')),
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------
create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction       text not null check (direction in ('inbound', 'outbound')),
  content         text not null,
  media_url       text,
  wa_message_id   text unique,  -- ID de Meta para deduplicación
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

-- ------------------------------------------------------------
-- internal_notes
-- ------------------------------------------------------------
create table internal_notes (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- user_profiles  (extiende auth.users)
-- ------------------------------------------------------------
create table user_profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'atencion'
       check (role in ('owner', 'admin', 'taller', 'atencion'))
);

-- trigger: crear perfil vacío cuando llega usuario nuevo de Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'atencion');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
create index on conversations(contact_id);
create index on conversations(last_message_at desc);
create index on conversations(status, mode);
create index on messages(conversation_id, created_at);
create index on messages(wa_message_id);
create index on projects(contact_id);
create index on internal_notes(conversation_id);

-- ------------------------------------------------------------
-- Realtime (bandeja en tiempo real)
-- ------------------------------------------------------------
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table contacts       enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table internal_notes enable row level security;
alter table projects       enable row level security;
alter table user_profiles  enable row level security;

-- contacts: cualquier usuario autenticado puede leer y escribir
create policy "auth: read contacts"
  on contacts for select to authenticated using (true);
create policy "auth: insert contacts"
  on contacts for insert to authenticated with check (true);
create policy "auth: update contacts"
  on contacts for update to authenticated using (true);

-- conversations: cualquier usuario autenticado
create policy "auth: read conversations"
  on conversations for select to authenticated using (true);
create policy "auth: insert conversations"
  on conversations for insert to authenticated with check (true);
create policy "auth: update conversations"
  on conversations for update to authenticated using (true);

-- messages: cualquier usuario autenticado
create policy "auth: read messages"
  on messages for select to authenticated using (true);
create policy "auth: insert messages"
  on messages for insert to authenticated with check (true);

-- internal_notes: leer cualquiera, escribir solo el propio autor
create policy "auth: read notes"
  on internal_notes for select to authenticated using (true);
create policy "auth: insert own notes"
  on internal_notes for insert to authenticated with check (auth.uid() = user_id);

-- projects: cualquier usuario autenticado
create policy "auth: read projects"
  on projects for select to authenticated using (true);
create policy "auth: insert projects"
  on projects for insert to authenticated with check (true);
create policy "auth: update projects"
  on projects for update to authenticated using (true);

-- user_profiles: cada quien lee y actualiza su propio perfil
create policy "auth: read own profile"
  on user_profiles for select to authenticated using (auth.uid() = id);
create policy "auth: update own profile"
  on user_profiles for update to authenticated using (auth.uid() = id);
-- owners y admins pueden ver todos los perfiles
create policy "auth: read all profiles for admin"
  on user_profiles for select to authenticated
  using (
    exists (
      select 1 from user_profiles up
      where up.id = auth.uid() and up.role in ('owner', 'admin')
    )
  );
