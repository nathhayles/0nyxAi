create table referrals (

id uuid primary key default gen_random_uuid(),

referrer_id uuid references users_profile(id),

referred_user uuid references users_profile(id),

created_at timestamp default now()

);
