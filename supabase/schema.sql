-- Chạy toàn bộ file này trong Supabase Dashboard → SQL Editor → New query → Run.
-- Email owner đã điền sẵn: athannguyenk.network@gmail.com — đây là email được
-- tự động cấp quyền chủ sở hữu và tự động approved, không cần ai duyệt.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  approved boolean not null default false,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Tự tạo 1 dòng profiles mỗi khi có người đăng ký mới.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, approved, is_owner)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.email = 'athannguyenk.network@gmail.com',  -- owner tự động approved luôn
    new.email = 'athannguyenk.network@gmail.com'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper function kiểm tra owner, tránh lỗi "infinite recursion" khi viết policy.
create or replace function public.is_owner(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_owner from public.profiles where id = uid), false);
$$;

-- Mỗi người tự đọc được dòng của chính mình.
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Owner đọc được toàn bộ danh sách (để duyệt).
create policy "profiles_select_owner"
on public.profiles for select
to authenticated
using (public.is_owner(auth.uid()));

-- Chỉ owner được sửa (dùng để bấm "Duyệt" -> approved = true).
create policy "profiles_update_owner"
on public.profiles for update
to authenticated
using (public.is_owner(auth.uid()))
with check (public.is_owner(auth.uid()));

-- Không có policy insert/delete cho "authenticated" -> chỉ trigger phía trên
-- (chạy với quyền security definer) mới tạo được dòng mới. Không ai tự thêm
-- hay xoá thẳng vào bảng profiles được.
