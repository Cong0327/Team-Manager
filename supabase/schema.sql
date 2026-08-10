-- 팀 생성/가입 기능을 위한 스키마.
-- Supabase 대시보드 > SQL Editor에 붙여넣어 실행한다 (CLI 마이그레이션 대신 수동 적용).
-- 파일 전체를 여러 번 다시 실행해도 안전하도록(idempotent) 작성돼 있다 —
-- create policy는 원래 재실행이 안 되므로 매번 drop policy if exists 후 다시 만든다.

create extension if not exists pgcrypto;

-- auth.users는 클라이언트에서 직접 조회할 수 없으므로(RLS/PostgREST 미노출),
-- 가입 신청자 이메일을 팀장에게 보여주기 위해 공개 프로필 테이블을 따로 둔다.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on profiles;
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

-- 기존에 team_member_role을 이미 만든 프로젝트를 위한 추가 (일정 수정 권한을 owner 외에
-- manager에게도 주기 위해 필요). 새로 스키마를 처음 적용하는 경우에도 안전하게 실행된다.
alter type team_member_role add value if not exists 'manager';

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
drop policy if exists "teams_select_authenticated" on teams;
create policy "teams_select_authenticated" on teams
  for select to authenticated using (true);

drop policy if exists "teams_insert_self_owner" on teams;
create policy "teams_insert_self_owner" on teams
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "teams_update_owner" on teams;
create policy "teams_update_owner" on teams
  for update to authenticated using (owner_id = auth.uid());

-- team_members: 본인 멤버십 행 + 자신이 owner인 팀의 멤버십 행(가입신청 승인용)을 볼 수 있다.
drop policy if exists "team_members_select_own_or_owned_team" on team_members;
create policy "team_members_select_own_or_owned_team" on team_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );

-- 본인 명의로만 가입신청을 만들 수 있다 (다른 사람을 대신 가입시키는 것 방지).
drop policy if exists "team_members_insert_self" on team_members;
create policy "team_members_insert_self" on team_members
  for insert to authenticated with check (user_id = auth.uid());

-- 가입신청 승인/거절 + 매니저 지정: 팀장만 자신의 팀 멤버십 행(status, role)을 바꿀 수 있다.
drop policy if exists "team_members_update_owner" on team_members;
create policy "team_members_update_owner" on team_members
  for update to authenticated using (
    exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );

-- 본인 가입신청 취소, 또는 팀장이 신청을 거절(행 삭제)할 수 있다.
drop policy if exists "team_members_delete_self_or_owner" on team_members;
create policy "team_members_delete_self_or_owner" on team_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );

-- 일정(이벤트) 관리. 시간/내용은 owner·manager만 만들고 고칠 수 있고,
-- 참여 여부(event_participants)는 팀원 누구나 본인 것만 넣고 뺄 수 있다.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table events enable row level security;
alter table event_participants enable row level security;

drop policy if exists "events_select_team_members" on events;
create policy "events_select_team_members" on events
  for select to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = events.team_id and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

drop policy if exists "events_insert_owner_manager" on events;
create policy "events_insert_owner_manager" on events
  for insert to authenticated with check (
    exists (
      select 1 from team_members tm
      where tm.team_id = events.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

drop policy if exists "events_update_owner_manager" on events;
create policy "events_update_owner_manager" on events
  for update to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = events.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

drop policy if exists "events_delete_owner_manager" on events;
create policy "events_delete_owner_manager" on events
  for delete to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = events.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

drop policy if exists "event_participants_select_team_members" on event_participants;
create policy "event_participants_select_team_members" on event_participants
  for select to authenticated using (
    exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_participants.event_id
        and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

-- 참여는 본인 명의로만, 그리고 그 팀의 승인된 멤버여야 신청 가능.
drop policy if exists "event_participants_insert_self" on event_participants;
create policy "event_participants_insert_self" on event_participants
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_participants.event_id
        and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

drop policy if exists "event_participants_delete_self" on event_participants;
create policy "event_participants_delete_self" on event_participants
  for delete to authenticated using (user_id = auth.uid());
