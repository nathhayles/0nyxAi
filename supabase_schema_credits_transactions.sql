create table credits_transactions (

id uuid primary key default gen_random_uuid(),

user_id uuid references users_profile(id),

amount integer,

type text,

description text,

created_at timestamp default now()

);
