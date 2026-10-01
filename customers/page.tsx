import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import Sidebar from "../components/Sidebar";
import CustomersClient from "./CustomersClient";
import PageHeader from "../components/PageHeader";
import DecorativeBlobs from "../components/DecorativeBlobs";
import { UsersIcon } from "../components/Icons";

export default async function CustomersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("full_name, role").eq("id", user.id).single();
  const role = (profile?.role as "Admin" | "Staff") || "Staff";

  const { data: customers } = await supabase
    .from("customers").select("*").order("customer_name", { ascending: true });

  return (
    <div className="flex">
      <Sidebar role={role} />
      <main className="relative flex-1 min-w-0 p-4 pt-20 pb-24 md:p-8 max-w-4xl">
        <DecorativeBlobs theme="violet" />
        <PageHeader icon={<UsersIcon />} title="Customers" subtitle="Manage customer records" theme="violet" />
        <CustomersClient initialCustomers={customers || []} />
      </main>
    </div>
  );
}
