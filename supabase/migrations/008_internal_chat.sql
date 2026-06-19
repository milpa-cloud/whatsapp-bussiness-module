-- Canales de chat interno entre el equipo

CREATE TABLE internal_channels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE internal_channel_members (
  channel_id uuid REFERENCES internal_channels ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE internal_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES internal_channels ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users ON DELETE SET NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índice para cargar mensajes de un canal ordenados
CREATE INDEX ON internal_messages (channel_id, created_at);

-- RLS
ALTER TABLE internal_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden ver y crear todo (chat interno)
CREATE POLICY "auth read channels"   ON internal_channels         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert channels" ON internal_channels         FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth delete channels" ON internal_channels         FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "auth read members"    ON internal_channel_members  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert members"  ON internal_channel_members  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth delete members"  ON internal_channel_members  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "auth read messages"   ON internal_messages         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert messages" ON internal_messages         FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE internal_messages;
