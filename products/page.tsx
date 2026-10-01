import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import Sidebar from "../components/Sidebar";
import ProductsClient from "./ProductsClient";
import PageHeader from "../components/PageHeader";
import DecorativeBlobs from "../components/DecorativeBlobs";
import { BoxIcon } from "../components/Icons";

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("full_name, role").eq("id", user.id).single();
  const role = (profile?.role as "Admin" | "Staff") || "Staff";

  const { data: products } = await supabase
    .from("products").select("*").order("product_name", { ascending: true });

  return (
    <div className="flex">
      <Sidebar role={role} />
      <main className="relative flex-1 min-w-0 p-4 pt-20 pb-24 md:p-8 max-w-5xl">
        <DecorativeBlobs theme="teal" />
        <PageHeader icon={<BoxIcon />} title="Products" subtitle="Manage your inventory" theme="teal" />
        <ProductsClient initialProducts={products || []} isAdmin={role === "Admin"} />
      </main>
    </div>
  );
}
