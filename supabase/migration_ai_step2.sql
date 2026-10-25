-- =========================================================
-- STOCKWISE AI - STEP 2B: real discounts and payment method
-- =========================================================
-- Run ONCE in the Supabase SQL Editor (after migration_ai_step1.sql).
-- Adds columns only; keeps all existing data.

alter table shop_rules add column if not exists payment_instructions text not null default '';
alter table orders add column if not exists discount_percent numeric(5,2) not null default 0;
alter table orders add column if not exists payment_method text not null default 'counter'
    check (payment_method in ('counter', 'transfer'));
alter table sales add column if not exists discount_percent numeric(5,2) not null default 0;

-- Replace the sale function with one that accepts an optional discount.
-- Existing two-argument calls keep working (discount defaults to 0).
drop function if exists record_sale_cart(uuid, jsonb);

create or replace function record_sale_cart(
    p_customer_id uuid,
    p_items jsonb,
    p_discount_percent numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_item jsonb;
    v_product_id uuid;
    v_quantity numeric;
    v_unit_price numeric(12,2);
    v_stock numeric;
    v_subtotal numeric(12,2);
    v_grand_total numeric(12,2) := 0;
    v_sale_id uuid;
    v_discount numeric;
begin
    v_discount := least(greatest(coalesce(p_discount_percent, 0), 0), 100);
    if p_items is null or jsonb_array_length(p_items) = 0 then
        raise exception 'A sale must contain at least one item';
    end if;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := round((v_item->>'quantity')::numeric, 3);

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
            raise exception 'Insufficient stock for product %: only % available', v_product_id, v_stock;
        end if;

        v_grand_total := v_grand_total + round(v_unit_price * v_quantity, 2);
    end loop;

    v_grand_total := round(v_grand_total * (1 - v_discount / 100), 2);

    insert into sales (customer_id, total_amount, created_by, discount_percent)
    values (p_customer_id, v_grand_total, auth.uid(), v_discount)
    returning id into v_sale_id;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := round((v_item->>'quantity')::numeric, 3);

        select unit_price into v_unit_price from products where id = v_product_id;
        v_subtotal := round(v_unit_price * v_quantity, 2);

        insert into sale_items (sale_id, product_id, quantity, unit_price, subtotal)
        values (v_sale_id, v_product_id, v_quantity, v_unit_price, v_subtotal);

        update products set quantity_in_stock = quantity_in_stock - v_quantity
        where id = v_product_id;
    end loop;

    return v_sale_id;
end;
$$;

grant execute on function record_sale_cart(uuid, jsonb, numeric) to authenticated;
