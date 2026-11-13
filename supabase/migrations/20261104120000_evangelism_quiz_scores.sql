create table if not exists public.evangelism_quiz_scores (
  id uuid primary key default gen_random_uuid(),
  player_hash text not null unique,
  nickname text not null check (char_length(nickname) between 1 and 40),
  score integer not null check (score between 0 and 25),
  total_questions integer not null default 25 check (total_questions = 25),
  updated_at timestamptz not null default now()
);
create index if not exists evangelism_quiz_scores_leaderboard_idx
  on public.evangelism_quiz_scores (score desc, updated_at asc);
alter table public.evangelism_quiz_scores enable row level security;
revoke all on public.evangelism_quiz_scores from anon, authenticated;
grant all on public.evangelism_quiz_scores to service_role;
