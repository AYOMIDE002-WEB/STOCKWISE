// Stockwise assistant "basic brain": a deterministic, rule-based engine.
// It runs in the browser (so it keeps working offline) and only ever answers
// from the live product list it is given - it never invents prices or stock.

export type Product = {
  id: string;
  product_name: string;
  category: string | null;
  unit: string | null;
  unit_price: number;
  quantity_in_stock: number;
};

export type CartLine = {
  product_id: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity: number;
};

export type Rules = {
  away_mode: boolean;
  opening_hours: string;
  allow_discounts: boolean;
  max_discount_percent: number;
  escalate_order_above: number;
  owner_phone: string | null;
  default_language: string;
  payment_instructions?: string;
};

export type EngineResult = {
  reply: string;
  cart: CartLine[];
  matches: Product[];
  action: "none" | "checkout" | "escalate";
  kind: "greeting" | "question" | "escalation" | "unanswered";
  needsOwner: boolean;
  discount: number;
};

const UNIT_WORDS = new Set([
  "derica", "dericas", "bag", "bags", "carton", "cartons", "pack", "packs", "packet", "packets",
  "strip", "strips", "bottle", "bottles", "piece", "pieces", "kg", "litre", "litres", "liter",
  "tin", "tins", "cup", "cups", "sachet", "sachets", "box", "boxes", "metre", "metres",
  "meter", "meters", "tablet", "tablets", "tube", "tubes", "unit", "units", "mg", "ml", "g", "l",
]);

const STOP = new Set([
  "i", "want", "wan", "give", "me", "abeg", "please", "pls", "plz", "buy", "take", "add", "get",
  "need", "bring", "order", "for", "some", "of", "the", "a", "an", "and", "na", "dey", "how",
  "much", "is", "are", "price", "prices", "cost", "do", "you", "have", "di", "de", "am",
  "wetin", "be", "e", "available", "in", "stock", "any", "to", "my", "it", "can", "could",
  "would", "like", "got", "with", "also", "more", "another", "per",
]);

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, half: 0.5, quarter: 0.25,
};

const naira = (n: number) => "\u20a6" + (Math.round(Number(n) * 100) / 100).toLocaleString("en-NG");
const fmt = (n: number) => Number(Number(n).toFixed(3)).toString();
const unitOf = (p: { unit: string | null }) => (p.unit && p.unit !== "unit" ? p.unit : "");

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[\u20a6,]/g, " ")
    .replace(/[^a-z0-9./\s]/g, " ")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(tok: string): number | null {
  if (NUM_WORDS[tok] !== undefined) return NUM_WORDS[tok];
  if (/^\d+(\.\d+)?$/.test(tok)) return parseFloat(tok);
  const m = tok.match(/^(\d+)\/(\d+)$/);
  if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2]);
  return null;
}

function stem(t: string) {
  return t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t;
}

