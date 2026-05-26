create table users_profile (

id uuid primary key references auth.users(id),

email text,

display_name text,

plan text default 'starter',

created_at timestamp default now()

);
