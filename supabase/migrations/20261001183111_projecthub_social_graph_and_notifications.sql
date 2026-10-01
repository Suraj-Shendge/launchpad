create or replace function public.toggle_follow(p_following_type text, p_following_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_following boolean;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_following_type not in ('user','project','category','forum') then raise exception 'Invalid following_type'; end if;
 if p_following_type='user' and p_following_id=v_user then raise exception 'Cannot follow yourself'; end if;
 if p_following_type='user' and not exists(select 1 from public.profiles where id=p_following_id) then raise exception 'USER_NOT_FOUND'; end if;
 if p_following_type='forum' and not exists(select 1 from public.community_forums where id=p_following_id and is_active) then raise exception 'FORUM_NOT_FOUND'; end if;
 if p_following_type='project' and not exists(select 1 from public.projects where id=p_following_id and deleted_at is null) then raise exception 'PROJECT_NOT_FOUND'; end if;
 if p_following_type='category' and not exists(select 1 from public.categories where id=p_following_id) then raise exception 'CATEGORY_NOT_FOUND'; end if;
 if exists(select 1 from public.follows where follower_id=v_user and following_type=p_following_type and following_id=p_following_id) then
   delete from public.follows where follower_id=v_user and following_type=p_following_type and following_id=p_following_id; v_following:=false;
 else
   insert into public.follows(follower_id,following_type,following_id) values(v_user,p_following_type,p_following_id)
   on conflict(follower_id,following_type,following_id) do nothing; v_following:=true;
 end if;
 return v_following;
end; $$;
revoke all on function public.toggle_follow(text,uuid) from public;
grant execute on function public.toggle_follow(text,uuid) to authenticated;

create or replace function public.toggle_project_vote(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_voted boolean:=false; v_count integer:=0;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.projects where id=p_project_id and status='published' and deleted_at is null) then raise exception 'PROJECT_NOT_FOUND'; end if;
 if exists(select 1 from public.project_votes where project_id=p_project_id and user_id=v_user) then
   delete from public.project_votes where project_id=p_project_id and user_id=v_user; v_voted:=false;
 else
   insert into public.project_votes(project_id,user_id) values(p_project_id,v_user) on conflict(project_id,user_id) do nothing; v_voted:=true;
 end if;
 select count(*) into v_count from public.project_votes where project_id=p_project_id;
 return jsonb_build_object('upvoted',v_voted,'upvote_count',v_count);
end; $$;
revoke all on function public.toggle_project_vote(uuid) from public;
grant execute on function public.toggle_project_vote(uuid) to authenticated;
create index if not exists project_votes_user_id_idx on public.project_votes(user_id);
create index if not exists notifications_user_read_created_idx on public.notifications(user_id,read,created_at desc);

create or replace function public.notify_new_follower()
returns trigger language plpgsql security definer set search_path=public as $$
declare follower_name text;
begin
 if new.following_type<>'user' or new.follower_id=new.following_id then return new; end if;
 select coalesce(display_name,username,name,'Someone') into follower_name from public.profiles where id=new.follower_id;
 insert into public.notifications(user_id,type,title,message,link,reference_type,reference_id)
 values(new.following_id,'new_follower','New follower',follower_name||' followed you.',
 '/u/'||coalesce((select username from public.profiles where id=new.follower_id),''),'user',new.follower_id);
 return new;
end; $$;
drop trigger if exists follows_new_follower_notification on public.follows;
create trigger follows_new_follower_notification after insert on public.follows for each row execute function public.notify_new_follower();

create or replace function public.notify_project_upvote()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_owner uuid; v_name text; v_slug text; v_voter text;
begin
 select owner_id,name,slug into v_owner,v_name,v_slug from public.projects where id=new.project_id;
 if v_owner is null or v_owner=new.user_id then return new; end if;
 select coalesce(display_name,username,name,'Someone') into v_voter from public.profiles where id=new.user_id;
 insert into public.notifications(user_id,type,title,message,link,reference_type,reference_id)
 values(v_owner,'project_upvote','New upvote',v_voter||' upvoted '||v_name||'.','/projects/'||v_slug,'project',new.project_id);
 return new;
end; $$;
drop trigger if exists project_vote_notification on public.project_votes;
create trigger project_vote_notification after insert on public.project_votes for each row execute function public.notify_project_upvote();
create or replace function public.notify_project_published()
returns trigger language plpgsql security definer set search_path=public as $$
declare creator_name text;
begin
 if new.status<>'published' or new.deleted_at is not null or (tg_op='UPDATE' and old.status='published') then return new; end if;
 select coalesce(display_name,username,name,'A maker') into creator_name from public.profiles where id=new.owner_id;
 insert into public.notifications(user_id,type,title,message,link,reference_type,reference_id)
 select f.follower_id,'followed_user_project','New project from '||creator_name,
        creator_name||' published '||new.name||'.','/projects/'||new.slug,'project',new.id
 from public.follows f where f.following_type='user' and f.following_id=new.owner_id and f.follower_id<>new.owner_id;
 return new;
end; $$;
drop trigger if exists project_published_notification on public.projects;
create trigger project_published_notification after insert or update of status,deleted_at on public.projects for each row execute function public.notify_project_published();

create or replace function public.notify_community_thread_created()
returns trigger language plpgsql security definer set search_path=public as $$
declare author_name text; forum_name text;
begin
 select coalesce(display_name,username,name,'A maker') into author_name from public.profiles where id=new.user_id;
 select name into forum_name from public.community_forums where id=new.forum_id;
 insert into public.notifications(user_id,type,title,message,link,reference_type,reference_id)
 select r.follower_id,
   case when r.follows_author then 'New discussion from '||author_name else 'New discussion in '||coalesce(forum_name,'Community') end,
   case when r.follows_author then author_name||' started a new discussion.' else 'A new discussion was started in '||coalesce(forum_name,'Community')||'.' end,
   '/community/t/'||new.id,'community_thread',new.id
 from (
   select follower_id,bool_or(follows_author) follows_author from (
     select follower_id,true follows_author from public.follows where following_type='user' and following_id=new.user_id
     union all
     select follower_id,false from public.follows where following_type='forum' and following_id=new.forum_id
   ) s group by follower_id
 ) r where r.follower_id<>new.user_id;
 return new;
end; $$;
drop trigger if exists community_thread_notification on public.community_threads;
create trigger community_thread_notification after insert on public.community_threads for each row execute function public.notify_community_thread_created();
create or replace function public.notify_community_post_created()
returns trigger language plpgsql security definer set search_path=public as $$
declare author_name text;
begin
 select coalesce(display_name,username,name,'A maker') into author_name from public.profiles where id=new.user_id;
 insert into public.notifications(user_id,type,title,message,link,reference_type,reference_id)
 select f.follower_id,'community_reply','New reply from '||author_name,
        author_name||' replied in a community discussion.','/community/t/'||new.thread_id,'community_thread',new.thread_id
 from public.follows f
 where f.following_type='user' and f.following_id=new.user_id and f.follower_id<>new.user_id;
 return new;
end; $$;
drop trigger if exists community_post_notification on public.community_posts;
create trigger community_post_notification after insert on public.community_posts for each row execute function public.notify_community_post_created();
