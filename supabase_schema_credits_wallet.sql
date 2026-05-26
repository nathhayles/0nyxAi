create table credits_wallet (

user_id uuid primary key references users_profile(id),

balance integer default 0,

updated_at timestamp default now()

);
