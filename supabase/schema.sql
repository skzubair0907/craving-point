-- EXTENSIONS
create extension if not exists "pgcrypto";

-- User Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  role text check (role in ('customer', 'admin')) default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  image_url text,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Menu Items
create table if not exists menu_items (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  price numeric not null,
  image_url text,
  is_veg boolean default true,
  is_available boolean default true,
  is_bestseller boolean default false,
  is_spicy boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add-ons
create table if not exists addons (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Menu Item to Add-ons mapping
create table if not exists menu_item_addons (
  menu_item_id uuid references menu_items(id) on delete cascade,
  addon_id uuid references addons(id) on delete cascade,
  primary key (menu_item_id, addon_id)
);

-- Orders
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null,
  user_id uuid references profiles(id),
  order_type text check (order_type in ('delivery', 'pickup')) not null,
  status text check (status in ('placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')) default 'placed',
  subtotal numeric not null,
  discount numeric default 0,
  delivery_fee numeric default 0,
  tax numeric default 0,
  total numeric not null,
  delivery_address text,
  landmark text,
  special_instructions text,
  payment_status text check (payment_status in ('pending', 'paid', 'failed')) default 'pending',
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order Items (with price snapshots)
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name_snapshot text not null,
  price_snapshot numeric not null,
  quantity int not null,
  selected_addons jsonb, 
  item_total numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Coupons
create table if not exists coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  discount_type text check (discount_type in ('fixed', 'percentage')) not null,
  discount_value numeric not null,
  min_order_value numeric default 0,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  usage_limit int,
  used_count int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reviews
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  is_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Favorites
create table if not exists favorites (
  user_id uuid references profiles(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete cascade,
  primary key (user_id, menu_item_id)
);

-- Restaurant Settings
create table if not exists restaurant_settings (
  id int primary key default 1,
  name text default 'Craving Point',
  address text,
  phone text,
  email text,
  opening_hours jsonb,
  delivery_available boolean default true,
  pickup_available boolean default true,
  min_order_value numeric default 0,
  delivery_fee numeric default 0,
  tax_percentage numeric default 0,
  payment_settings jsonb,
  social_links jsonb,
  google_maps_url text,
  logo_url text,
  cover_image_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint one_row_only check (id = 1)
);

-- RLS ENABLE
alter table profiles enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table addons enable row level security;
alter table menu_item_addons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table coupons enable row level security;
alter table reviews enable row level security;
alter table favorites enable row level security;
alter table restaurant_settings enable row level security;

-- POLICIES
create policy "Public read categories" on categories for select using (true);
create policy "Public read menu items" on menu_items for select using (true);
create policy "Public read addons" on addons for select using (true);
create policy "Public read menu item addons" on menu_item_addons for select using (true);
create policy "Public read coupons" on coupons for select using (true);
create policy "Public read restaurant settings" on restaurant_settings for select using (true);
create policy "Public read approved reviews" on reviews for select using (is_approved = true);
create policy "Users can read their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Users can read their own orders" on orders for select using (auth.uid() = user_id);
create policy "Users can create their own orders" on orders for insert with check (auth.uid() = user_id);

-- FIX: Corrected the Order Items Policy to use a subquery
create policy "Users can read their own order items" on order_items for select using (
  exists (
    select 1 from orders 
    where orders.id = order_items.order_id 
    and orders.user_id = auth.uid()
  )
);

create policy "Users can create their own order items" on order_items for insert with check (
  exists (
    select 1 from orders 
    where orders.id = order_items.order_id 
    and orders.user_id = auth.uid()
  )
);

create policy "Users can manage their own favorites" on favorites for all using (auth.uid() = user_id);
create policy "Users can create reviews" on reviews for insert with check (auth.uid() = user_id);
create policy "Admins can do everything with categories" on categories for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can do everything with menu items" on menu_items for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can do everything with addons" on addons for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can do everything with menu item addons" on menu_item_addons for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can manage all orders" on orders for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can manage all order items" on order_items for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can manage coupons" on coupons for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can manage reviews" on reviews for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can manage restaurant settings" on restaurant_settings for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
