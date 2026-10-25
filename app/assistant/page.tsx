import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabaseServer";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import DecorativeBlobs from "../components/DecorativeBlobs";
import AssistantClient from "./AssistantClient";

export default async function AssistantPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile?.role as "Admin" | "Staff") || "Staff";

  return (
    <div className="flex">
      <Sidebar role={role} />
      <main className="relative flex-1 min-w-0 p-4 pt-20 pb-24 md:p-8 max-w-5xl">
        <DecorativeBlobs theme="violet" />
        <PageHeader
          icon={<Bot className="w-6 h-6" strokeWidth={1.75} />}
          title="Assistant"
          subtitle="Let the shop keep serving customers while you are away"
          theme="violet"
        />
        <AssistantClient role={role} />
      </main>
    </div>
  );
}
