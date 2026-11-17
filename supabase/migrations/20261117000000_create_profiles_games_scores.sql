-- profiles: perfil público asociado 1:1 a auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- games: catálogo de juegos con tabla real (hoy solo asteroides)
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null
);

alter table public.games enable row level security;

create policy "games_select_all"
  on public.games for select
  to anon, authenticated
  using (true);

-- scores: historial de partidas jugadas por usuario, por juego
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  user_id uuid not null references public.profiles(id),
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "scores_select_all"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "scores_insert_own"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);

create index scores_game_id_score_idx on public.scores (game_id, score desc);

-- seed: único juego real implementado hoy
insert into public.games (id, title, short, long, cat, cover, color) values (
  'asteroides',
  'ASTEROIDES',
  'Pulveriza rocas espaciales en gravedad cero.',
  'Pilota una nave en un campo de asteroides toroidal. Dispara para partir rocas grandes en fragmentos cada vez más pequeños, recoge el power-up de disparo triple y sobrevive al mayor número de niveles posible.',
  'SHOOTER',
  'cover-rocas',
  'yellow'
);
