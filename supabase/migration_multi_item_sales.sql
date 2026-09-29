-- =========================================================
-- MIGRATION: Upgrade to multi-item sales (shopping cart)
-- =========================================================
-- Run this ONCE if you already ran the original schema.sql and have
-- an existing Supabase project. It safely restructures your sales
-- table so one sale can contain multiple products, while keeping
-- every sale you've already recorded.
--
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

-- 1. Create the new sale_items table
create table if not exists sale_items (
    id uuid default gen_random_uuid() primary key,
    sale_id uuid references sales(id) on delete cascade not null,
    product_id uuid references products(id) not null,
    quantity integer not null,
    unit_price numeric(12,2) not null,
    subtotal numeric(12,2) not null
);

-- 2. Migrate existing sales rows into sale_items
--    (each old sale becomes a sale with exactly one line item)
insert into sale_items (sale_id, product_id, quantity, unit_price, subtotal)
select id, product_id, quantity_sold,
       case when quantity_sold > 0 then total_amount / quantity_sold else 0 end,
       total_amount
from sales
where product_id is not null
on conflict do nothing;

-- 3. Remove the now-redundant columns from sales
--    (product_id and quantity_sold have moved to sale_items)
alter table sales drop column if exists product_id;
alter table sales drop column if exists quantity_sold;

-- 4. Enable RLS and add policies for the new table
alter table sale_items enable row level security;

drop policy if exists "Sale items viewable by authenticated users" on sale_items;
create policy "Sale items viewable by authenticated users" on sale_items
    for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can add sale items" on sale_items;
create policy "Authenticated users can add sale items" on sale_items
    for insert with check (auth.role() = 'authenticated');

-- 5. Replace the old single-item record_sale() with the new
--    cart-aware record_sale_cart(). Drop the old one so there's
--    no confusion about which function the app should call.
drop function if exists record_sale(uuid, uuid, integer);

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

-- Done! Your existing sales are preserved as single-item sale_items rows,
-- and the app can now record multi-product sales going forward.
