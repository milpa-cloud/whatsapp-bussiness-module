-- Grupos: reemplazan role_label_access con algo más flexible
-- Un usuario puede estar en varios grupos
-- Un grupo define qué etiquetas puede ver
-- Sin grupos → ve todo; con grupos → solo ve conversaciones con esas etiquetas

CREATE TABLE groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- Etiquetas que puede ver un grupo
CREATE TABLE group_label_access (
  group_id uuid not null references groups(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (group_id, label_id)
);

-- Membresía: qué usuarios pertenecen a qué grupos
CREATE TABLE user_groups (
  user_id  uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  primary key (user_id, group_id)
);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth: read groups"   ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth: write groups"  ON groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth: update groups" ON groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth: delete groups" ON groups FOR DELETE TO authenticated USING (true);

ALTER TABLE group_label_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth: read gla"   ON group_label_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth: insert gla" ON group_label_access FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth: delete gla" ON group_label_access FOR DELETE TO authenticated USING (true);

ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth: read ug"   ON user_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth: insert ug" ON user_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth: delete ug" ON user_groups FOR DELETE TO authenticated USING (true);
