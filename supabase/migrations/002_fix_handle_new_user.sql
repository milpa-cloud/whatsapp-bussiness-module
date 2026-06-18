-- ============================================================
-- Fix: trigger handle_new_user — evitar error en conflicto de id
-- Aplica: cuando un usuario ya tiene perfil (e.g. re-registro)
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'atencion')
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
end;
$$;
