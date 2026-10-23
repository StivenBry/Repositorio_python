-- =============================================================================
--  Pasiones en Pantalla · Esquema de Supabase
--  Ejecuta TODO este archivo en: Supabase → SQL Editor → New query → Run.
--  Es idempotente: puedes volver a ejecutarlo sin perder datos.
-- =============================================================================

-- 1) Administradores ----------------------------------------------------------
--    Solo los usuarios que estén en esta tabla pueden crear, editar o borrar.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "admins: cada usuario ve su propia fila" on public.admins;
create policy "admins: cada usuario ve su propia fila" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- anon necesita el permiso para que is_admin() (SECURITY INVOKER) funcione;
-- la política anterior hace que nunca vea filas.
grant select on public.admins to anon, authenticated;

-- Devuelve true si quien hace la petición es administrador. Se ejecuta con los
-- permisos de quien llama (SECURITY INVOKER): solo puede ver su propia fila.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Videos (metadatos) --------------------------------------------------------
create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 1 and 200),
  description      text not null default '',
  category         text not null default 'General',
  tags             text[] not null default '{}',
  video_url        text not null,          -- URL reproducible (Storage, MP4, HLS, YouTube, Vimeo, Drive…)
  video_path       text,                   -- ruta en el bucket si se subió a Storage
  thumbnail_url    text,                   -- póster vertical 2:3
  thumbnail_path   text,
  backdrop_url     text,                   -- portada horizontal 16:9
  backdrop_path    text,
  age_rating       text,                   -- TV-G, TV-PG, TV-14, TV-MA
  ribbon           text,                   -- "Nuevos episodios", "Estreno"…
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  is_featured      boolean not null default false,
  is_top10         boolean not null default false,
  is_exclusive     boolean not null default false,
  published_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists videos_published_at_idx on public.videos (published_at desc);
create index if not exists videos_category_idx on public.videos (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

alter table public.videos enable row level security;

-- El público solo ve lo publicado; los administradores también ven lo programado.
drop policy if exists "videos: lectura pública" on public.videos;
create policy "videos: lectura pública" on public.videos
  for select to anon, authenticated
  using (published_at <= now() or (select public.is_admin()));

drop policy if exists "videos: admins crean" on public.videos;
create policy "videos: admins crean" on public.videos
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "videos: admins editan" on public.videos;
create policy "videos: admins editan" on public.videos
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "videos: admins borran" on public.videos;
create policy "videos: admins borran" on public.videos
  for delete to authenticated
  using ((select public.is_admin()));

grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;

-- 2b) Listas de reproducción ----------------------------------------------------
--    Agrupan videos (capítulos de una novela, temporadas, colecciones). Un video
--    pertenece como máximo a una lista; playlist_position define el orden.
create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  cover_url   text,                       -- portada 16:9 de la lista
  cover_path  text,                       -- ruta en el bucket si se subió a Storage
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Proyectos creados antes de que existieran las portadas.
alter table public.playlists add column if not exists cover_url text;
alter table public.playlists add column if not exists cover_path text;

alter table public.videos
  add column if not exists playlist_id uuid references public.playlists (id) on delete set null;
alter table public.videos
  add column if not exists playlist_position integer check (playlist_position is null or playlist_position >= 1);
create index if not exists videos_playlist_idx on public.videos (playlist_id, playlist_position);

drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

alter table public.playlists enable row level security;

drop policy if exists "playlists: lectura pública" on public.playlists;
create policy "playlists: lectura pública" on public.playlists
  for select to anon, authenticated
  using (true);

drop policy if exists "playlists: admins crean" on public.playlists;
create policy "playlists: admins crean" on public.playlists
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "playlists: admins editan" on public.playlists;
create policy "playlists: admins editan" on public.playlists
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "playlists: admins borran" on public.playlists;
create policy "playlists: admins borran" on public.playlists
  for delete to authenticated
  using ((select public.is_admin()));

grant select on public.playlists to anon, authenticated;
grant insert, update, delete on public.playlists to authenticated;

-- 3) Storage: bucket público "media" para videos y miniaturas -------------------
--    file_size_limit = null usa el límite global del proyecto
--    (50 MB en el plan gratuito; configurable en planes de pago).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  null,
  array[
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura: al ser un bucket público, cualquiera puede ver los archivos por su URL.
-- Escritura y borrado: solo administradores.
drop policy if exists "media: admins listan" on storage.objects;
create policy "media: admins listan" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media: admins suben" on storage.objects;
create policy "media: admins suben" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media: admins actualizan" on storage.objects;
create policy "media: admins actualizan" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media: admins borran" on storage.objects;
create policy "media: admins borran" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

-- 4) Convierte tu usuario en administrador ------------------------------------
--    Primero crea el usuario en Authentication → Users → Add user
--    (marca "Auto Confirm User"). Luego cambia el correo y ejecuta:
--
--    insert into public.admins (user_id)
--    select id from auth.users where email = 'tu-correo@ejemplo.com'
--    on conflict do nothing;
