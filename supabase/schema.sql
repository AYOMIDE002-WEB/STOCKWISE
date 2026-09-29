-- =========================================================
-- Stockwise Database Schema (Supabase / PostgreSQL)
-- =========================================================
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

-- ---------------------------------------------------------
-- Profiles table: extends Supabase's built-in auth.users
-- with app-specific fields (full name, role)
-- ---------------------------------------------------------
create table if not exists profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    full_name text not null,
    role text not null default 'Staff' check (role in ('Admin', 'Staff')),
    created_at timestamptz default now()
);

-- Automatically create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'Staff');
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure handle_new_user();

-- ---------------------------------------------------------
-- Products table
-- ---------------------------------------------------------
create table if not exists products (
    id uuid default gen_random_uuid() primary key,
    product_name text not null,
    category text,
    quantity_in_stock integer not null default 0,
    unit_price numeric(12,2) not null,
    created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Customers table
-- ---------------------------------------------------------
create table if not exists customers (
    id uuid default gen_random_uuid() primary key,
    customer_name text not null,
    phone_number text,
    address text,
    created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Sales table: one row per TRANSACTION (the "receipt" header).
-- Individual products purchased in that transaction live in
-- sale_items below - this lets one sale contain many products.
-- ---------------------------------------------------------
create table if not exists sales (
    id uuid default gen_random_uuid() primary key,
    customer_id uuid references customers(id),
    total_amount numeric(12,2) not null,
    sale_date timestamptz default now(),
    synced_offline boolean default false,
    created_by uuid references auth.users(id)
);

-- ---------------------------------------------------------
-- Sale items: one row per product within a sale/transaction
-- ---------------------------------------------------------
create table if not exists sale_items (
    id uuid default gen_random_uuid() primary key,
    sale_id uuid references sales(id) on delete cascade not null,
    product_id uuid references products(id) not null,
    quantity integer not null,
    unit_price numeric(12,2) not null,
    subtotal numeric(12,2) not null
);

-- ---------------------------------------------------------
-- Invoices table (generated per sale)
-- ---------------------------------------------------------
create table if not exists invoices (
    id uuid default gen_random_uuid() primary key,
    sale_id uuid references sales(id) on delete cascade,
    invoice_number text unique not null,
    issued_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Row Level Security: only authenticated users can read/write
-- ---------------------------------------------------------
alter table profiles enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table invoices enable row level security;

-- Profiles: users can read all profiles, but only Admins can edit others
create policy "Profiles are viewable by authenticated users" on profiles
    for select using (auth.role() = 'authenticated');
create policy "Users can update their own profile" on profiles
    for update using (auth.uid() = id);

-- Products: any authenticated user can view; only Admins can insert/update/delete
create policy "Products viewable by authenticated users" on products
    for select using (auth.role() = 'authenticated');
create policy "Only Admins can modify products" on products
    for all using (
        exists (select 1 from profiles where id = auth.uid() and role = 'Admin')
    );

-- Customers: any authenticated user can view, add, and edit
create policy "Customers viewable by authenticated users" on customers
    for select using (auth.role() = 'authenticated');
create policy "Authenticated users can add/edit customers" on customers
    for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update customers" on customers
    for update using (auth.role() = 'authenticated');

-- Sales: any authenticated user can view and add
create policy "Sales viewable by authenticated users" on sales
    for select using (auth.role() = 'authenticated');
create policy "Authenticated users can record sales" on sales
    for insert with check (auth.role() = 'authenticated');

-- Sale items: any authenticated user can view and add
create policy "Sale items viewable by authenticated users" on sale_items
    for select using (auth.role() = 'authenticated');
create policy "Authenticated users can add sale items" on sale_items
    for insert with check (auth.role() = 'authenticated');

-- Invoices: any authenticated user can view and create
create policy "Invoices viewable by authenticated users" on invoices
    for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create invoices" on invoices
    for insert with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- record_sale_cart(): atomic, safe way to record a sale that may
-- contain MULTIPLE products (a real shopping cart). Runs as
-- security definer so Staff (who cannot directly modify the
-- products table per RLS) can still record a sale. Validates
-- stock for every item, then inserts one sale header row plus
-- one sale_items row per product, and decrements stock for each
-- - all inside a single transaction, so it's all-or-nothing.
--
-- p_items shape: a JSON array like
--   [{"product_id": "...", "quantity": 2}, {"product_id": "...", "quantity": 1}]
-- ---------------------------------------------------------
create or replace function record_sale_cart(
    p_customer_id uuid,
    p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_item jsonb;
    v_product_id uuid;
    v_quantity integer;
    v_unit_price numeric(12,2);
    v_stock integer;
    v_subtotal numeric(12,2);
    v_grand_total numeric(12,2) := 0;
    v_sale_id uuid;
begin
    if p_items is null or jsonb_array_length(p_items) = 0 then
        raise exception 'A sale must contain at least one item';
    end if;

    -- First pass: validate every item BEFORE writing anything,
    -- so a problem with item #3 doesn't leave items #1-2 half-recorded.
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := (v_item->>'quantity')::integer;

        if v_quantity <= 0 then
            raise exception 'Quantity must be greater than zero for every item';
        end if;

        select unit_price, quantity_in_stock into v_unit_price, v_stock
        from products where id = v_product_id
        for update;

        if v_unit_price is null then
            raise exception 'Product not found: %', v_product_id;
        end if;

        if v_quantity > v_stock then
            raise exception 'Insufficient stock for product %: only % units available', v_product_id, v_stock;
        end if;

        v_grand_total := v_grand_total + (v_unit_price * v_quantity);
    end loop;

    -- Second pass: everything validated, now actually record it
    insert into sales (customer_id, total_amount, created_by)
    values (p_customer_id, v_grand_total, auth.uid())
    returning id into v_sale_id;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := (v_item->>'quantity')::integer;

        select unit_price into v_unit_price from products where id = v_product_id;
        v_subtotal := v_unit_price * v_quantity;

        insert into sale_items (sale_id, product_id, quantity, unit_price, subtotal)
        values (v_sale_id, v_product_id, v_quantity, v_unit_price, v_subtotal);

        update products set quantity_in_stock = quantity_in_stock - v_quantity
        where id = v_product_id;
    end loop;

    return v_sale_id;
end;
$$;

grant execute on function record_sale_cart(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------
-- Sample seed data (optional - remove before production use)
-- ---------------------------------------------------------
insert into products (product_name, category, quantity_in_stock, unit_price) values
('Bag of Rice (50kg)', 'Groceries', 18, 32500.00),
('Cooking Oil (5L)', 'Groceries', 7, 7500.00),
('Detergent (1kg)', 'Household', 4, 1500.00),
('Bottled Water (Carton)', 'Beverages', 32, 1500.00)
on conflict do nothing;

insert into customers (customer_name, phone_number, address) values
('Chidinma Eze', '0803 555 1234', '14 Adeola Street, Lagos'),
('Tunde Bakare', '0806 222 9087', '5 Market Road, Lagos')
on conflict do nothing;