function lev(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function tokMatch(a: string, b: string) {
  if (a === b) return true;
  const sa = stem(a), sb = stem(b);
  if (sa === sb) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (a.length >= 5 && b.length >= 5 && lev(sa, sb) <= 1) return true;
  return false;
}

function productTokens(p: Product) {
  return norm(p.product_name).split(" ").filter((t) => t && !STOP.has(t));
}

function score(q: string[], p: Product) {
  const pt = productTokens(p);
  if (!q.length || !pt.length) return 0;
  let matched = 0;
  let denom = 0;
  for (const t of q) {
    const hit = pt.some((x) => tokMatch(t, x));
    if (hit) { matched++; denom++; }
    else denom += UNIT_WORDS.has(t) ? 0.5 : 1;
  }
  if (!denom || !matched) return 0;
  return 0.7 * (matched / denom) + 0.3 * (matched / pt.length);
}

type Ranked = { p: Product; s: number };

function rank(q: string[], products: Product[]): Ranked[] {
  return products.map((p) => ({ p, s: score(q, p) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
}

type Segment = { qty: number; ranked: Ranked[]; text: string; units: string[] };

function resolveSegment(seg: string, products: Product[]): Segment | null {
  const toks = norm(seg).split(" ").filter(Boolean);
  // Option A: first number is a quantity. Option B: numbers belong to the product name (e.g. 500mg).
  let qty: number | null = null;
  const restA: string[] = [];
  for (const t of toks) {
    const n = toNum(t);
    if (n !== null && qty === null) qty = n;
    else restA.push(t);
  }
  const qA = restA.filter((t) => !STOP.has(t) && toNum(t) === null);
  const qB = toks.filter((t) => !STOP.has(t) && !(NUM_WORDS[t] !== undefined));
  const rA = rank(qA, products);
  const rB = rank(qB, products);
  const useB = (rB[0]?.s || 0) > (rA[0]?.s || 0) + 0.05;
  const ranked = useB ? rB : rA;
  if (!ranked.length) return null;
  return { qty: useB ? 1 : qty ?? 1, ranked, text: seg, units: toks.filter((t) => UNIT_WORDS.has(t)) };
}

function confident(r: Ranked[]) {
  return r.length > 0 && r[0].s >= 0.6 && (r.length === 1 || r[1].s < r[0].s - 0.1);
}

function qtyPhrase(qty: number, p: Product) {
  const u = unitOf(p);
  return u && !p.product_name.toLowerCase().includes(u.toLowerCase())
    ? `${fmt(qty)} ${u} of ${p.product_name}`
    : `${fmt(qty)} \u00d7 ${p.product_name}`;
}

export function addLine(cart: CartLine[], p: Product, qty: number): { cart: CartLine[]; msg: string; ok: boolean } {
  const existing = cart.find((l) => l.product_id === p.id);
  const have = Number(p.quantity_in_stock);
  const left = have - (existing?.quantity || 0);
  const u = unitOf(p);
  if (have <= 0) return { cart, msg: `Sorry, ${p.product_name} is out of stock.`, ok: false };
  if (qty > left) {
    return { cart, msg: `Only ${fmt(Math.max(left, 0))} of ${p.product_name} left for you.`, ok: false };
  }
  const next = existing
    ? cart.map((l) => (l.product_id === p.id ? { ...l, quantity: Math.round((l.quantity + qty) * 1000) / 1000 } : l))
    : [...cart, { product_id: p.id, name: p.product_name, unit: u, unit_price: Number(p.unit_price), quantity: qty }];
  return { cart: next, msg: qtyPhrase(qty, p), ok: true };
}

export const cartTotal = (cart: CartLine[]) =>
  Math.round(cart.reduce((s, l) => s + l.unit_price * l.quantity, 0) * 100) / 100;

export const payable = (cart: CartLine[], discount: number) =>
  Math.round(cartTotal(cart) * (1 - (discount || 0) / 100) * 100) / 100;

export function greeting(rules: Rules) {
  return rules.away_mode
    ? "Welcome! The owner is away right now, but I'm the Stockwise assistant and I can help you find products and place an order. What are you looking for?"
    : "Welcome! I'm the Stockwise assistant. Tell me what you need, or tap a product, and I'll check what's available.";
}

export function respond(message: string, cart: CartLine[], products: Product[], rules: Rules, discount = 0): EngineResult {
  const raw = message.trim();
  const text = norm(raw);
  const base = { cart, matches: [] as Product[], action: "none" as const, kind: "question" as const, needsOwner: false, discount };
  if (!text) return { ...base, reply: "I'm listening. What would you like?" };

  const has = (re: RegExp) => re.test(text);

  if (has(/\b(owner|manager|boss|human|real person|oga|madam|complain|complaint|speak to someone)\b/)) {
    return { ...base, action: "escalate", kind: "escalation", needsOwner: true,
      reply: "I've let the owner know you need them. Please wait a moment, and I can keep taking your order meanwhile." };
  }
  if (has(/\b(discount|reduce|reduction|cheaper|last price|bargain|knock off|less money|slash)\b/)) {
    const max = Number(rules.max_discount_percent) || 0;
    if (!rules.allow_discounts || max <= 0) {
      return { ...base, kind: "escalation", needsOwner: true,
        reply: "I'm not allowed to change prices myself, but I've sent your request to the owner." };
    }
    if (!cart.length) return { ...base, reply: "Add your items to the basket first, then ask me for a discount." };
    if (discount >= max) {
      return { ...base, kind: "escalation", needsOwner: true,
        reply: `${discount}% off is the best I'm allowed to give. I've asked the owner if they can do more.` };
    }
    const next = discount === 0 ? Math.max(1, Math.floor(max / 2)) : max;
    return { ...base, discount: next, kind: "question",
      reply: `Okay, I can take ${next}% off your basket. Your new total is ${naira(payable(cart, next))}.` };
  }
  if (has(/\b(clear|cancel|empty|start over|remove all)\b/)) {
    return { ...base, cart: [], discount: 0, reply: "Okay, I've cleared your basket. What would you like?" };
  }
  if (has(/\b(remove|delete|take out|no more|dont want|do not want)\b/)) {
    const skip = new Set(["remove", "delete", "take", "out", "no", "more", "dont", "do", "not", "want", "from", "basket", "cart", "the", "my"]);
    const q = text.split(" ").filter((t) => t && !skip.has(t) && !STOP.has(t) && toNum(t) === null);
    const inCart = cart.map((l) => products.find((x) => x.id === l.product_id)).filter(Boolean) as Product[];
    const rk = rank(q, inCart);
    if (rk.length && rk[0].s >= 0.5) {
      const gone = rk[0].p;
      return { ...base, cart: cart.filter((l) => l.product_id !== gone.id),
        reply: `Okay, I've removed ${gone.product_name}. Anything else?` };
    }
    return { ...base, reply: cart.length ? "Which item should I remove? Or say 'clear' to empty the basket." : "Your basket is empty." };
  }
  if (has(/\b(thanks|thank you|thank u|tanks|thx|nagode|daalu|ese)\b/)) {
    return { ...base, reply: "You're welcome! Say 'pay' when you're ready, or tell me what else you need." };
  }
  if (has(/^(yes|yeah|yep|ok|okay|sure|alright|oya)( please| o)?$/)) {
    return { ...base, reply: cart.length ? "Great. What else would you like? Say 'pay' when you're ready." : "Great. What would you like to buy?" };
  }
  if (has(/^(no|nope|nothing|nothing else|no more|bye|goodbye)( thanks| thank you)?$/)) {
    return { ...base, reply: cart.length ? "Okay. Say 'pay' when you're ready to place your order." : "No problem. Let me know if you need anything." };
  }
  if (has(/\b(checkout|check out|pay|paying|done|finish|finished|complete|confirm|place order|send order|that is all|thats all|total|i am done|im done)\b/)) {
    if (!cart.length) return { ...base, reply: "Your basket is empty. Tell me what you'd like to buy." };
    return { ...base, action: "checkout", reply: `Your total is ${naira(payable(cart, discount))}${discount ? " after " + discount + "% off" : ""}. Choose how you will pay to place the order.` };
  }
  if (has(/\b(open|close|closing|opening|hours|time)\b/) && !has(/\b(add|buy)\b/)) {
    return { ...base, reply: `Our opening hours are: ${rules.opening_hours}.` };
  }
  if (has(/^(hi|hello|hey|good (morning|afternoon|evening)|how far|howdy|sannu|bawo|ndewo|welcome)\b/) && text.split(" ").length <= 4) {
    return { ...base, kind: "greeting", reply: greeting(rules) };
  }
  if (has(/\b(what do you (sell|have)|wetin (you|una) (get|sell)|what.*available|menu|list|categories|catalog|catalogue|show me)\b/)) {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];
    return { ...base, matches: products.slice(0, 6),
      reply: cats.length ? `We have ${cats.slice(0, 8).join(", ")} and more. Tap a product below or tell me what you need.` : "Here are some of our products. Tap one or tell me what you need." };
  }

  // Split a multi-item request: "two rice and one oil"
  const parts = raw.split(/\s*(?:,|&|\+|\band\b|\bplus\b|\bwith\b)\s*/i).filter((s) => s.trim());
  const segs = parts.map((s) => resolveSegment(s, products)).filter(Boolean) as Segment[];
  const orderVerb = has(/\b(want|wan|give|buy|take|add|get|need|bring|order|abeg)\b/);
  const wantsInfo = has(/\b(how much|price|cost|wetin|do you have|have you|available|in stock|you get|got any)\b/);

  if (!segs.length) {
    return { ...base, kind: "unanswered", needsOwner: true,
      reply: "I'm not sure I found that. Could you say it another way, or tap one of the products? I've also noted it for the owner." };
  }

  // Information request about one item
  if (wantsInfo && !orderVerb) {
    const r = segs[0].ranked;
    if (confident(r)) {
      const p = r[0].p;
      const u = unitOf(p);
      const stock = Number(p.quantity_in_stock);
      return { ...base, matches: [p],
        reply: stock > 0
          ? `Yes, we have ${p.product_name}. It is ${naira(p.unit_price)}${u ? " per " + u : ""}, and ${fmt(stock)}${u ? " " + u : ""} is in stock.`
          : `Sorry, ${p.product_name} is out of stock right now.` };
    }
    return { ...base, matches: r.slice(0, 3).map((x) => x.p), reply: "Which one do you mean? Tap the right one below." };
  }

  // Order / add to basket
  let current = cart;
  const added: string[] = [];
  const problems: string[] = [];
  const ask: Product[] = [];
  for (const seg of segs) {
    if (confident(seg.ranked)) {
      const prod = seg.ranked[0].p;
      const pu = unitOf(prod);
      const mism = seg.units.find((u) => pu && !tokMatch(u, pu) && !productTokens(prod).some((x) => tokMatch(u, x)));
      if (mism) {
        problems.push(`${prod.product_name} is sold per ${pu}, not per ${mism}. Tell me how many ${pu} you want.`);
        continue;
      }
      const res = addLine(current, prod, seg.qty);
      current = res.cart;
      (res.ok ? added : problems).push(res.msg);
    } else if (seg.ranked[0] && seg.ranked[0].s >= 0.35) {
      seg.ranked.slice(0, 3).forEach((x) => ask.push(x.p));
    } else {
      problems.push(`I couldn't find "${seg.text.trim()}"`);
    }
  }
  const parts2: string[] = [];
  if (added.length) parts2.push(`Added ${added.join(", ")}. Total so far ${naira(payable(current, discount))}.`);
  if (problems.length) parts2.push(problems.join(" "));
  if (ask.length) parts2.push("Which one do you mean? Tap the right one below.");
  if (added.length && !ask.length) parts2.push("Anything else, or say 'pay' to finish?");
  if (!added.length && !ask.length && !orderVerb && segs.length && !problems.length) {
    // Just a product name with no verb: show details
    const r = segs[0].ranked;
    if (confident(r)) {
      const p = r[0].p, u = unitOf(p);
      return { ...base, matches: [p], reply: `${p.product_name} is ${naira(p.unit_price)}${u ? " per " + u : ""}. Say how many you want and I'll add it.` };
    }
  }
  const unanswered = !added.length && !ask.length && problems.some((m) => m.startsWith("I couldn't find"));
  return { cart: current, matches: ask.slice(0, 4), action: "none", discount,
    kind: unanswered ? "unanswered" : "question", needsOwner: unanswered,
    reply: parts2.join(" ") || "Sorry, I didn't catch that." };
}
