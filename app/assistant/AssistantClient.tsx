"use client";

import { useCallback, useEffect, useState } from "react";
import { Power, Monitor, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ShoppingBag, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import Badge from "../components/Badge";

type Rules = {
  away_mode: boolean; opening_hours: string; allow_discounts: boolean; max_discount_percent: number;
  escalate_order_above: number; owner_phone: string | null; default_language: string; payment_instructions: string;
};
type OrderItem = { id: string; product_id: string; quantity: number; unit_price: number; subtotal: number; products: { product_name: string; unit: string | null } | null };
type Order = {
  id: string; created_at: string; customer_id: string | null; customer_name: string | null; customer_phone: string | null;
  channel: string; status: string; total_amount: number; discount_percent: number; payment_method: string; order_items: OrderItem[];
};
type EventRow = { id: string; created_at: string; kind: string; customer_text: string | null; assistant_text: string | null; needs_owner: boolean; resolved: boolean };

const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
const naira = (n: number) => "\u20a6" + Number(n).toLocaleString("en-NG");
const statusTone = (s: string) => (s === "fulfilled" ? "ok" : s === "needs_owner" ? "low" : s === "cancelled" ? "staff" : "neutral");
const statusLabel: Record<string, string> = { pending: "Pending", needs_owner: "Needs owner", confirmed: "Confirmed", fulfilled: "Completed", cancelled: "Cancelled" };

export default function AssistantClient({ role }: { role: "Admin" | "Staff" }) {
  const [supabase] = useState(() => createClient());
  const [rules, setRules] = useState<Rules | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [ai, setAi] = useState<boolean | null>(null);
  const isAdmin = role === "Admin";

  const load = useCallback(async () => {
    const [r, o, e] = await Promise.all([
      supabase.from("shop_rules").select("*").eq("id", 1).single(),
      supabase.from("orders").select("*, order_items(id, product_id, quantity, unit_price, subtotal, products(product_name, unit))").order("created_at", { ascending: false }).limit(30),
      supabase.from("assistant_events").select("*").order("created_at", { ascending: false }).limit(40),
    ]);
    if (r.error) { setError("The assistant tables are missing. Run migration_ai_step1.sql in Supabase first."); return; }
    setError("");
    setRules(r.data as Rules);
    setOrders((o.data as any) || []);
    setEvents((e.data as any) || []);
  }, [supabase]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 5000);
    return () => clearTimeout(t);
  }, [note]);

  useEffect(() => {
    load();
    fetch("/api/assistant/chat").then((r) => r.json()).then((j) => setAi(!!j.configured)).catch(() => setAi(null));
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function saveRules(patch: Partial<Rules>) {
    if (!rules) return;
    setNote(""); setBusy("rules");
    const { error } = await supabase.from("shop_rules").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    setBusy("");
    if (error) { setNote("Could not save: " + error.message); return; }
    setRules({ ...rules, ...patch });
    setNote("");
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  }

  async function completeAsSale(o: Order) {
    setNote(""); setBusy(o.id);
    const items = o.order_items.map((i) => ({ product_id: i.product_id, quantity: Number(i.quantity) }));
    const { error } = await supabase.rpc("record_sale_cart", { p_customer_id: o.customer_id, p_items: items, p_discount_percent: Number(o.discount_percent || 0) });
    if (error) { setBusy(""); setNote("Could not complete: " + error.message); return; }
    await supabase.from("orders").update({ status: "fulfilled" }).eq("id", o.id);
    setBusy(""); setNote("Order completed and stock updated.");
    load();
  }

  async function setStatus(o: Order, status: string) {
    setBusy(o.id);
    await supabase.from("orders").update({ status }).eq("id", o.id);
    setBusy(""); load();
  }

  async function resolve(e: EventRow) {
    await supabase.from("assistant_events").update({ resolved: true }).eq("id", e.id);
    load();
  }

  if (error) return <div className="card text-sm text-amber-800 flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{error}</div>;
  if (!rules) return <div className="card text-sm text-slate-500">Loading...</div>;

  const open = orders.filter((o) => o.status === "pending" || o.status === "needs_owner" || o.status === "confirmed");
  const attention = events.filter((e) => e.needs_owner && !e.resolved);
  const count = (k: string) => events.filter((e) => e.kind === k).length;

  return (
    <div className="space-y-6">
      {note && <div className="card !py-3 text-sm text-slate-700">{note}</div>}

      {/* Away mode */}
      <div className="card flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${rules.away_mode ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            <Power size={22} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Away Mode is {rules.away_mode ? "ON" : "OFF"}</h2>
            <p className="text-xs mt-1">
              <span className={`inline-block px-2 py-0.5 rounded-full border ${ai ? "bg-violet-100/80 text-violet-700 border-violet-200" : "bg-amber-100/80 text-amber-800 border-amber-200"}`}>
                {ai ? "AI brain: connected" : "AI brain: not connected (basic mode). Add ANTHROPIC_API_KEY in Vercel."}
              </span>
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {rules.away_mode ? "The assistant is serving customers on the shop screen while you are away." : "Turn this on when you leave. The assistant tells customers the owner is away and handles their orders."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button className="btn-primary" disabled={busy === "rules"} onClick={() => saveRules({ away_mode: !rules.away_mode })}>
              {rules.away_mode ? "Turn off" : "Turn on"}
            </button>
          )}
          <a href="/assistant/screen" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <Monitor size={16} /> Open customer screen
          </a>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Open orders", v: open.length },
          { l: "Need your attention", v: attention.length + open.filter((o) => o.status === "needs_owner").length },
          { l: "Customers greeted", v: count("greeting") },
          { l: "Unanswered questions", v: count("unanswered") },
        ].map((s) => (
          <div key={s.l} className="card !p-4">
            <p className="text-xs text-slate-500">{s.l}</p>
            <p className="text-2xl font-bold text-brand-600 mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><ShoppingBag size={18} /> Orders taken by the assistant</h2>
          <button onClick={load} className="text-slate-500 hover:text-slate-800" title="Refresh"><RefreshCw size={16} /></button>
        </div>
        {orders.length === 0 && <p className="text-sm text-slate-500">No orders yet.</p>}
        <div className="space-y-3">
          {orders.map((o) => {
            const live = o.status === "pending" || o.status === "needs_owner" || o.status === "confirmed";
            return (
              <div key={o.id} className="rounded-xl border border-white/80 bg-white/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">#{o.id.slice(0, 6).toUpperCase()}</span>
                    <Badge tone={statusTone(o.status) as any}>{statusLabel[o.status] || o.status}</Badge>
                    <span className="text-xs text-slate-500">{when(o.created_at)}</span>
                  </div>
                  <span className="font-bold text-brand-600">{naira(o.total_amount)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Payment: {o.payment_method === "transfer" ? "Bank transfer" : "At the counter"}{Number(o.discount_percent) > 0 ? ` \u00b7 ${o.discount_percent}% discount applied` : ""}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {o.customer_name || "Walk-in customer"}{o.customer_phone ? " \u00b7 " + o.customer_phone : ""}
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-0.5">
                  {o.order_items.map((i) => (
                    <li key={i.id}>{Number(Number(i.quantity).toFixed(3))} {i.products?.unit && i.products.unit !== "unit" ? i.products.unit + " " : "\u00d7 "}{i.products?.product_name}</li>
                  ))}
                </ul>
                {live && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button className="btn-primary !py-1.5 text-sm inline-flex items-center gap-1.5" disabled={busy === o.id} onClick={() => completeAsSale(o)}>
                      <CheckCircle2 size={16} /> Complete as sale
                    </button>
                    <button className="btn-secondary !py-1.5 text-sm inline-flex items-center gap-1.5" disabled={busy === o.id} onClick={() => setStatus(o, "cancelled")}>
                      <XCircle size={16} /> Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attention */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3"><MessageSquare size={18} /> Needs your attention</h2>
        {attention.length === 0 && <p className="text-sm text-slate-500">Nothing waiting. The assistant has handled everything it could.</p>}
        <div className="space-y-2">
          {attention.map((e) => (
            <div key={e.id} className="rounded-xl border border-white/80 bg-white/50 p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone="low">{e.kind === "unanswered" ? "Unanswered" : "Escalated"}</Badge>
                  <span className="text-xs text-slate-500">{when(e.created_at)}</span>
                </div>
                {e.customer_text && <p className="text-slate-700">Customer: {e.customer_text}</p>}
                {e.assistant_text && <p className="text-slate-500">Assistant: {e.assistant_text}</p>}
              </div>
              <button className="btn-secondary !py-1.5 text-sm shrink-0" onClick={() => resolve(e)}>Mark resolved</button>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-1">Owner rules</h2>
        <p className="text-sm text-slate-500 mb-4">{isAdmin ? "These control what the assistant may do on its own." : "Only an Admin can change these."}</p>
        <RulesForm rules={rules} disabled={!isAdmin || busy === "rules"} saved={justSaved} onSave={saveRules} />
      </div>
    </div>
  );
}

function RulesForm({ rules, disabled, saved, onSave }: { rules: Rules; disabled: boolean; saved: boolean; onSave: (p: Partial<Rules>) => void }) {
  const [f, setF] = useState({
    opening_hours: rules.opening_hours,
    allow_discounts: rules.allow_discounts,
    max_discount_percent: String(rules.max_discount_percent),
    escalate_order_above: String(rules.escalate_order_above),
    owner_phone: rules.owner_phone || "",
    default_language: rules.default_language,
    payment_instructions: rules.payment_instructions || "",
  });
  return (
    <form
      className="grid md:grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          opening_hours: f.opening_hours, allow_discounts: f.allow_discounts,
          max_discount_percent: Number(f.max_discount_percent) || 0,
          escalate_order_above: Number(f.escalate_order_above) || 0,
          owner_phone: f.owner_phone.trim() || null, default_language: f.default_language, payment_instructions: f.payment_instructions.trim(),
        });
      }}
    >
      <label className="text-sm text-slate-600">Opening hours
        <input className="input-field w-full mt-1" disabled={disabled} value={f.opening_hours} onChange={(e) => setF({ ...f, opening_hours: e.target.value })} />
      </label>
      <label className="text-sm text-slate-600">Owner phone (for alerts)
        <input className="input-field w-full mt-1" disabled={disabled} value={f.owner_phone} onChange={(e) => setF({ ...f, owner_phone: e.target.value })} />
      </label>
      <label className="text-sm text-slate-600">Escalate orders above (&#8358;)
        <input type="number" min={0} className="input-field w-full mt-1" disabled={disabled} value={f.escalate_order_above} onChange={(e) => setF({ ...f, escalate_order_above: e.target.value })} />
      </label>
      <label className="text-sm text-slate-600">Customer voice language
        <select className="input-field w-full mt-1" disabled={disabled} value={f.default_language} onChange={(e) => setF({ ...f, default_language: e.target.value })}>
          {["English", "Pidgin", "Yoruba", "Hausa", "Igbo"].map((l) => <option key={l}>{l}</option>)}
        </select>
      </label>
      <label className="text-sm text-slate-600 flex items-center gap-2">
        <input type="checkbox" disabled={disabled} checked={f.allow_discounts} onChange={(e) => setF({ ...f, allow_discounts: e.target.checked })} />
        Allow discounts (still sent to you for approval)
      </label>
      <label className="text-sm text-slate-600">Maximum discount (%)
        <input type="number" min={0} max={100} className="input-field w-full mt-1" disabled={disabled || !f.allow_discounts} value={f.max_discount_percent} onChange={(e) => setF({ ...f, max_discount_percent: e.target.value })} />
      </label>
      <label className="text-sm text-slate-600 md:col-span-2">Bank transfer details shown to customers
        <textarea rows={2} className="input-field w-full mt-1" disabled={disabled} placeholder="Bank, account number, account name" value={f.payment_instructions} onChange={(e) => setF({ ...f, payment_instructions: e.target.value })} />
      </label>
      <div className="md:col-span-2">
        <button className="btn-primary" disabled={disabled}>{saved ? "Saved \u2713" : "Save rules"}</button>
      </div>
    </form>
  );
}
