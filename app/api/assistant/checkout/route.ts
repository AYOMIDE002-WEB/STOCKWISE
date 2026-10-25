import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAppClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Turns a basket into a pending order. Prices and stock come from the database,
// never from what the browser sent.
export async function POST(req: NextRequest) {
  const supabase = createServerAppClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const b = await req.json();
  const lines: { product_id: string; quantity: number }[] = Array.isArray(b.cart) ? b.cart : [];
  if (!lines.length) return NextResponse.json({ error: "Basket is empty" }, { status: 400 });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const ids = lines.map((l) => l.product_id);
  const { data: prods } = await admin.from("products").select("id, product_name, unit_price, quantity_in_stock").in("id", ids);
  const byId = new Map((prods || []).map((p: any) => [p.id, p]));

  const items: any[] = [];
  let total = 0;
  for (const l of lines) {
    const p: any = byId.get(l.product_id);
    const q = Math.round(Number(l.quantity) * 1000) / 1000;
    if (!p || !(q > 0)) return NextResponse.json({ error: "Invalid item in basket" }, { status: 400 });
    if (q > Number(p.quantity_in_stock)) {
      return NextResponse.json({ error: `Only ${Number(p.quantity_in_stock)} of ${p.product_name} left` }, { status: 409 });
    }
    const subtotal = Math.round(Number(p.unit_price) * q * 100) / 100;
    total += subtotal;
    items.push({ product_id: p.id, quantity: q, unit_price: Number(p.unit_price), subtotal });
  }
  total = Math.round(total * 100) / 100;

  const { data: rules } = await admin.from("shop_rules").select("escalate_order_above, allow_discounts, max_discount_percent").eq("id", 1).single();
  let discount = Number(b.discount_percent) || 0;
  if (!rules?.allow_discounts || discount < 0 || discount > Number(rules?.max_discount_percent || 0)) discount = 0;
  total = Math.round(total * (1 - discount / 100) * 100) / 100;
  const paymentMethod = b.payment_method === "transfer" ? "transfer" : "counter";
  const needsOwner = total > Number(rules?.escalate_order_above ?? 50000);

  const name = String(b.customer_name || "").trim().slice(0, 80) || null;
  const phone = String(b.customer_phone || "").trim().slice(0, 30) || null;

  let customerId: string | null = null;
  if (b.save_details && name && phone) {
    const { data: found } = await admin.from("customers").select("id").eq("phone_number", phone).limit(1);
    if (found && found.length) customerId = found[0].id;
    else {
      const { data: created } = await admin.from("customers").insert({ customer_name: name, phone_number: phone }).select("id").single();
      customerId = created?.id || null;
    }
  }

  const { data: order, error } = await admin.from("orders").insert({
    customer_id: customerId, customer_name: name, customer_phone: phone, channel: "in_shop",
    status: needsOwner ? "needs_owner" : "pending", total_amount: total, discount_percent: discount, payment_method: paymentMethod, note: b.note ? String(b.note).slice(0, 300) : null,
  }).select("id").single();
  if (error || !order) return NextResponse.json({ error: error?.message || "Could not save order" }, { status: 400 });

  await admin.from("order_items").insert(items.map((i) => ({ ...i, order_id: order.id })));
  await admin.from("assistant_events").insert({
    channel: "in_shop", kind: needsOwner ? "escalation" : "order",
    customer_text: "Checkout", assistant_text: `Order of ${total} placed${needsOwner ? " (above the owner's limit)" : ""}`,
    needs_owner: needsOwner, order_id: order.id,
  });

  return NextResponse.json({ orderId: order.id, status: needsOwner ? "needs_owner" : "pending", total, discount, paymentMethod });
}
