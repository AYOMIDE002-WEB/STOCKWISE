import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAppClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createServerAppClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Only Admins can edit users" }, { status: 403 });
  }

  const { userId, full_name, role, password } = await req.json();
  if (!userId || !full_name) {
    return NextResponse.json({ error: "userId and full_name are required" }, { status: 400 });
  }
  if (password && password.length < 6) {
    return NextResponse.json({ error: "New password should be at least 6 characters" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Guard: don't demote the last remaining Admin to Staff
  if (role === "Staff") {
    const { data: target } = await admin.from("profiles").select("role").eq("id", userId).single();
    if (target?.role === "Admin") {
      const { count } = await admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "Admin");
      if ((count || 0) <= 1) {
        return NextResponse.json({ error: "You can't change the only remaining Admin to Staff" }, { status: 400 });
      }
    }
  }

  if (password) {
    const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password });
    if (pwError) return NextResponse.json({ error: pwError.message }, { status: 400 });
  }

  const { error } = await admin.from("profiles").update({ full_name, role }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
