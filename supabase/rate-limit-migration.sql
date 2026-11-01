-- Ejecutar una vez en Supabase SQL Editor para actualizar una base existente.
-- Rate limiting compartido para Vercel/serverless. Solo service_role puede
-- leer/escribir la tabla y ejecutar la función.

create table if not exists public.rate_limits (
  key text primary key check (length(key) <= 200),
  window_started_at timestamptz not null default now(),
  count integer not null default 0 check (count >= 0),
  expires_at timestamptz not null
);

create index if not exists rate_limits_expires_idx on public.rate_limits (expires_at);

alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_window_started_at timestamptz;
begin
  if p_key is null
    or length(p_key) = 0
    or length(p_key) > 200
    or p_max < 1
    or p_window_seconds < 1
  then
    raise exception 'invalid rate limit arguments';
  end if;

  delete from public.rate_limits where expires_at < now();

  insert into public.rate_limits as rl (key, window_started_at, count, expires_at)
  values (p_key, now(), 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
  set
    count = case
      when rl.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else rl.count + 1
    end,
    window_started_at = case
      when rl.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else rl.window_started_at
    end,
    expires_at = case
      when rl.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now() + make_interval(secs => p_window_seconds)
      else rl.expires_at
    end
  returning count, window_started_at into v_count, v_window_started_at;

  return query
  select
    v_count <= p_max,
    greatest(p_max - v_count, 0),
    v_window_started_at + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
