create table affiliate_rewards (

id uuid primary key default gen_random_uuid(),

referrer_id uuid references users_profile(id),

referred_user uuid references users_profile(id),

credits_awarded integer,

created_at timestamp default now()

);
