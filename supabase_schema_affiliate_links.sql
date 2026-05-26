create table affiliate_links (

user_id uuid primary key references users_profile(id),

ref_code text unique,

created_at timestamp default now()

);
