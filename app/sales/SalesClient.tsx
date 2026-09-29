"use client";

import { Fragment, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import dayjs from "dayjs";
import { createClient } from "@/lib/supabaseClient";
import { queueSale, syncQueuedSales } from "@/lib/offlineQueue";

const InvoiceDownloadButton = dynamic(() => import("../invoices/InvoiceDownloadButton"), { ssr: false });

type Product = { id: string; product_name: string; unit_price: number; quantity_in_stock: number };
type Customer = { id: string; customer_name: string };
type SaleItemRow = {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: { product_name: string } | null;
};
type SaleRow = {
  id: string;
  total_amount: number;
  sale_date: string;
  customer_id: string | null;
  customers: { customer_name: string } | null;
  sale_items: SaleItemRow[];
};
type CartLine = { product_id: string; quantity: number };

const SALES_SELECT =
  "id, total_amount, sale_date, customer_id, customers(customer_name), sale_items(id, quantity, unit_price, subtotal, products(product_name))";

export default function SalesClient({
  products: initialProducts,
  customers,
  initialSales,
}: {
  products: Product[];
  customers: Customer[];
  initialSales: SaleRow[];
  userId: string;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickProductId, setPickProductId] = useState(initialProducts[0]?.id || "");
  const [pickQty, setPickQty] = useState("1");
  const [sales, setSales] = useState<SaleRow[]>(initialSales);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const productById = (id: string) => products.find((p) => p.id === id);
  const cartTotal = cart.reduce((sum, l) => sum + (productById(l.product_id)?.unit_price || 0) * l.quantity, 0);

  async function refresh() {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("sales").select(SALES_SELECT).order("sale_date", { ascending: false }).limit(50),
      supabase.from("products").select("id, product_name, unit_price, quantity_in_stock").order("product_name"),
    ]);
    if (s) setSales(s as any);
    if (p) setProducts(p);
  }

  async function trySync() {
    setSyncing(true);
    const count = await syncQueuedSales(async (sale) => {
      const { error } = await supabase.rpc("record_sale_cart", {
        p_customer_id: sale.customer_id,
        p_items: sale.items,
      });
      return !error;
    });
    setSyncing(false);
    if (count > 0) {
      setNotice(`Synced ${count} offline sale${count > 1 ? "s" : ""}.`);
      refresh();
    }
  }

  useEffect(() => {
    trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addToCart(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const qty = Number(pickQty);
    const product = productById(pickProductId);
    if (!product || !Number.isInteger(qty) || qty <= 0) {
      setError("Choose a product and a whole-number quantity greater than zero.");
      return;
    }
    // Merge with an existing line for the same product, and check total against stock
    const existing = cart.find((l) => l.product_id === pickProductId);
    const newQty = (existing?.quantity || 0) + qty;
    if (newQty > product.quantity_in_stock) {
      setError(`Only ${product.quantity_in_stock} of "${product.product_name}" in stock.`);
      return;
    }
    setCart(existing
      ? cart.map((l) => (l.product_id === pickProductId ? { ...l, quantity: newQty } : l))
      : [...cart, { product_id: pickProductId, quantity: qty }]);
    setPickQty("1");
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((l) => l.product_id !== productId));
  }

  async function completeSale() {
    setError("");
    setNotice("");
    if (cart.length === 0) { setError("Add at least one item to the sale first."); return; }
    setSubmitting(true);

    if (!navigator.onLine) {
      await queueSale({
        customer_id: customerId || null,
        items: cart,
        estimated_total: cartTotal,
        created_at: new Date().toISOString(),
      });
      setNotice("You're offline \u2014 sale saved locally and will sync automatically once you're back online.");
      setCart([]);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.rpc("record_sale_cart", {
      p_customer_id: customerId || null,
      p_items: cart,
    });
    setSubmitting(false);
    if (error) { setError(error.message); return; }

    setCart([]);
    setNotice("Sale recorded successfully.");
    refresh();
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-accent-danger text-sm rounded-lg px-3 py-2">{error}</div>}
      {notice && <div className="bg-emerald-50 text-accent-success text-sm rounded-lg px-3 py-2">{notice}</div>}
      {syncing && <div className="bg-slate-100 text-slate-500 text-sm rounded-lg px-3 py-2">Syncing offline sales...</div>}

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">New Sale</h2>

        <div className="mb-4">
          <label className="text-xs font-medium text-slate-500">Customer</label>
          <select className="input-field w-full sm:w-72 mt-1 block" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
          </select>
        </div>

        <form onSubmit={addToCart} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-slate-500">Product</label>
            <select className="input-field w-full mt-1" value={pickProductId} onChange={(e) => setPickProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.quantity_in_stock === 0}>
                  {p.product_name} (&#8358;{p.unit_price.toLocaleString()} | {p.quantity_in_stock} in stock)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Qty</label>
            <input type="number" min={1} className="input-field w-24 mt-1 block" value={pickQty} onChange={(e) => setPickQty(e.target.value)} />
          </div>
          <button type="submit" className="btn-secondary">+ Add to sale</button>
        </form>

        <div className="mt-5 border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="px-3 py-2">Item</th><th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Unit Price</th><th className="px-3 py-2">Subtotal</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {cart.map((l) => {
                const p = productById(l.product_id);
                return (
                  <tr key={l.product_id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{p?.product_name}</td>
                    <td className="px-3 py-2">{l.quantity}</td>
                    <td className="px-3 py-2">&#8358;{(p?.unit_price || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">&#8358;{((p?.unit_price || 0) * l.quantity).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeFromCart(l.product_id)} className="text-accent-danger text-xs">Remove</button>
                    </td>
                  </tr>
                );
              })}
              {cart.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No items yet &mdash; add products above.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-slate-600">
            Total: <span className="text-xl font-bold text-brand-600">&#8358;{cartTotal.toLocaleString()}</span>
          </div>
          <button onClick={completeSale} disabled={submitting || cart.length === 0} className="btn-primary disabled:opacity-50">
            {submitting ? "Recording..." : "Complete Sale"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">Sales History</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b">
              <th className="pb-2">Customer</th><th className="pb-2">Items</th>
              <th className="pb-2">Total</th><th className="pb-2">Date</th><th className="pb-2">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => {
              const itemCount = s.sale_items.reduce((n, i) => n + i.quantity, 0);
              const isOpen = expanded === s.id;
              return (
                <Fragment key={s.id}>
                  <tr className="border-b last:border-0">
                    <td className="py-2">{s.customers?.customer_name || "Walk-in"}</td>
                    <td className="py-2">
                      <button onClick={() => setExpanded(isOpen ? null : s.id)} className="text-brand-600 text-xs font-medium">
                        {s.sale_items.length} product{s.sale_items.length !== 1 ? "s" : ""} ({itemCount} units) {isOpen ? "\u25b2" : "\u25bc"}
                      </button>
                    </td>
                    <td className="py-2">&#8358;{Number(s.total_amount).toLocaleString()}</td>
                    <td className="py-2 text-slate-500">{dayjs(s.sale_date).format("D MMM, h:mm A")}</td>
                    <td className="py-2">
                      <InvoiceDownloadButton
                        data={{
                          invoiceNumber: s.id.slice(0, 8).toUpperCase(),
                          date: dayjs(s.sale_date).format("D MMM YYYY"),
                          customerName: s.customers?.customer_name || "Walk-in Customer",
                          items: s.sale_items.map((i) => ({
                            productName: i.products?.product_name || "",
                            quantity: i.quantity,
                            unitPrice: Number(i.unit_price),
                            subtotal: Number(i.subtotal),
                          })),
                          totalAmount: Number(s.total_amount),
                        }}
                      />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={5} className="px-4 py-3">
                        <ul className="text-xs text-slate-600 space-y-1">
                          {s.sale_items.map((i) => (
                            <li key={i.id} className="flex justify-between max-w-md">
                              <span>{i.products?.product_name} &times; {i.quantity}</span>
                              <span>&#8358;{Number(i.subtotal).toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {sales.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">No sales recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
