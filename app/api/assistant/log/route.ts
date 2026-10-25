import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAppClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Records what the assistant said/did so the owner can review it later.
export async function POST(req: NextRequest) {
  const supabase = createServerAppClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const b = await req.json();
  const kinds = ["greeting", "question", "escalation", "unanswered"];
  if (!kinds.includes(b.kind)) return NextResponse.json({ error: "Bad kind" }, { status: 400 });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.from("assistant_events").insert({
    channel: "in_shop",
    kind: b.kind,
    customer_text: String(b.customer_text || "").slice(0, 500),
    assistant_text: String(b.assistant_text || "").slice(0, 800),
    needs_owner: !!b.needs_owner,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
