-- 팀 생성/가입 기능을 위한 스키마.
-- Supabase 대시보드 > SQL Editor에 붙여넣어 실행한다 (CLI 마이그레이션 대신 수동 적용).
-- 파일 전체를 여러 번 다시 실행해도 안전하도록(idempotent) 작성돼 있다 —
-- create policy는 원래 재실행이 안 되므로 매번 drop policy if exists 후 다시 만든다.

create extension if not exists pgcrypto;

-- auth.users는 클라이언트에서 직접 조회할 수 없으므로(RLS/PostgREST 미노출),
-- 가입 신청자 이메일을 팀장에게 보여주기 위해 공개 프로필 테이블을 따로 둔다.
-- name/birth_date/preferred_foot는 명단관리·마이페이지 표시용으로 본인이 직접 입력한다(가입 시 자동 수집 아님).
-- 나이는 birth_date(YYYY-MM-DD)로 앱에서 자동 계산한다. age 컬럼은 예전 데이터 호환용으로만 남겨두고 더는 쓰지 않는다.
-- preferred_foot는 주발: 'left'(왼발) | 'right'(오른발).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  age int,
  birth_date date,
  preferred_foot text
);

alter table profiles add column if not exists name text;
alter table profiles add column if not exists age int;
alter table profiles add column if not exists birth_date date;
alter table profiles add column if not exists preferred_foot text;

alter table profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

-- 본인 프로필(이름/나이)만 수정 가능. email/id는 앱에서 건드리지 않는다.
drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

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
  created_at timestamptz not null default now(),
  dues_account text -- 회비 입금 계좌 안내문(은행/계좌번호/예금주를 자유 형식으로). 회원 화면의 "계좌번호 복사" 버튼에 쓰인다.
);

alter table teams add column if not exists dues_account text;

do $$ begin
  create type team_member_role as enum ('owner', 'member', 'manager');
exception
  when duplicate_object then null;
end $$;

-- team_member_role을 'owner','member'만으로 이미 만든 적이 있는 프로젝트를 위한 보정.
-- ⚠️ ALTER TYPE ... ADD VALUE는 같은 트랜잭션 안에서 그 값을 바로 못 쓴다(Postgres 제약).
-- 이 줄에서 "unsafe use of new value" 에러가 나면, 이 한 줄만 따로 실행해서 커밋한 뒤
-- 파일 전체를 다시 실행한다. 이미 'manager'가 있으면 이 줄은 아무 일도 하지 않는다.
alter type team_member_role add value if not exists 'manager';

do $$ begin
  create type team_member_status as enum ('pending', 'approved');
exception
  when duplicate_object then null;
end $$;

-- positions/jersey_number/goals/assists/mom은 팀별 명단·기록 데이터다(포지션은 팀마다 다를 수 있어 team_members에 둔다).
-- 편집 규칙:
--   * positions(앱단 최대 2개)/jersey_number(등번호): 본인 + 감독·매니저가 수정 가능.
--   * goals/assists/mom(맨 오브 더 매치 횟수): 감독·매니저만 수정 가능.
-- 위 컬럼별 권한 차이는 아래 enforce_team_member_update 트리거로 강제한다(RLS는 행 단위만 제어하므로).
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role team_member_role not null default 'member',
  status team_member_status not null default 'pending',
  created_at timestamptz not null default now(),
  positions text[] not null default '{}',
  jersey_number int,
  goals int not null default 0,
  assists int not null default 0,
  mom int not null default 0,
  unique (team_id, user_id)
);

alter table team_members add column if not exists positions text[] not null default '{}';
alter table team_members add column if not exists jersey_number int;
alter table team_members add column if not exists goals int not null default 0;
alter table team_members add column if not exists assists int not null default 0;
alter table team_members add column if not exists mom int not null default 0;

