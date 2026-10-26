-- Run in a dedicated project. Never expose the payload through browser credentials.
create table if not exists public.event_state (
 id integer primary key check(id=1), version bigint not null default 0,
 payload jsonb not null
);
alter table public.event_state enable row level security;
revoke all on public.event_state from anon, authenticated;
grant select,insert,update on public.event_state to service_role;
-- No client policies: all ownership checks happen in authenticated server endpoints.
insert into storage.buckets(id,name,public) values ('aida-artifacts','aida-artifacts',false) on conflict do nothing;
-- Team users cannot list/download this bucket directly. Server checks ownership first.
