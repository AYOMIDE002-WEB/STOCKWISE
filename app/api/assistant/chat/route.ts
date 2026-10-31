import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAppClient } from "@/lib/supabaseServer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { buildSystemPrompt, parseModelJson, applyActions } from "@/lib/assistantAI";
import type { CartLine, Product, Rules } from "@/lib/assistantEngine";

export const maxDuration = 30;

let workingGeminiModel = ""; // remembered between requests on the same server instance

// Which AI service to use, based on the keys present in Vercel.
function pickProvider(): "anthropic" | "gemini" | null {
  const a = process.env.ANTHROPIC_API_KEY;
  const g = process.env.GEMINI_API_KEY;
  const want = (process.env.ASSISTANT_PROVIDER || "").toLowerCase();
  if (want === "gemini" && g) return "gemini";
  if (want === "anthropic" && a) return "anthropic";
  if (a) return "anthropic";
  if (g) return "gemini";
  return null;
}

// Tells the owner page whether an AI key is configured, and which one.
export async function GET() {
  const provider = pickProvider();
  return NextResponse.json({ configured: !!provider, provider });
}

export async function POST(req: NextRequest) {
  const supabase = createServerAppClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const provider = pickProvider();
  if (!provider) return NextResponse.json({ error: "no_key" }, { status: 503 });

  const body = await req.json();
  const message = String(body.message || "").trim().slice(0, 400);
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Daily spending guard: stop calling the AI after a set number of turns a day.
  const cap = Number(process.env.ASSISTANT_DAILY_CAP || 400);
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const { count } = await admin.from("assistant_events").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString());
  if ((count || 0) >= cap) return NextResponse.json({ error: "cap" }, { status: 503 });

  const { data: prods } = await admin.from("products").select("id, product_name, category, unit, unit_price, quantity_in_stock").order("product_name");
  const { data: rulesRow } = await admin.from("shop_rules").select("*").eq("id", 1).single();
  const products = ((prods as any[]) || []) as Product[];
  const rules = (rulesRow || {
    away_mode: false, opening_hours: "Mon-Sat 8am-8pm", allow_discounts: false, max_discount_percent: 0,
    escalate_order_above: 50000, owner_phone: null, default_language: "English", payment_instructions: "",
  }) as Rules;

  // Rebuild the basket from the database so the browser cannot spoof prices.
  const byId = new Map(products.map((p) => [p.id, p]));
  const cart: CartLine[] = [];
  for (const l of Array.isArray(body.cart) ? body.cart : []) {
    const p = byId.get(l.product_id);
    const q = Math.round(Number(l.quantity) * 1000) / 1000;
    if (p && q > 0 && q <= Number(p.quantity_in_stock)) {
      cart.push({ product_id: p.id, name: p.product_name, unit: p.unit && p.unit !== "unit" ? p.unit : "", unit_price: Number(p.unit_price), quantity: q });
    }
  }
  let discount = Number(body.discount) || 0;
  if (!rules.allow_discounts || discount > Number(rules.max_discount_percent) || discount < 0) discount = 0;

  const { prompt, codeMap } = buildSystemPrompt(products, rules);

  // Chat history -> alternating roles starting with a user turn.
  const hist: { role: "user" | "assistant"; content: string }[] = [];
  for (const h of Array.isArray(body.history) ? body.history.slice(-8) : []) {
    const role = h.from === "me" ? "user" : "assistant";
    const content = String(h.text || "").slice(0, 500);
    if (!content) continue;
    if (hist.length && hist[hist.length - 1].role === role) hist[hist.length - 1].content += "\n" + content;
    else hist.push({ role, content });
  }
  while (hist.length && hist[0].role !== "user") hist.shift();

  const cartText = cart.length
    ? cart.map((l) => `${l.quantity} ${l.unit} ${l.name}`).join("; ") + ` (discount ${discount}%)`
    : "empty";
  const alts = (Array.isArray(body.alts) ? body.alts : []).map((a: any) => String(a).slice(0, 200)).filter(Boolean).slice(0, 3);
  const userTurn = `BASKET: ${cartText}\nCUSTOMER SAYS: ${message}` + (alts.length ? `\nHEARD ALTERNATIVES: ${alts.join(" | ")}` : "");
  const messages = hist.length && hist[hist.length - 1].role === "user"
    ? [...hist.slice(0, -1), { role: "user" as const, content: hist[hist.length - 1].content + "\n" + userTurn }]
    : [...hist, { role: "user" as const, content: userTurn }];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let text = "";
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.ASSISTANT_MODEL || "claude-haiku-5-5", max_tokens: 500, system: prompt, messages }),
        signal: ctrl.signal,
      });
      if (!res.ok) return NextResponse.json({ error: "ai_error", provider, status: res.status, detail: (await res.text()).slice(0, 200) }, { status: 502 });
      const data = await res.json();
      text = (data.content || []).map((c: any) => c.text || "").join("");
    } else {
      // Google retires Gemini models often, so try several names until one works.
      const candidates = [process.env.GEMINI_MODEL, workingGeminiModel, "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-2.5-flash"]
        .filter(Boolean) as string[];
      const tried = new Set<string>();
      let lastStatus = 0;
      let lastDetail = "";
      let ok = false;
      for (const model of candidates) {
        if (tried.has(model)) continue;
        tried.add(model);
        const gen: any = { maxOutputTokens: 1500, temperature: 0.3, responseMimeType: "application/json" };
        if (model.includes("2.5-flash")) gen.thinkingConfig = { thinkingBudget: 0 };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": process.env.GEMINI_API_KEY!, "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: prompt }] },
            contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
            generationConfig: gen,
          }),
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
          workingGeminiModel = model;
          ok = true;
          break;
        }
        lastStatus = res.status;
        lastDetail = (await res.text()).slice(0, 200);
        if (res.status !== 404 && res.status !== 400) break; // only a retired/unknown model is worth retrying
      }
      if (!ok) return NextResponse.json({ error: "ai_error", provider, status: lastStatus, detail: lastDetail }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "ai_unreachable", provider }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  const out = parseModelJson(text);
  if (!out) return NextResponse.json({ error: "bad_output", provider }, { status: 502 });

  const r = applyActions(out, cart, discount, codeMap, rules);
  let flag = r.needsOwner;
  if (flag) {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await admin.from("assistant_events").select("id", { count: "exact", head: true })
      .eq("customer_text", message.slice(0, 500)).eq("needs_owner", true).eq("resolved", false).gte("created_at", since);
    if ((count || 0) > 0) flag = false;
  }
  await admin.from("assistant_events").insert({
    channel: "in_shop", kind: r.kind, customer_text: message.slice(0, 500), assistant_text: r.reply.slice(0, 800), needs_owner: flag,
  });

  return NextResponse.json({ reply: r.reply, cart: r.cart, discount: r.discount, action: r.action, show: r.showIds, needsOwner: r.needsOwner });
}