-- team_members.user_id와 profiles.id는 둘 다 auth.users.id를 참조하지만 서로 직접 연결된
-- FK가 없으면 PostgREST가 select문의 profile:profiles(...) 관계 임베딩(리소스 조인)을 못 찾아
-- "Could not find a relationship between 'team_members' and 'profiles'" 에러가 난다.
-- 모든 유저는 가입 시 트리거(handle_new_user)로 profiles 행이 함께 생기므로 직접 FK를 걸어도 안전하다.
do $$ begin
  alter table team_members
    add constraint team_members_user_id_profiles_fkey
    foreign key (user_id) references profiles(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

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

-- 명단관리는 팀원 전원이 봐야 하므로, 승인된 멤버는 같은 팀의 승인된 멤버 행을 모두 볼 수 있다.
-- (대기중인 가입신청은 여전히 owner만 위 정책으로 본다.)
-- 주의: 정책 조건 안에서 team_members를 다시 select하면 RLS가 그 select에도 이 정책을
-- 다시 적용하려 해서 "infinite recursion detected in policy" 에러가 난다. security definer
-- 함수로 RLS를 우회해 조회함으로써 재귀를 끊는다.
create or replace function public.is_approved_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = p_user_id and status = 'approved'
  );
$$;

drop policy if exists "team_members_select_approved_peers" on team_members;
create policy "team_members_select_approved_peers" on team_members
  for select to authenticated using (
    team_members.status = 'approved'
    and public.is_approved_team_member(team_members.team_id, auth.uid())
  );

-- 본인 명의로만 가입신청을 만들 수 있다 (다른 사람을 대신 가입시키는 것 방지).
drop policy if exists "team_members_insert_self" on team_members;
create policy "team_members_insert_self" on team_members
  for insert to authenticated with check (user_id = auth.uid());

-- 가입신청 승인/거절 + 매니저 지정 + 명단 정보(포지션/골/어시스트) 수정: 팀장은 무엇이든 바꿀 수 있다.
drop policy if exists "team_members_update_owner" on team_members;
create policy "team_members_update_owner" on team_members
  for update to authenticated using (
    exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );

-- 매니저는 일반 팀원(role='member') 행만 수정할 수 있고, role을 owner로 바꿀 수는 없다
-- (owner/다른 매니저 행 보호 + 소유권 이전 방지).
drop policy if exists "team_members_update_manager" on team_members;
create policy "team_members_update_manager" on team_members
  for update to authenticated using (
    team_members.role = 'member'
    and exists (
      select 1 from team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role = 'manager'
    )
  ) with check (role in ('member', 'manager'));

-- 본인은 자기 팀 멤버십 행을 수정할 수 있다(포지션/등번호 자기 관리용).
-- 실제로 어떤 컬럼까지 바꿀 수 있는지는 아래 트리거가 최종 판단한다(본인은 positions/jersey_number만).
drop policy if exists "team_members_update_self" on team_members;
create policy "team_members_update_self" on team_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 컬럼별 편집 권한 강제: RLS는 "행"만 제어하므로, 어떤 "컬럼"을 바꿀 수 있는지는 트리거로 막는다.
--   * 감독(팀 owner): 자기 팀 모든 행의 모든 컬럼 수정 가능.
--   * 매니저: role='member' 행의 스탯까지 수정 가능(명단관리 페이지와 동일 규칙).
--   * 그 외(=본인이 자기 행 수정): positions/jersey_number만 변경 가능. goals/assists/mom/role/status 등은 거부.
create or replace function public.enforce_team_member_update()
returns trigger as $$
declare
  is_owner boolean;
  is_manager boolean;
  can_edit_stats boolean;
begin
  select exists (
    select 1 from teams t where t.id = new.team_id and t.owner_id = auth.uid()
  ) into is_owner;

  select exists (
    select 1 from team_members tm
    where tm.team_id = new.team_id and tm.user_id = auth.uid()
      and tm.status = 'approved' and tm.role = 'manager'
  ) into is_manager;

  -- 명단관리의 canEditStats와 동일: owner는 전부, manager는 일반 팀원(member) 행만.
  can_edit_stats := is_owner or (is_manager and old.role = 'member');

  if can_edit_stats then
    return new;
  end if;

  -- 스탯 편집 권한이 없으면(=본인 자기 행) positions/jersey_number 외 변경은 막는다.
  if new.goals is distinct from old.goals
     or new.assists is distinct from old.assists
     or new.mom is distinct from old.mom
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.team_id is distinct from old.team_id
     or new.user_id is distinct from old.user_id then
    raise exception '본인은 포지션과 등번호만 수정할 수 있습니다.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_team_member_update on team_members;
