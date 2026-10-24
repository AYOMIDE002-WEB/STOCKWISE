"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Badge from "../components/Badge";

const fmtQty = (n: number) => Number(Number(n).toFixed(3)).toString();

type Product = {
  id: string;
  unit: string | null;
  product_name: string;
  category: string | null;
  quantity_in_stock: number;
  unit_price: number;
};

export default function ProductsClient({
  initialProducts,
  isAdmin,
}: {
  initialProducts: Product[];
  isAdmin: boolean;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ product_name: "", category: "", quantity_in_stock: "", unit_price: "", unit: "" });
  const [restockQty, setRestockQty] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function refresh() {
    const { data } = await supabase.from("products").select("*").order("product_name");
    setProducts(data || []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.from("products").insert({
      product_name: form.product_name,
      category: form.category,
      quantity_in_stock: Number(form.quantity_in_stock),
      unit_price: Number(form.unit_price),
      unit: form.unit.trim() || "unit",
    });
    if (error) { setError(error.message); return; }
    setForm({ product_name: "", category: "", quantity_in_stock: "", unit_price: "", unit: "" });
    refresh();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase
      .from("products")
      .update({
        product_name: form.product_name,
        category: form.category,
        unit_price: Number(form.unit_price),
        unit: form.unit.trim() || "unit",
      })
      .eq("id", editing.id);
    if (error) { setError(error.message); return; }
    setEditing(null);
    setForm({ product_name: "", category: "", quantity_in_stock: "", unit_price: "", unit: "" });
    refresh();
  }

  async function handleRestock(id: string) {
    const qty = Number(restockQty[id] || 0);
    if (qty <= 0) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const { error } = await supabase
      .from("products")
      .update({ quantity_in_stock: Math.round((Number(product.quantity_in_stock) + qty) * 1000) / 1000 })
      .eq("id", id);
    if (error) { setError(error.message); return; }
    setRestockQty((prev) => ({ ...prev, [id]: "" }));
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    const { count } = await supabase.from("sale_items").select("*", { count: "exact", head: true }).eq("product_id", id);
    if (count && count > 0) {
      setError("This product can't be deleted because it has sales records linked to it.");
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { setError(error.message); return; }
    refresh();
  }

  function startEdit(p: Product) {
    setEditing(p);
    setForm({ product_name: p.product_name, category: p.category || "", quantity_in_stock: String(p.quantity_in_stock), unit_price: String(p.unit_price), unit: p.unit || "" });
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-accent-danger text-sm rounded-lg px-3 py-2">{error}</div>}

      {isAdmin ? (
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-4">{editing ? "Edit Product" : "Add New Product"}</h2>
          <form onSubmit={editing ? handleUpdate : handleAdd} className="flex flex-wrap gap-3">
            <input required placeholder="Product name" className="input-field flex-1 min-w-[160px]"
              value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            <input placeholder="Category" className="input-field flex-1 min-w-[140px]"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            {!editing && (
              <input required type="number" min={0} step="any" placeholder="Quantity" className="input-field w-32"
                value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })} />
            )}
            <input list="unit-options" placeholder="Unit (e.g. derica)" className="input-field w-40"
              value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <datalist id="unit-options">
              {["unit", "derica", "half derica", "bag", "carton", "kg", "litre", "pack", "piece", "tin", "cup"].map((u) => <option key={u} value={u} />)}
            </datalist>
            <input required type="number" min={0} step="0.01" placeholder="Price per unit" className="input-field w-32"
              value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            <button type="submit" className="btn-primary">{editing ? "Save Changes" : "Add Product"}</button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm({ product_name: "", category: "", quantity_in_stock: "", unit_price: "", unit: "" }); }} className="btn-secondary">
                Cancel
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="card text-sm text-slate-500">
          You&apos;re viewing products in read-only mode. Adding, restocking, editing, and deleting requires an Admin account.
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">All Products</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b">
              <th className="pb-2">Name</th><th className="pb-2">Category</th><th className="pb-2">Stock</th>
              <th className="pb-2">Unit Price</th>
              {isAdmin && <th className="pb-2">Restock</th>}
              {isAdmin && <th className="pb-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">{p.product_name}</td>
                <td className="py-2">{p.category}</td>
                <td className="py-2">
                  {p.quantity_in_stock < 10 ? (
                    <Badge tone="low">{fmtQty(p.quantity_in_stock)} {p.unit || "unit"} left</Badge>
                  ) : (
                    <Badge tone="ok">{fmtQty(p.quantity_in_stock)} {p.unit || "unit"} in stock</Badge>
                  )}
                </td>
                <td className="py-2">&#8358;{Number(p.unit_price).toLocaleString()} <span className="text-xs text-slate-400">/ {p.unit || "unit"}</span></td>
                {isAdmin && (
                  <td className="py-2">
                    <div className="flex gap-2">
                      <input type="number" min={0} step="any" placeholder="Qty" className="input-field w-20 py-1"
                        value={restockQty[p.id] || ""} onChange={(e) => setRestockQty((prev) => ({ ...prev, [p.id]: e.target.value }))} />
                      <button onClick={() => handleRestock(p.id)} className="text-xs bg-accent-success text-white px-2 py-1 rounded-lg">Restock</button>
                    </div>
                  </td>
                )}
                {isAdmin && (
                  <td className="py-2 space-x-2">
                    <button onClick={() => startEdit(p)} className="text-brand-600 font-medium text-xs">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-accent-danger text-xs">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
