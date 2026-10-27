"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Boxes, Mic, MicOff, Send, ShoppingBasket, Volume2, VolumeX, Plus, Minus, X, CheckCircle2, WifiOff, ShieldCheck, Lock } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { respond, greeting, addLine, cartTotal, payable, type CartLine, type Product, type Rules } from "@/lib/assistantEngine";

type Msg = { from: "bot" | "me"; text: string };
type QItem = { type: "order" | "event"; payload: any };

const QKEY = "sw_screen_queue_v1";
const loadQ = (): QItem[] => { try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch { return []; } };
const saveQ = (q: QItem[]) => { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch { /* storage full or blocked */ } };
const naira = (n: number) => "\u20a6" + Number(n).toLocaleString("en-NG");

const LANGS = [
  { code: "en-NG", label: "English (Nigeria)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-US", label: "English (US)" },
  { code: "ha-NG", label: "Hausa (experimental)" },
  { code: "yo-NG", label: "Yoruba (experimental)" },
  { code: "ig-NG", label: "Igbo (experimental)" },
];

export default function ScreenClient({ initialProducts, initialRules }: { initialProducts: Product[]; initialRules: Rules }) {
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [rules, setRules] = useState<Rules>(initialRules);
  const [started, setStarted] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [aiOn, setAiOn] = useState(true);
  const [aiErr, setAiErr] = useState("");
  const [thinking, setThinking] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [matches, setMatches] = useState<Product[]>([]);
  const [input, setInput] = useState("");
  const [speak, setSpeak] = useState(true);
  const [lang, setLang] = useState("en-NG");
  const [listening, setListening] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", save: false, method: "counter" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; offline: boolean; amount: number; method: string } | null>(null);
  const recRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const say = useCallback((text: string) => {
    if (!speak || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  }, [speak, lang]);

  const post = useCallback(async (url: string, payload: any) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return res;
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    let q = loadQ();
    for (const item of [...q]) {
      try {
        const res = await post(item.type === "order" ? "/api/assistant/checkout" : "/api/assistant/log", item.payload);
        if (res.ok || res.status === 400 || res.status === 409) {
          q = q.filter((x) => x !== item && JSON.stringify(x) !== JSON.stringify(item));
          saveQ(q);
        } else break;
      } catch { break; }
    }
    setPending(loadQ().length);
  }, [post]);

  const logEvent = useCallback(async (kind: string, customer_text: string, assistant_text: string, needs_owner: boolean) => {
    const payload = { kind, customer_text, assistant_text, needs_owner };
    try {
      if (!navigator.onLine) throw new Error("offline");
      const res = await post("/api/assistant/log", payload);
      if (!res.ok && res.status >= 500) throw new Error("server");
    } catch {
      saveQ([...loadQ(), { type: "event", payload }]);
      setPending(loadQ().length);
    }
  }, [post]);

  // connectivity + queue + periodic refresh of live stock and rules
  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(loadQ().length);
    const on = () => { setOnline(true); flush(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const refresh = async () => {
      if (!navigator.onLine) return;
      const [p, r] = await Promise.all([
        supabase.from("products").select("id, product_name, category, unit, unit_price, quantity_in_stock").order("product_name"),
        supabase.from("shop_rules").select("*").eq("id", 1).single(),
      ]);
      if (p.data) setProducts(p.data as any);
      if (r.data) setRules(r.data as any);
      flush();
    };
    const t = setInterval(refresh, 30000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(t); };
  }, [supabase, flush]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function begin() {
    setStarted(true);
    const g = greeting(rules);
    setMsgs([{ from: "bot", text: g }]);
    setMatches(products.slice(0, 6));
    say(g);
    logEvent("greeting", "", g, false);
  }

  async function send(text: string, alts: string[] = []) {
    const t = text.trim();
    if (!t || thinking) return;
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { from: "me", text: t }]);
    setInput("");
    setThinking(true);
    let usedAI = false;

    // 1) the AI brain (needs internet and the API key)
    if (navigator.onLine && aiOn) {
      try {
        const res = await post("/api/assistant/chat", {
          message: t, discount, history, alts,
          cart: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        });
        if (res.ok) {
          const r = await res.json();
          setCart(r.cart);
          setDiscount(r.discount);
          setMatches(products.filter((p) => (r.show || []).includes(p.id)));
          setMsgs((m) => [...m, { from: "bot", text: r.reply }]);
          say(r.reply);
          if (r.action === "checkout") setCheckout(true);
          usedAI = true;
          setAiErr("");
        } else if (res.status === 503) {
          setAiOn(false);
        } else {
          const j = await res.json().catch(() => ({}));
          setAiErr(`${j.error || "error"}${j.status ? " " + j.status : ""}`);
        }
      } catch { /* fall back to the basic brain */ }
    }

    // 2) the basic rules brain (works offline, or when the AI is unavailable)
    if (!usedAI) {
      let r = respond(t, cart, products, rules, discount);
      if (r.kind === "unanswered") {
        // speech may have been misheard: try the other guesses before giving up
        for (const a of alts) {
          const r2 = respond(a, cart, products, rules, discount);
          if (r2.kind !== "unanswered") { r = r2; break; }
        }
      }
      setMsgs((m) => [...m, { from: "bot", text: r.reply }]);
      setCart(r.cart);
      setDiscount(r.discount);
      setMatches(r.matches);
      say(r.reply);
      logEvent(r.kind, t, r.reply, r.needsOwner);
      if (r.action === "checkout") setCheckout(true);
    }
    setThinking(false);
  }

  function tapProduct(p: Product) {
    const res = addLine(cart, p, 1);
    const reply = res.ok ? `Added ${res.msg}. Total so far ${naira(payable(res.cart, discount))}.` : res.msg;
    setCart(res.cart);
    setMsgs((m) => [...m, { from: "me", text: p.product_name }, { from: "bot", text: reply }]);
    say(reply);
  }

  function changeQty(line: CartLine, delta: number) {
    const p = products.find((x) => x.id === line.product_id);
    const next = Math.round((line.quantity + delta) * 1000) / 1000;
    if (next <= 0) return setCart(cart.filter((l) => l.product_id !== line.product_id));
    if (p && next > Number(p.quantity_in_stock)) return;
    setCart(cart.map((l) => (l.product_id === line.product_id ? { ...l, quantity: next } : l)));
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMsgs((m) => [...m, { from: "bot", text: "Voice isn't supported in this browser. Please use Chrome or Edge, or type below." }]); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 3;
    rec.onresult = (e: any) => {
      const alts = Array.from(e.results[0] as ArrayLike<any>).map((a: any) => String(a.transcript));
      send(alts[0], alts.slice(1));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    window.speechSynthesis?.cancel();
    setListening(true);
    rec.start();
  }

  async function placeOrder() {
    setFormError("");
    if (form.save && (!form.name.trim() || !form.phone.trim())) { setFormError("Please enter your name and phone to save your details."); return; }
    setBusy(true);
    const payload = {
      cart: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      customer_name: form.name, customer_phone: form.phone, save_details: form.save,
      discount_percent: discount, payment_method: form.method,
    };
    try {
      if (!navigator.onLine) throw new Error("offline");
      const res = await post("/api/assistant/checkout", payload);
      const data = await res.json().catch(() => ({}));
      if (res.ok) { finish(String(data.orderId).slice(0, 6).toUpperCase(), false, Number(data.total)); return; }
      if (res.status < 500) { setFormError(data.error || "Could not place the order."); setBusy(false); return; }
      throw new Error("server");
    } catch {
      saveQ([...loadQ(), { type: "order", payload }]);
      setPending(loadQ().length);
      finish("OFFLINE", true, payable(cart, discount));
    }
  }

  function finish(id: string, offline: boolean, amount: number) {
    setBusy(false); setCheckout(false); setDone({ id, offline, amount, method: form.method });
    const how = form.method === "transfer" ? "by bank transfer" : "at the counter";
    const m = offline ? "Your order is saved and will be sent to the shop as soon as the internet returns." : `Thank you! Your order number is ${id}. Please pay ${naira(amount)} ${how}. Your order is confirmed once the shop sees your payment.`;
    say(m);
    setTimeout(() => {
      setDone(null); setCart([]); setDiscount(0); setMsgs([]); setMatches([]); setForm({ name: "", phone: "", save: false, method: "counter" }); setStarted(false);
    }, 20000);
  }

  async function ownerExit() {
    setPwErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setPwErr("Please log in again."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: pw });
    if (error) { setPwErr("Wrong password."); return; }
    window.location.href = "/assistant";
  }

  const exitUi = (
    <>
      <button onClick={() => { setExitOpen(true); setPw(""); setPwErr(""); }}
        className="fixed bottom-3 right-3 z-40 w-9 h-9 rounded-full bg-white/60 border border-white text-slate-500 hover:text-slate-900 hover:bg-white flex items-center justify-center opacity-70 hover:opacity-100"
        title="Owner exit" aria-label="Owner exit"><Lock size={16} /></button>
      {exitOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <form className="card !p-6 w-full max-w-sm !bg-white/85" onSubmit={(e) => { e.preventDefault(); ownerExit(); }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Owner exit</h2>
              <button type="button" onClick={() => setExitOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-3">Enter your password to leave the customer screen.</p>
            <input type="password" autoFocus className="input-field w-full" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} />
            {pwErr && <p className="text-sm text-rose-600 mt-2">{pwErr}</p>}
            <button className="btn-primary w-full mt-3">Exit to dashboard</button>
          </form>
        </div>
      )}
    </>
  );

  const subtotal = cartTotal(cart);
  const total = payable(cart, discount);

  // ---- start overlay (also unlocks speech in the browser)
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {exitUi}
        <div className="card !p-10 max-w-lg w-full text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-violet-500 text-white flex items-center justify-center shadow-lg">
            <Boxes size={40} />
          </div>
          <h1 className="text-3xl font-bold mt-5 text-slate-800">Welcome</h1>
          <p className="text-slate-600 mt-2">{rules.away_mode ? "The owner is away, but I can help you shop." : "Tap to start shopping with the Stockwise assistant."}</p>
          <button className="btn-primary !py-3 !px-8 text-lg mt-6" onClick={begin}>Tap to start</button>
          {!online && <p className="text-xs text-amber-700 mt-4 flex items-center justify-center gap-1"><WifiOff size={14} /> Offline mode: basic help only</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6">
      {exitUi}
      <div className="max-w-6xl mx-auto">
        <header className="card !py-3 !px-4 flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white flex items-center justify-center"><Boxes size={22} /></div>
            <div>
              <p className="font-bold text-slate-800 leading-tight">Stockwise Assistant</p>
              <p className="text-xs text-slate-500">{rules.away_mode ? "Owner is away" : "Here to help"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${online && aiOn ? "bg-violet-100/80 text-violet-700 border-violet-200" : "bg-white/60 text-slate-600 border-white"}`}>{online && aiOn ? (aiErr ? "AI problem: " + aiErr : "AI on") : "Basic mode"}</span>
            {!online && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><WifiOff size={12} /> Offline{pending ? ` \u00b7 ${pending} waiting` : ""}</span>}
            {online && pending > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">Sending {pending}...</span>}
            <select className="input-field !py-1.5 text-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button className="btn-secondary !p-2" onClick={() => setSpeak(!speak)} title="Read replies aloud">{speak ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          {/* Chat */}
          <section className="card !p-4 flex flex-col" style={{ minHeight: "60vh" }}>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: "50vh" }}>
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base ${m.from === "me" ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white" : "bg-white/80 border border-white text-slate-800"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {matches.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {matches.map((p) => (
                  <button key={p.id} onClick={() => tapProduct(p)} disabled={Number(p.quantity_in_stock) <= 0}
                    className="shrink-0 text-left rounded-xl bg-white/70 border border-white hover:bg-white px-3 py-2 disabled:opacity-50">
                    <p className="text-sm font-medium text-slate-800 max-w-[180px] truncate">{p.product_name}</p>
                    <p className="text-xs text-slate-500">{naira(p.unit_price)}{p.unit && p.unit !== "unit" ? ` / ${p.unit}` : ""} {Number(p.quantity_in_stock) <= 0 ? "\u00b7 out of stock" : ""}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {["What do you sell?", "Pay"].map((q) => (
                <button key={q} className="text-xs px-3 py-1.5 rounded-full bg-white/60 border border-white text-slate-600 hover:bg-white" onClick={() => send(q)}>{q}</button>
              ))}
            </div>

            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
              <button type="button" onClick={toggleMic}
                className={`rounded-xl px-4 flex items-center justify-center border ${listening ? "bg-rose-500 text-white border-rose-500 animate-pulse" : "bg-white/70 border-white text-slate-700"}`} title="Speak">
                {listening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <input className="input-field flex-1 !text-base" placeholder={thinking ? "Thinking..." : "Type or tap the mic and speak..."} value={input} onChange={(e) => setInput(e.target.value)} />
              <button className="btn-primary px-4" aria-label="Send"><Send size={18} /></button>
            </form>
          </section>

          {/* Basket */}
          <aside className="card !p-4 flex flex-col">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3"><ShoppingBasket size={18} /> Your basket</h2>
            <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: "40vh" }}>
              {cart.length === 0 && <p className="text-sm text-slate-500">Nothing yet. Tell me what you need.</p>}
              {cart.map((l) => (
                <div key={l.product_id} className="rounded-xl bg-white/60 border border-white p-2.5">
                  <p className="text-sm font-medium text-slate-800">{l.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <button className="w-7 h-7 rounded-lg bg-white/80 border border-white flex items-center justify-center" onClick={() => changeQty(l, -1)}><Minus size={14} /></button>
                      <span className="text-sm w-16 text-center">{Number(l.quantity.toFixed(3))}{l.unit ? " " + l.unit : ""}</span>
                      <button className="w-7 h-7 rounded-lg bg-white/80 border border-white flex items-center justify-center" onClick={() => changeQty(l, 1)}><Plus size={14} /></button>
                    </div>
                    <span className="text-sm font-semibold text-brand-700">{naira(Math.round(l.unit_price * l.quantity * 100) / 100)}</span>
                  </div>
                </div>
              ))}
            </div>
            {discount > 0 && (
              <div className="mt-3 text-sm flex justify-between text-slate-500">
                <span>Subtotal {naira(subtotal)}</span><span className="text-emerald-600 font-medium">{discount}% off</span>
              </div>
            )}
            <div className="border-t border-slate-300/40 mt-3 pt-3 flex items-center justify-between">
              <span className="text-slate-600">Total</span>
              <span className="text-2xl font-bold text-brand-600">{naira(total)}</span>
            </div>
            <button className="btn-primary mt-3 !py-3" disabled={!cart.length} onClick={() => setCheckout(true)}>Place order</button>
            <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1"><ShieldCheck size={12} className="mt-0.5 shrink-0" /> Prices and stock come from the shop's live records.</p>
          </aside>
        </div>
      </div>

      {/* Checkout */}
      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="card !p-6 w-full max-w-md !bg-white/80">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Place your order</h2>
              <button onClick={() => setCheckout(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-3">Total: <b>{naira(total)}</b>{discount > 0 ? ` (after ${discount}% off)` : ""}</p>
            <p className="text-xs font-medium text-slate-500 mb-1">How will you pay?</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ k: "counter", l: "At the counter (cash / POS)" }, { k: "transfer", l: "Bank transfer" }].map((m) => (
                <button type="button" key={m.k} onClick={() => setForm({ ...form, method: m.k })}
                  className={`text-sm rounded-xl px-3 py-2 border ${form.method === m.k ? "bg-brand-500 text-white border-brand-500" : "bg-white/70 border-white text-slate-700"}`}>{m.l}</button>
              ))}
            </div>
            {form.method === "transfer" && (
              <p className="text-sm rounded-xl bg-white/80 border border-white p-3 mb-3 text-slate-900 font-bold whitespace-pre-line">
                {rules.payment_instructions?.trim() || "Ask at the counter for the shop's account details."}
              </p>
            )}
            <div className="space-y-2">
              <input className="input-field w-full" placeholder="Your name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input-field w-full" placeholder="Phone number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <label className="text-xs text-slate-600 flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={form.save} onChange={(e) => setForm({ ...form, save: e.target.checked })} />
                Save my name and number so the shop can recognise me next time.
              </label>
            </div>
            {formError && <p className="text-sm text-rose-600 mt-2">{formError}</p>}
            <button className="btn-primary w-full mt-4 !py-3" disabled={busy} onClick={placeOrder}>{busy ? "Sending..." : "Place order"}</button>
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="card !p-8 max-w-md w-full text-center !bg-white/85">
            <CheckCircle2 size={56} className="mx-auto text-emerald-500" />
            <h2 className="text-2xl font-bold text-slate-800 mt-3">{done.offline ? "Order saved" : "Order placed"}</h2>
            {!done.offline && <p className="text-3xl font-bold text-brand-600 mt-2">#{done.id}</p>}
            {!done.offline && done.method === "transfer" && (
              <p className="text-sm rounded-xl bg-white/80 border border-white p-3 mt-3 text-slate-900 font-bold whitespace-pre-line text-left">
                {rules.payment_instructions?.trim() || "Ask at the counter for the shop's account details."}
              </p>
            )}
            <p className="text-slate-600 mt-2">{done.offline ? "It will be sent to the shop as soon as the internet returns." : `Please pay ${naira(done.amount)} ${done.method === "transfer" ? "by bank transfer" : "at the counter"}. The shop confirms your order once payment is seen.`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