create trigger on_team_member_update
  before update on team_members
  for each row execute procedure public.enforce_team_member_update();

-- 본인 가입신청 취소, 팀장의 신청 거절/명단 제명, 매니저의 일반 팀원 제명(추방)을 허용한다.
-- 매니저는 role='member' 행만 제명할 수 있다(owner/다른 매니저는 제명 불가).
drop policy if exists "team_members_delete_self_or_owner" on team_members;
create policy "team_members_delete_self_or_owner" on team_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
    or (
      team_members.role = 'member'
      and exists (
        select 1 from team_members tm
        where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
          and tm.status = 'approved' and tm.role = 'manager'
      )
    )
  );

-- 일정(이벤트) 관리. 시간/내용은 owner·manager만 만들고 고칠 수 있고,
-- 참여 여부(event_participants)는 팀원 누구나 본인 것만 넣고 뺄 수 있다.
-- opponent_name이 있으면 "경기"(대시보드 다가오는 경기/지난 경기 카드 대상), 없으면 일반 일정으로 취급한다.
-- our_score/opponent_score/match_notes는 경기가 끝난 뒤 owner·manager가 채워 넣는 결과 기록이다.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  opponent_name text,
  our_score int,
  opponent_score int,
  match_notes text
);

alter table events add column if not exists opponent_name text;
alter table events add column if not exists our_score int;
alter table events add column if not exists opponent_score int;
alter table events add column if not exists match_notes text;

-- 일정 유형: 'match'(경기) | 'training'(훈련) | 'etc'(기타). 등록 시 선택한다.
-- 경기 여부의 "진실의 원천"을 opponent_name 유무가 아니라 이 컬럼으로 삼는다(isMatch가 이 값을 본다).
do $$ begin
  create type event_type as enum ('match', 'training', 'etc');
exception
  when duplicate_object then null;
end $$;

alter table events add column if not exists event_type event_type not null default 'etc';

-- 기존 데이터 보정: event_type 컬럼이 없던 시절의 경기(상대팀명이 실제로 있는 행)를 'match'로 올린다.
-- 기본값('etc')인 행만 건드려 사용자가 이후 직접 바꾼 값은 보존한다. 공백뿐인 상대팀명은 경기로 보지 않는다.
update events set event_type = 'match'
  where nullif(btrim(opponent_name), '') is not null and event_type = 'etc';

-- 경기(match)는 반드시 상대팀명이 있어야 한다(대시보드/기록 카드가 "vs {opponent_name}"를 전제).
-- 비경기(training/etc)로 바꾸면 앱에서 opponent_name/스코어/메모를 null로 정리하므로 이 제약과 충돌하지 않는다.
-- null뿐 아니라 공백뿐인 값도 막아 "vs " 빈 표시를 방지한다.
alter table events drop constraint if exists events_match_needs_opponent;
alter table events add constraint events_match_needs_opponent
  check (event_type <> 'match' or nullif(btrim(opponent_name), '') is not null);

-- 참석/불참만 행으로 저장한다. 응답 자체가 없으면(row 없음) "미정"으로 취급한다
-- (대시보드에서 승인 팀원 수 - attending - declined로 계산).
do $$ begin
  create type participation_status as enum ('attending', 'declined');
exception
  when duplicate_object then null;
end $$;

create table if not exists event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status participation_status not null default 'attending',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table event_participants add column if not exists status participation_status not null default 'attending';

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

-- 참석 <-> 불참 전환(status 변경)을 위해 본인 행 수정을 허용한다.
drop policy if exists "event_participants_update_self" on event_participants;
create policy "event_participants_update_self" on event_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- 명단관리(선수)
-- 선수는 앱 로그인 계정과 별개다 — 팀장/매니저가 등번호·포지션 등을 관리하는 명단 항목.
-- 조회는 팀의 승인된 멤버 전원, 등록/수정/삭제는 owner·manager만 가능.
-- =====================================================================
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  jersey_number int,               -- 등번호(선택). 팀 내 중복은 앱단에서만 안내하고 DB 제약은 두지 않는다.
  position text,                   -- 'GK' | 'DF' | 'MF' | 'FW' 중 하나(선택)
  phone text,                      -- 연락처(선택)
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table players enable row level security;

