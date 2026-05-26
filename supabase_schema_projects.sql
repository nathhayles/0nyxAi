create table projects (

id uuid primary key default gen_random_uuid(),

user_id uuid references users_profile(id),

title text,

created_at timestamp default now()

);
