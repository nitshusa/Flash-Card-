-- ==========================================
-- SUPABASE SCHEMA FOR FLASH CARD STUDIO
-- ==========================================

-- Enable extensions if not already present
create extension if not exists "uuid-ossp";

-- 1. Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  theme text default 'light' check (theme in ('light', 'dark')),
  accent_color text default '#6366f1',
  auto_delete_trash_days integer default 30,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create categories table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text not null,
  icon text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create flash_cards table
create table public.flash_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  question text not null,
  answer text not null,
  category_id uuid references public.categories(id) on delete set null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  color text not null default '#ffffff',
  notes text default '',
  tags text[] default '{}'::text[],
  favorite boolean default false,
  status text not null default 'active' check (status in ('active', 'archived', 'trash')),
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create study_history table
create table public.study_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  card_id uuid references public.flash_cards(id) on delete cascade not null,
  rating text not null check (rating in ('correct', 'incorrect')),
  duration integer default 0 not null, -- duration in milliseconds
  timestamp timestamp with time zone default timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.flash_cards enable row level security;
alter table public.study_history enable row level security;

-- ==========================================
-- POLICIES
-- ==========================================

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Categories policies
create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Flash Cards policies
create policy "Users can view own flash cards"
  on public.flash_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own flash cards"
  on public.flash_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own flash cards"
  on public.flash_cards for update
  using (auth.uid() = user_id);

create policy "Users can delete own flash cards"
  on public.flash_cards for delete
  using (auth.uid() = user_id);

-- Study History policies
create policy "Users can view own study history"
  on public.study_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own study history"
  on public.study_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own study history"
  on public.study_history for delete
  using (auth.uid() = user_id);


-- ==========================================
-- TRIGGERS FOR PROFILE AUTO-CREATION
-- ==========================================

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, theme, accent_color, auto_delete_trash_days)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'light',
    '#6366f1',
    30
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute after user insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
