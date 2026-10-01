import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import Sidebar from "../components/Sidebar";
import SalesClient from "./SalesClient";
import PageHeader from "../components/PageHeader";
import DecorativeBlobs from "../components/DecorativeBlobs";
import { ReceiptIcon } from "../components/Icons";

export default async function SalesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("full_name, role").eq("id", user.id).single();
  const role = (profile?.role as "Admin" | "Staff") || "Staff";

  const [{ data: products }, { data: customers }, { data: sales }] = await Promise.all([
    supabase.from("products").select("id, product_name, unit_price, quantity_in_stock").order("product_name"),
    supabase.from("customers").select("id, customer_name").order("customer_name"),
    supabase
      .from("sales")
      .select("id, total_amount, sale_date, customer_id, customers(customer_name), sale_items(id, quantity, unit_price, subtotal, products(product_name))")
      .order("sale_date", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="flex">
      <Sidebar role={role} />
      <main className="relative flex-1 min-w-0 p-4 pt-20 pb-24 md:p-8 max-w-5xl">
        <DecorativeBlobs theme="amber" />
        <PageHeader icon={<ReceiptIcon />} title="Sales" subtitle="Record and track sales transactions" theme="amber" />
        <SalesClient
          products={products || []}
          customers={customers || []}
          initialSales={(sales || []) as any}
          userId={user.id}
        />
      </main>
    </div>
  );
}
