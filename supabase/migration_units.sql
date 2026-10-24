-- =========================================================
-- MIGRATION: Units of measure and decimal quantities
-- =========================================================
-- Run this ONCE in the Supabase SQL Editor on your existing project.
-- It keeps every product and sale you already have.
--   * adds a "unit" to products (derica, bag, carton, kg ...)
--   * lets stock and sale quantities be decimals (e.g. 0.5 derica)
--   * updates record_sale_cart() to accept decimal quantities

alter table products add column if not exists unit text not null default 'unit';
alter table products alter column quantity_in_stock type numeric(12,3);
alter table products alter column quantity_in_stock set default 0;
alter table sale_items alter column quantity type numeric(12,3);

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
    v_quantity numeric;
    v_unit_price numeric(12,2);
    v_stock numeric;
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

    insert into sales (customer_id, total_amount, created_by)
    values (p_customer_id, v_grand_total, auth.uid())
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

grant execute on function record_sale_cart(uuid, jsonb) to authenticated;
