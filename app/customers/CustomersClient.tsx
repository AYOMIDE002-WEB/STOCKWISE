"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Avatar from "../components/Avatar";

type Customer = { id: string; customer_name: string; phone_number: string | null; address: string | null };

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ customer_name: "", phone_number: "", address: "" });
  const [error, setError] = useState("");

  async function refresh() {
    const { data } = await supabase.from("customers").select("*").order("customer_name");
    setCustomers(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (editing) {
      const { error } = await supabase.from("customers").update(form).eq("id", editing.id);
      if (error) { setError(error.message); return; }
    } else {
      const { error } = await supabase.from("customers").insert(form);
      if (error) { setError(error.message); return; }
    }
    setEditing(null);
    setForm({ customer_name: "", phone_number: "", address: "" });
    refresh();
  }

  function startEdit(c: Customer) {
    setEditing(c);
    setForm({ customer_name: c.customer_name, phone_number: c.phone_number || "", address: c.address || "" });
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-accent-danger text-sm rounded-lg px-3 py-2">{error}</div>}

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">{editing ? "Edit Customer" : "Add New Customer"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <input required placeholder="Customer name" className="input-field flex-1 min-w-[160px]"
            value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input placeholder="Phone number" className="input-field flex-1 min-w-[140px]"
            value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <input placeholder="Address" className="input-field flex-1 min-w-[160px]"
            value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <button type="submit" className="btn-primary">{editing ? "Save Changes" : "Add Customer"}</button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm({ customer_name: "", phone_number: "", address: "" }); }} className="btn-secondary">
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">All Customers</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b">
              <th className="pb-2">Name</th><th className="pb-2">Phone</th><th className="pb-2">Address</th><th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.customer_name} size={30} />
                    {c.customer_name}
                  </div>
                </td>
                <td className="py-2">{c.phone_number}</td>
                <td className="py-2">{c.address}</td>
                <td className="py-2"><button onClick={() => startEdit(c)} className="text-brand-600 font-medium text-xs">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
