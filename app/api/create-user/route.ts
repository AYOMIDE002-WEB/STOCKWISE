import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAppClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Verify the requester is an authenticated Admin
  const supabase = createServerAppClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") {
    return NextResponse.json({ error: "Only Admins can create users" }, { status: 403 });
  }

  const { full_name, email, password, role } = await req.json();
  if (!full_name || !email || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password should be at least 6 characters" }, { status: 400 });
  }

  // Service-role client - server-side only, never exposed to the browser
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "Could not create user" }, { status: 400 });
  }

  // The trigger in schema.sql auto-creates a profile row with role 'Staff' -
  // update it to the requested role if different.
  if (role === "Admin") {
    await admin.from("profiles").update({ role: "Admin" }).eq("id", created.user.id);
  }

  return NextResponse.json({ success: true, userId: created.user.id });
}
