-- ============================================
-- Duffer Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  anon_username text not null unique,
  is_admin boolean default false,
  is_banned boolean default false,
  created_at timestamptz default now()
);

-- 2. Posts table
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null check (char_length(content) <= 200),
  created_at timestamptz default now()
);

-- 3. Reactions table
create table public.reactions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

-- ============================================
-- Indexes for performance
-- ============================================
create index idx_posts_created_at on public.posts (created_at desc);
create index idx_reactions_post_id on public.reactions (post_id);

-- 4. Comments table (supports 1-level replies)
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(content) <= 150),
  created_at timestamptz default now()
);

create index idx_comments_post_id on public.comments (post_id, created_at);
create index idx_comments_parent_id on public.comments (parent_id);

-- ============================================
-- Row-Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;

-- Users policies
create policy "Users can read all profiles"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id or exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- Posts policies
create policy "Anyone can read posts"
  on public.posts for select
  to authenticated
  using (true);

create policy "Non-banned users can create posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.users where id = auth.uid() and is_banned = true
    )
  );

create policy "Owner or admin can delete post"
  on public.posts for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- Reactions policies
create policy "Anyone can read reactions"
  on public.reactions for select
  to authenticated
  using (true);

create policy "Authenticated users can add reactions"
  on public.reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own reactions"
  on public.reactions for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own reactions"
  on public.reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Comments policies
alter table public.comments enable row level security;

create policy "Anyone can read comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "Non-banned users can create comments"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.users where id = auth.uid() and is_banned = true
    )
  );

create policy "Owner or admin can delete comment"
  on public.comments for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- 5. Messages table (global chat)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz default now()
);

create index idx_messages_created_at on public.messages (created_at desc);

-- Messages policies
alter table public.messages enable row level security;

create policy "Anyone can read messages"
  on public.messages for select
  to authenticated
  using (true);

create policy "Non-banned users can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.users where id = auth.uid() and is_banned = true
    )
  );

create policy "Owner or admin can delete message"
  on public.messages for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- ============================================
-- Enable Realtime
-- ============================================
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.messages;

-- ============================================
-- Make yourself admin (run after first login)
-- Replace YOUR_USER_ID with your actual auth.users id
-- ============================================
-- update public.users set is_admin = true where id = 'YOUR_USER_ID';
