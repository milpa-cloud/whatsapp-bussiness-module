-- ============================================================
-- Agrega preview del último mensaje y contador de no leídos
-- a la tabla conversations
-- ============================================================

alter table conversations
  add column if not exists last_message_preview text,
  add column if not exists unread_count         int not null default 0;
