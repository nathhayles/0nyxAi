create table subscriptions (

id uuid primary key default gen_random_uuid(),

user_id uuid references users_profile(id),

plan text,

status text,

current_period_end timestamp,

created_at timestamp default now()

);