drop policy if exists "players_select_team_members" on players;
create policy "players_select_team_members" on players
  for select to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = players.team_id and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

drop policy if exists "players_insert_owner_manager" on players;
create policy "players_insert_owner_manager" on players
  for insert to authenticated with check (
    exists (
      select 1 from team_members tm
      where tm.team_id = players.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

drop policy if exists "players_update_owner_manager" on players;
create policy "players_update_owner_manager" on players
  for update to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = players.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

drop policy if exists "players_delete_owner_manager" on players;
create policy "players_delete_owner_manager" on players
  for delete to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = players.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

-- =====================================================================
-- 투표관리
-- polls(투표) 1개는 poll_options(보기) 여러 개를 가지며, 한 사용자는 투표당 1표(단일 선택).
-- 생성/수정/삭제는 owner·manager, 응답(poll_votes)은 승인된 멤버 누구나 본인 것만.
-- =====================================================================
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  question text not null,
  closes_at timestamptz,           -- 마감 시각(선택). null이면 상시 열림.
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  sort_order int not null default 0 -- 보기 노출 순서
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)        -- 투표당 1인 1표 보장
);

alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

-- polls: 승인된 팀 멤버만 조회.
drop policy if exists "polls_select_team_members" on polls;
create policy "polls_select_team_members" on polls
  for select to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = polls.team_id and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

