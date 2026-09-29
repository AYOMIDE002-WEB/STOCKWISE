import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import Sidebar from "../components/Sidebar";
import ManageUsersClient from "./ManageUsersClient";
import PageHeader from "../components/PageHeader";
import DecorativeBlobs from "../components/DecorativeBlobs";
import { ShieldIcon } from "../components/Icons";

export default async function ManageUsersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("full_name, role").eq("id", user.id).single();
  const role = (profile?.role as "Admin" | "Staff") || "Staff";

  if (role !== "Admin") {
    return (
      <div className="flex">
        <Sidebar role={role} />
        <main className="flex-1 p-8">
          <div className="bg-red-50 text-accent-danger text-sm rounded-lg px-4 py-3 max-w-md">
            Access denied. Manage Users is available to Admin accounts only.
          </div>
        </main>
      </div>
    );
  }

  const { data: users } = await supabase
    .from("profiles").select("id, full_name, role, created_at").order("created_at", { ascending: true });

  return (
    <div className="flex">
      <Sidebar role={role} />
      <main className="relative flex-1 p-8 max-w-4xl">
        <DecorativeBlobs theme="slate" />
        <PageHeader icon={<ShieldIcon />} title="Manage Users" subtitle="Create and manage staff and admin accounts" theme="slate" />
        <ManageUsersClient initialUsers={users || []} currentUserId={user.id} />
      </main>
    </div>
  );
}
