-- ============================================================
-- Permisos por rol: qué etiquetas puede ver cada rol
-- Si un rol no tiene entradas aquí, ve todas las conversaciones.
-- Si tiene entradas, solo ve conversaciones con esas etiquetas.
-- owner y admin nunca se restringen (lógica en la app).
-- ============================================================

create table role_label_access (
  role     text not null,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (role, label_id)
);

-- RLS
alter table role_label_access enable row level security;

create policy "auth: read role_label_access"
  on role_label_access for select to authenticated using (true);
create policy "auth: insert role_label_access"
  on role_label_access for insert to authenticated with check (true);
create policy "auth: delete role_label_access"
  on role_label_access for delete to authenticated using (true);
