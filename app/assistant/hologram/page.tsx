import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import ScreenClient from "../screen/ScreenClient";

export default async function HologramPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: products } = await supabase
    .from("products").select("id, product_name, category, unit, unit_price, quantity_in_stock").order("product_name");
  const { data: rules } = await supabase.from("shop_rules").select("*").eq("id", 1).single();

  const fallback = {
    away_mode: false, opening_hours: "Mon-Sat 8am-8pm", allow_discounts: false, max_discount_percent: 0,
    escalate_order_above: 50000, owner_phone: null, default_language: "English", payment_instructions: "",
  };
  return <ScreenClient mode="hologram" initialProducts={(products as any) || []} initialRules={(rules as any) || fallback} />;
}
