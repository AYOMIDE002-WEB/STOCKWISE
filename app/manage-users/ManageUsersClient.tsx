"use client";

import { useState } from "react";
import dayjs from "dayjs";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";

type UserRow = { id: string; full_name: string; role: "Admin" | "Staff"; created_at: string };

export default function ManageUsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "Staff" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    if (editing) {
      const res = await fetch("/api/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editing.id,
          full_name: form.full_name,
          role: form.role,
          password: form.password || undefined,
        }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) { setError(body.error); return; }
      setSuccess(`User "${form.full_name}" updated.`);
      setEditing(null);
      setForm({ full_name: "", email: "", password: "", role: "Staff" });
      window.location.reload();
      return;
    }

    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) { setError(body.error); return; }
    setSuccess(`User "${form.full_name}" created successfully.`);
    setForm({ full_name: "", email: "", password: "", role: "Staff" });
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user account?")) return;
    const res = await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error); return; }
    window.location.reload();
  }

  function startEdit(u: UserRow) {
    setEditing(u);
    setForm({ full_name: u.full_name, email: "", password: "", role: u.role });
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-accent-danger text-sm rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="bg-emerald-50 text-accent-success text-sm rounded-lg px-3 py-2">{success}</div>}

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">{editing ? "Edit User" : "Add New User"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <input required placeholder="Full name" className="input-field flex-1 min-w-[160px]"
            value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          {!editing && (
            <input required type="email" placeholder="Email" className="input-field flex-1 min-w-[180px]"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          )}
          <input type="password" placeholder={editing ? "New password (leave blank to keep)" : "Password (min. 6 chars)"}
            required={!editing} className="input-field flex-1 min-w-[180px]"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
          </select>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : editing ? "Save Changes" : "Create User"}
          </button>
          {editing && (
            <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm({ full_name: "", email: "", password: "", role: "Staff" }); }}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">All Users</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b">
              <th className="pb-2">Full Name</th><th className="pb-2">Role</th><th className="pb-2">Created</th><th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.full_name} size={30} />
                    {u.full_name}
                  </div>
                </td>
                <td className="py-2">
                  <Badge tone={u.role === "Admin" ? "admin" : "staff"}>{u.role}</Badge>
                </td>
                <td className="py-2 text-slate-500">{dayjs(u.created_at).format("D MMM YYYY")}</td>
                <td className="py-2 space-x-2">
                  <button onClick={() => startEdit(u)} className="text-brand-600 font-medium text-xs">Edit</button>
                  {u.id !== currentUserId ? (
                    <button onClick={() => handleDelete(u.id)} className="text-accent-danger text-xs">Delete</button>
                  ) : (
                    <span className="text-slate-400 text-xs italic">(you)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
