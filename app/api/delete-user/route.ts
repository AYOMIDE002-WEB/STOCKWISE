import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAppClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createServerAppClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Only Admins can delete users" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  if (userId === user.id) {
    return NextResponse.json({ error: "You can't delete your own account while logged in" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Prevent deleting the last remaining Admin
  const { data: target } = await admin.from("profiles").select("role").eq("id", userId).single();
  if (target?.role === "Admin") {
    const { count } = await admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "Admin");
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "You can't delete the only remaining Admin account" }, { status: 400 });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
