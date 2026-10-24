"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, Receipt, Users, UserCog, LogOut, Boxes } from "lucide-react";
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
      {/* Desktop glass sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col sticky top-3 self-start h-[calc(100vh-1.5rem)] m-3 mr-0 rounded-2xl bg-white/[0.45] backdrop-blur-2xl border border-white/70 shadow-glass">
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white flex items-center justify-center shadow-md shadow-brand-500/30">
              <Boxes size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Stockwise</span>
          </div>
          <div className={`mt-4 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${isOnline ? "bg-emerald-100/70 text-emerald-700 border-emerald-200/70" : "bg-amber-100/80 text-amber-800 border-amber-200"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-600"}`} />
            {isOnline ? "Online" : "Offline mode"}
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === item.href
                  ? "bg-white/80 text-brand-700 shadow-sm border border-white"
                  : "text-slate-600 hover:bg-white/50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <item.Icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-white/50 hover:text-slate-900 transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile glass top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-white/60 backdrop-blur-xl border-b border-white/70 text-slate-800 flex items-center justify-between px-4 h-14 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white flex items-center justify-center">
            <Boxes size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight">Stockwise</span>
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${isOnline ? "bg-emerald-100/70 text-emerald-700 border-emerald-200/70" : "bg-amber-100/80 text-amber-800 border-amber-200"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-600"}`} />
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1 text-sm font-medium text-slate-600 px-2 py-1">
          <LogOut size={16} /> Logout
        </button>
      </header>

      {/* Mobile glass bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/60 backdrop-blur-xl border-t border-white/70 flex justify-around">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-[11px] font-medium ${
              pathname === item.href ? "text-brand-600" : "text-slate-500"
            }`}
          >
            <span className={`px-3 py-1 rounded-full ${pathname === item.href ? "bg-white/80 shadow-sm" : ""}`}>
              <item.Icon size={20} />
            </span>
            <span className="mt-0.5">{item.label === "Manage Users" ? "Users" : item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