drop policy if exists "polls_insert_owner_manager" on polls;
create policy "polls_insert_owner_manager" on polls
  for insert to authenticated with check (
    exists (
      select 1 from team_members tm
      where tm.team_id = polls.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

drop policy if exists "polls_update_owner_manager" on polls;
create policy "polls_update_owner_manager" on polls
  for update to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = polls.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

drop policy if exists "polls_delete_owner_manager" on polls;
create policy "polls_delete_owner_manager" on polls
  for delete to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = polls.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

-- poll_options: 조회/생성/수정/삭제 권한은 상위 poll의 team 기준으로 판단한다.
drop policy if exists "poll_options_select_team_members" on poll_options;
create policy "poll_options_select_team_members" on poll_options
  for select to authenticated using (
    exists (
      select 1 from polls p
      join team_members tm on tm.team_id = p.team_id
      where p.id = poll_options.poll_id
        and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

drop policy if exists "poll_options_write_owner_manager" on poll_options;
create policy "poll_options_write_owner_manager" on poll_options
  for all to authenticated using (
    exists (
      select 1 from polls p
      join team_members tm on tm.team_id = p.team_id
      where p.id = poll_options.poll_id
        and tm.user_id = auth.uid() and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  ) with check (
    exists (
      select 1 from polls p
      join team_members tm on tm.team_id = p.team_id
      where p.id = poll_options.poll_id
        and tm.user_id = auth.uid() and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

-- poll_votes: 집계를 위해 승인된 멤버는 팀 내 모든 표를 조회할 수 있고, 쓰기는 본인 표만.
drop policy if exists "poll_votes_select_team_members" on poll_votes;
create policy "poll_votes_select_team_members" on poll_votes
  for select to authenticated using (
    exists (
      select 1 from polls p
      join team_members tm on tm.team_id = p.team_id
      where p.id = poll_votes.poll_id
        and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

-- 본인 명의로만, 그리고 그 팀의 승인된 멤버여야 투표 가능.
drop policy if exists "poll_votes_insert_self" on poll_votes;
create policy "poll_votes_insert_self" on poll_votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from polls p
      join team_members tm on tm.team_id = p.team_id
      where p.id = poll_votes.poll_id
        and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

-- 투표 변경(다른 보기로) 시 기존 표를 지우고 다시 넣으므로 본인 표 삭제를 허용한다.
drop policy if exists "poll_votes_delete_self" on poll_votes;
create policy "poll_votes_delete_self" on poll_votes
  for delete to authenticated using (user_id = auth.uid());

-- =====================================================================
-- 사진첩(갤러리)
-- 실제 파일은 Supabase Storage의 'gallery' 버킷에 저장하고, 이 테이블은 메타데이터만 보관한다.
-- 조회/업로드는 승인된 멤버 전원, 삭제는 올린 사람 또는 owner·manager.
-- =====================================================================
create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  storage_path text not null,      -- 'gallery' 버킷 내 경로: '{team_id}/{uuid}.{ext}'
  media_type text not null,        -- 'image' | 'video'
  caption text,                    -- 설명(선택)
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table gallery_items enable row level security;

drop policy if exists "gallery_items_select_team_members" on gallery_items;
create policy "gallery_items_select_team_members" on gallery_items
  for select to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = gallery_items.team_id and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

drop policy if exists "gallery_items_insert_self" on gallery_items;
create policy "gallery_items_insert_self" on gallery_items
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from team_members tm
      where tm.team_id = gallery_items.team_id and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

drop policy if exists "gallery_items_delete_own_or_manager" on gallery_items;
create policy "gallery_items_delete_own_or_manager" on gallery_items
  for delete to authenticated using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from team_members tm
      where tm.team_id = gallery_items.team_id and tm.user_id = auth.uid()
        and tm.status = 'approved' and tm.role in ('owner', 'manager')
    )
  );

-- --- Storage 버킷 & 정책 -------------------------------------------------
-- 'gallery' 버킷을 만든다. public = true라 파일 URL을 아는 사람은 볼 수 있다(공개 읽기).
-- 소규모 팀 사진첩 기준의 단순화된 선택이며, 업로드/삭제 자체는 아래 정책으로 제한한다.
-- 완전 비공개가 필요하면 public을 false로 바꾸고 앱에서 서명 URL(createSignedUrl)로 전환해야 한다.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- 업로드: 경로 첫 폴더(team_id)의 승인된 멤버만 파일을 올릴 수 있다.
drop policy if exists "gallery_storage_upload_team_members" on storage.objects;
create policy "gallery_storage_upload_team_members" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'gallery'
    and exists (
      select 1 from team_members tm
      where tm.team_id = ((storage.foldername(name))[1])::uuid
        and tm.user_id = auth.uid() and tm.status = 'approved'
    )
  );

-- 삭제: 올린 사람(owner 컬럼) 또는 해당 팀의 owner·manager.
drop policy if exists "gallery_storage_delete_own_or_manager" on storage.objects;
create policy "gallery_storage_delete_own_or_manager" on storage.objects
  for delete to authenticated using (
    bucket_id = 'gallery'
    and (
      owner = auth.uid()
      or exists (
        select 1 from team_members tm
        where tm.team_id = ((storage.foldername(name))[1])::uuid
          and tm.user_id = auth.uid() and tm.status = 'approved' and tm.role in ('owner', 'manager')
      )
    )
  );

-- 테이블/제약조건 변경 후 PostgREST 스키마 캐시를 즉시 갱신한다
-- (안 하면 새 컬럼/관계가 반영되기까지 캐시가 자동 갱신될 때까지 기다려야 할 수 있다).
-- =====================================================================
-- 회비 관리 team_monthly_pay
-- 팀별 승인 멤버와 월 조합을 1행으로 고정해 월별 금액 히스토리와 납부 상태를 함께 보존한다.
-- =====================================================================
-- FK/unique/check는 아래 do $$ 블록에서만 추가한다(테이블 정의에 인라인으로 넣으면 바로 아래
-- do 블록의 add constraint가 같은 이름과 최초 실행부터 충돌한다 — 실제로 겪은 버그).
create table if not exists team_monthly_pay (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  user_id uuid not null,
  year_month date not null,
  amount int not null,
  due_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table team_monthly_pay add column if not exists team_id uuid;
alter table team_monthly_pay add column if not exists user_id uuid;
alter table team_monthly_pay add column if not exists year_month date;
alter table team_monthly_pay add column if not exists amount int;
alter table team_monthly_pay add column if not exists due_date date;
alter table team_monthly_pay add column if not exists paid boolean not null default false;
alter table team_monthly_pay add column if not exists paid_at timestamptz;
alter table team_monthly_pay add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table team_monthly_pay
    add constraint team_monthly_pay_team_id_fkey
    foreign key (team_id) references teams(id) on delete cascade;
exception when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table team_monthly_pay
    add constraint team_monthly_pay_user_id_profiles_fkey
    foreign key (user_id) references profiles(id) on delete cascade;
exception when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table team_monthly_pay
    add constraint team_monthly_pay_team_user_month_key
    unique (team_id, user_id, year_month);
exception when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table team_monthly_pay
    add constraint team_monthly_pay_amount_nonnegative
    check (amount >= 0);
exception when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table team_monthly_pay
    add constraint team_monthly_pay_year_month_first_day
    check (year_month = date_trunc('month', year_month)::date);
exception when duplicate_object or duplicate_table then null;
end $$;

create index if not exists team_monthly_pay_team_month_idx
  on team_monthly_pay (team_id, year_month);

alter table team_monthly_pay enable row level security;

-- 조회: 회비 현황은 같은 팀의 승인된 멤버에게 투명하게 보여준다.
drop policy if exists "team_monthly_pay_select_team_members" on team_monthly_pay;
create policy "team_monthly_pay_select_team_members" on team_monthly_pay
  for select to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_monthly_pay.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
    )
  );

-- 생성: 월별 회비 행은 팀 운영 권한이 있는 owner/manager만 만들 수 있다.
drop policy if exists "team_monthly_pay_insert_owner_manager" on team_monthly_pay;
create policy "team_monthly_pay_insert_owner_manager" on team_monthly_pay
  for insert to authenticated with check (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_monthly_pay.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
    and exists (
      select 1 from team_members target_tm
      where target_tm.team_id = team_monthly_pay.team_id
        and target_tm.user_id = team_monthly_pay.user_id
        and target_tm.status = 'approved'
    )
  );

-- 수정: 납부 토글과 월 금액/마감일 변경 모두 운영 권한으로 제한한다.
drop policy if exists "team_monthly_pay_update_owner_manager" on team_monthly_pay;
create policy "team_monthly_pay_update_owner_manager" on team_monthly_pay
  for update to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_monthly_pay.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
  ) with check (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_monthly_pay.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
    and exists (
      select 1 from team_members target_tm
      where target_tm.team_id = team_monthly_pay.team_id
        and target_tm.user_id = team_monthly_pay.user_id
        and target_tm.status = 'approved'
    )
  );

-- 삭제: 잘못 만든 월 회비 행을 정리하는 작업도 운영 권한으로 제한한다.
drop policy if exists "team_monthly_pay_delete_owner_manager" on team_monthly_pay;
create policy "team_monthly_pay_delete_owner_manager" on team_monthly_pay
  for delete to authenticated using (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_monthly_pay.team_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
  );

notify pgrst, 'reload schema';

-- =====================================================================
-- 회칙(팀 규정) team_policy
-- 팀별로 여러 개 등록 가능. 조회는 승인된 팀원 전원, 생성/수정/삭제는 감독(owner)만.
-- 카드 형식으로 최신순 표시하므로 created_at 기준 정렬한다. 수정 시각은 updated_at으로 따로 관리한다.
-- =====================================================================
create table if not exists team_policy (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text,                      -- 제목(선택). 카드 헤더에 쓴다.
  content text not null,           -- 회칙 본문(줄바꿈 보존해 표시)
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at을 UPDATE 시 자동 갱신하는 공용 트리거 함수.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_team_policy_updated on team_policy;
create trigger on_team_policy_updated
  before update on team_policy
  for each row execute procedure public.set_updated_at();

alter table team_policy enable row level security;

-- 조회: 승인된 팀원 전원. (재귀 방지용 security definer 헬퍼 재사용)
drop policy if exists "team_policy_select_team_members" on team_policy;
create policy "team_policy_select_team_members" on team_policy
  for select to authenticated using (
    public.is_approved_team_member(team_policy.team_id, auth.uid())
  );

-- 생성/수정/삭제: 감독(팀 owner)만.
drop policy if exists "team_policy_insert_owner" on team_policy;
create policy "team_policy_insert_owner" on team_policy
  for insert to authenticated with check (
    exists (select 1 from teams t where t.id = team_policy.team_id and t.owner_id = auth.uid())
  );

drop policy if exists "team_policy_update_owner" on team_policy;
create policy "team_policy_update_owner" on team_policy
  for update to authenticated using (
    exists (select 1 from teams t where t.id = team_policy.team_id and t.owner_id = auth.uid())
  );

drop policy if exists "team_policy_delete_owner" on team_policy;
create policy "team_policy_delete_owner" on team_policy
  for delete to authenticated using (
    exists (select 1 from teams t where t.id = team_policy.team_id and t.owner_id = auth.uid())
  );

-- =====================================================================
-- 경기 기록
-- 경기별 참여자의 골/어시스트와 MOM 투표는 시즌 누적(team_members.goals/assists/mom)과 분리해 저장한다.
-- =====================================================================
-- primary key는 인라인으로만 둔다 — do $$ 블록으로 따로 add constraint pkey를 하면 재실행 시
-- "multiple primary keys"(42P16) 에러가 나는데, 이건 duplicate_object/duplicate_table로 못 잡는다
-- (실제로 겪은 버그. unique/FK/check와 달리 primary key는 무조건 인라인으로만 선언한다).
create table if not exists event_player_stats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  user_id uuid not null,
  goals int not null default 0,
  assists int not null default 0,
  created_at timestamptz not null default now()
);

alter table event_player_stats add column if not exists event_id uuid not null;
alter table event_player_stats add column if not exists user_id uuid not null;
alter table event_player_stats add column if not exists goals int not null default 0;
alter table event_player_stats add column if not exists assists int not null default 0;
alter table event_player_stats add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table event_player_stats
    add constraint event_player_stats_event_id_fkey
    foreign key (event_id) references events(id) on delete cascade;
exception
  when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table event_player_stats
    add constraint event_player_stats_user_id_profiles_fkey
    foreign key (user_id) references profiles(id) on delete cascade;
exception
  when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table event_player_stats
    add constraint event_player_stats_event_id_user_id_key unique (event_id, user_id);
exception
  when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table event_player_stats
    add constraint event_player_stats_goals_nonnegative check (goals >= 0);
exception
  when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table event_player_stats
    add constraint event_player_stats_assists_nonnegative check (assists >= 0);
exception
  when duplicate_object or duplicate_table then null;
end $$;

create table if not exists event_mom_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  voter_user_id uuid not null,
  voted_for_user_id uuid not null,
  created_at timestamptz not null default now()
);

alter table event_mom_votes add column if not exists event_id uuid not null;
alter table event_mom_votes add column if not exists voter_user_id uuid not null;
alter table event_mom_votes add column if not exists voted_for_user_id uuid not null;
alter table event_mom_votes add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table event_mom_votes
    add constraint event_mom_votes_event_id_fkey
    foreign key (event_id) references events(id) on delete cascade;
exception
  when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table event_mom_votes
    add constraint event_mom_votes_voter_user_id_profiles_fkey
    foreign key (voter_user_id) references profiles(id) on delete cascade;
exception
  when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table event_mom_votes
    add constraint event_mom_votes_voted_for_user_id_profiles_fkey
    foreign key (voted_for_user_id) references profiles(id) on delete cascade;
exception
  when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  alter table event_mom_votes
    add constraint event_mom_votes_event_id_voter_user_id_key unique (event_id, voter_user_id);
exception
  when duplicate_object or duplicate_table then null;
end $$;

alter table event_player_stats enable row level security;
alter table event_mom_votes enable row level security;

-- 조회: 경기의 팀에 승인된 멤버라면 경기별 스탯을 모두 볼 수 있어야 카드 집계가 투명하다.
drop policy if exists "event_player_stats_select_team_members" on event_player_stats;
create policy "event_player_stats_select_team_members" on event_player_stats
  for select to authenticated using (
    exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_player_stats.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
    )
  );

-- 작성/수정/삭제: 경기 결과 입력과 같은 운영 작업이라 owner·manager에게만 허용한다.
drop policy if exists "event_player_stats_insert_owner_manager" on event_player_stats;
create policy "event_player_stats_insert_owner_manager" on event_player_stats
  for insert to authenticated with check (
    exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_player_stats.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
    and exists (
      select 1 from event_participants ep
      where ep.event_id = event_player_stats.event_id
        and ep.user_id = event_player_stats.user_id
        and ep.status = 'attending'
    )
  );

drop policy if exists "event_player_stats_update_owner_manager" on event_player_stats;
create policy "event_player_stats_update_owner_manager" on event_player_stats
  for update to authenticated using (
    exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_player_stats.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
  ) with check (
    exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_player_stats.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
    and exists (
      select 1 from event_participants ep
      where ep.event_id = event_player_stats.event_id
        and ep.user_id = event_player_stats.user_id
        and ep.status = 'attending'
    )
  );

drop policy if exists "event_player_stats_delete_owner_manager" on event_player_stats;
create policy "event_player_stats_delete_owner_manager" on event_player_stats
  for delete to authenticated using (
    exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_player_stats.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and tm.role in ('owner', 'manager')
    )
  );

-- 조회: MOM 득표 현황은 poll_votes처럼 팀 승인 멤버에게 공개한다.
drop policy if exists "event_mom_votes_select_team_members" on event_mom_votes;
create policy "event_mom_votes_select_team_members" on event_mom_votes
  for select to authenticated using (
    exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_mom_votes.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
    )
  );

