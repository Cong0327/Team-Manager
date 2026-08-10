-- 팀 생성/가입 기능을 위한 스키마.
-- Supabase 대시보드 > SQL Editor에 붙여넣어 실행한다 (CLI 마이그레이션 대신 수동 적용).

create extension if not exists pgcrypto;

-- auth.users는 클라이언트에서 직접 조회할 수 없으므로(RLS/PostgREST 미노출),
-- 가입 신청자 이메일을 팀장에게 보여주기 위해 공개 프로필 테이블을 따로 둔다.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null
);

alter table profiles enable row level security;

create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

-- 회원가입(이메일/카카오 공통) 시 auth.users에 행이 생기면 profiles에도 자동으로 복사한다.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  region text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

do $$ begin
  create type team_member_role as enum ('owner', 'member');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type team_member_status as enum ('pending', 'approved');
exception
  when duplicate_object then null;
end $$;

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role team_member_role not null default 'member',
  status team_member_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

alter table teams enable row level security;
alter table team_members enable row level security;

-- teams: 로그인한 사람은 누구나 팀 목록/이름을 검색할 수 있어야 "팀가입하기" 검색이 동작한다.
create policy "teams_select_authenticated" on teams
  for select to authenticated using (true);

create policy "teams_insert_self_owner" on teams
  for insert to authenticated with check (owner_id = auth.uid());

create policy "teams_update_owner" on teams
  for update to authenticated using (owner_id = auth.uid());

-- team_members: 본인 멤버십 행 + 자신이 owner인 팀의 멤버십 행(가입신청 승인용)을 볼 수 있다.
create policy "team_members_select_own_or_owned_team" on team_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );

-- 본인 명의로만 가입신청을 만들 수 있다 (다른 사람을 대신 가입시키는 것 방지).
create policy "team_members_insert_self" on team_members
  for insert to authenticated with check (user_id = auth.uid());

-- 가입신청 승인/거절: 팀장만 자신의 팀 멤버십 상태를 바꿀 수 있다.
create policy "team_members_update_owner" on team_members
  for update to authenticated using (
    exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );

-- 본인 가입신청 취소, 또는 팀장이 신청을 거절(행 삭제)할 수 있다.
create policy "team_members_delete_self_or_owner" on team_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );
