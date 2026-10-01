"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, Receipt, Users, UserCog, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/sales", label: "Sales", Icon: Receipt },
  { href: "/customers", label: "Customers", Icon: Users },
];

export default function Sidebar({ role }: { role: "Admin" | "Staff" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const items = role === "Admin"
    ? [...NAV_ITEMS, { href: "/manage-users", label: "Manage Users", Icon: UserCog }]
    : NAV_ITEMS;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-brand-600 text-white min-h-screen flex-col">
        <div className="px-6 py-6">
          <span className="text-xl font-bold tracking-tight">Stockwise</span>
          <div className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${isOnline ? "bg-white/10 text-brand-100" : "bg-amber-400/90 text-amber-950"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-amber-800"}`} />
            {isOnline ? "Online" : "Offline mode"}
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-white/15 text-white"
                  : "text-brand-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.Icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-100 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-brand-600 text-white flex items-center justify-between px-4 h-14 shadow">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Stockwise</span>
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${isOnline ? "bg-white/10 text-brand-100" : "bg-amber-400/90 text-amber-950"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-amber-800"}`} />
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <button onClick={handleLogout} className="text-sm font-medium text-brand-100 px-2 py-1">
          Logout
        </button>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex justify-around">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-[11px] font-medium ${
              pathname === item.href ? "text-brand-600" : "text-slate-500"
            }`}
          >
            <item.Icon size={22} />
            <span className="mt-0.5">{item.label === "Manage Users" ? "Users" : item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