-- 투표 작성: 본인 표만, 실제 참석자끼리만, 경기 당일 KST 자정 전까지만 허용한다.
drop policy if exists "event_mom_votes_insert_self_attending_before_close" on event_mom_votes;
create policy "event_mom_votes_insert_self_attending_before_close" on event_mom_votes
  for insert to authenticated with check (
    voter_user_id = auth.uid()
    and exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_mom_votes.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and now() < (date_trunc('day', e.starts_at at time zone 'Asia/Seoul') + interval '1 day') at time zone 'Asia/Seoul'
    )
    and exists (
      select 1 from event_participants ep
      where ep.event_id = event_mom_votes.event_id
        and ep.user_id = event_mom_votes.voter_user_id
        and ep.status = 'attending'
    )
    and exists (
      select 1 from event_participants ep
      where ep.event_id = event_mom_votes.event_id
        and ep.user_id = event_mom_votes.voted_for_user_id
        and ep.status = 'attending'
    )
  );

drop policy if exists "event_mom_votes_update_self_attending_before_close" on event_mom_votes;
create policy "event_mom_votes_update_self_attending_before_close" on event_mom_votes
  for update to authenticated using (
    voter_user_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = event_mom_votes.event_id
        and now() < (date_trunc('day', e.starts_at at time zone 'Asia/Seoul') + interval '1 day') at time zone 'Asia/Seoul'
    )
  ) with check (
    voter_user_id = auth.uid()
    and exists (
      select 1 from events e
      join team_members tm on tm.team_id = e.team_id
      where e.id = event_mom_votes.event_id
        and tm.user_id = auth.uid()
        and tm.status = 'approved'
        and now() < (date_trunc('day', e.starts_at at time zone 'Asia/Seoul') + interval '1 day') at time zone 'Asia/Seoul'
    )
    and exists (
      select 1 from event_participants ep
      where ep.event_id = event_mom_votes.event_id
        and ep.user_id = event_mom_votes.voter_user_id
        and ep.status = 'attending'
    )
    and exists (
      select 1 from event_participants ep
      where ep.event_id = event_mom_votes.event_id
        and ep.user_id = event_mom_votes.voted_for_user_id
        and ep.status = 'attending'
    )
  );

drop policy if exists "event_mom_votes_delete_self_before_close" on event_mom_votes;
create policy "event_mom_votes_delete_self_before_close" on event_mom_votes
  for delete to authenticated using (
    voter_user_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = event_mom_votes.event_id
        and now() < (date_trunc('day', e.starts_at at time zone 'Asia/Seoul') + interval '1 day') at time zone 'Asia/Seoul'
    )
  );

-- 위쪽 notify는 team_policy 블록이 추가되기 전 위치라 team_policy까지는 못 덮는다.
-- 파일 실행이 끝나는 진짜 마지막 지점에서 한 번 더 캐시를 갱신한다.
notify pgrst, 'reload schema';
