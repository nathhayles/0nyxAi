create table reels (

id uuid primary key default gen_random_uuid(),

project_id uuid references projects(id),

user_id uuid references users_profile(id),

credits_used integer,

status text,

created_at timestamp default now()

);
