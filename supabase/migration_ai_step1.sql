-- =========================================================
-- STOCKWISE AI - STEP 1: tables for Away Mode, orders, owner rules
-- =========================================================
-- Run ONCE in the Supabase SQL Editor (after migration_units.sql).
-- Safe to run: it only ADDS new tables. Nothing existing is changed.
-- The public customer chat and the AI will reach these tables through the
-- server (service key), so no public access is opened here.

-- 1. Owner rules: one row that controls how the AI behaves -----------------
create table if not exists shop_rules (
    id int primary key default 1 check (id = 1),
    away_mode boolean not null default false,
    opening_hours text not null default 'Mon-Sat 8am-8pm',
    allow_discounts boolean not null default false,
    max_discount_percent numeric(5,2) not null default 0,
    escalate_order_above numeric(12,2) not null default 50000,
    owner_phone text,
    default_language text not null default 'English',
    updated_at timestamptz not null default now()
);
insert into shop_rules (id) values (1) on conflict do nothing;

-- 2. Orders taken by the assistant (in shop or online) ----------------------
create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references customers(id),
    customer_name text,
    customer_phone text,
    channel text not null default 'in_shop' check (channel in ('in_shop', 'online')),
    status text not null default 'pending'
        check (status in ('pending', 'needs_owner', 'confirmed', 'fulfilled', 'cancelled')),
    total_amount numeric(12,2) not null default 0,
    note text,
    handled_by text not null default 'assistant',
    created_at timestamptz not null default now()
);

create table if not exists order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id) on delete cascade,
    product_id uuid not null references products(id),
    quantity numeric(12,3) not null check (quantity > 0),
    unit_price numeric(12,2) not null,
    subtotal numeric(12,2) not null
);

-- 3. Everything the assistant did or could not do (feeds "while you were away")
create table if not exists assistant_events (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    channel text not null default 'in_shop' check (channel in ('in_shop', 'online')),
    kind text not null check (kind in ('greeting', 'question', 'order', 'escalation', 'unanswered')),
    customer_text text,
    assistant_text text,
    needs_owner boolean not null default false,
    resolved boolean not null default false,
    order_id uuid references orders(id) on delete set null
);

create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists events_created_idx on assistant_events (created_at desc);

-- 4. Security ------------------------------------------------------------
alter table shop_rules enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table assistant_events enable row level security;

create policy "Rules viewable by authenticated users" on shop_rules
    for select using (auth.role() = 'authenticated');
create policy "Only Admins can change rules" on shop_rules
    for update using (
        exists (select 1 from profiles where id = auth.uid() and role = 'Admin')
    );

create policy "Orders viewable by authenticated users" on orders
    for select using (auth.role() = 'authenticated');
create policy "Authenticated users can update orders" on orders
    for update using (auth.role() = 'authenticated');

create policy "Order items viewable by authenticated users" on order_items
    for select using (auth.role() = 'authenticated');

create policy "Events viewable by authenticated users" on assistant_events
    for select using (auth.role() = 'authenticated');
create policy "Authenticated users can resolve events" on assistant_events
    for update using (auth.role() = 'authenticated');
