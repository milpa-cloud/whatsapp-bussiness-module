-- ============================================================
-- Etiquetas de conversación (universales, configurables)
-- ============================================================

create table labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default 'stone',
  created_at timestamptz not null default now()
);

-- Relación many-to-many conversación ↔ etiquetas
create table conversation_labels (
  conversation_id uuid not null references conversations(id) on delete cascade,
  label_id        uuid not null references labels(id)        on delete cascade,
  primary key (conversation_id, label_id)
);

-- Etiquetas por defecto
insert into labels (name, color) values
  ('Cliente',    'emerald'),
  ('Proveedor',  'amber'),
  ('Taller',     'indigo');

-- Índices
create index on conversation_labels(conversation_id);
create index on conversation_labels(label_id);

-- RLS
alter table labels              enable row level security;
alter table conversation_labels enable row level security;

create policy "auth: read labels"
  on labels for select to authenticated using (true);
create policy "auth: insert labels"
  on labels for insert to authenticated with check (true);
create policy "auth: delete labels"
  on labels for delete to authenticated using (true);

create policy "auth: read conversation_labels"
  on conversation_labels for select to authenticated using (true);
create policy "auth: insert conversation_labels"
  on conversation_labels for insert to authenticated with check (true);
create policy "auth: delete conversation_labels"
  on conversation_labels for delete to authenticated using (true);
