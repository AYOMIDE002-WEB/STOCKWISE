"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "\ud83d\udcca" },
  { href: "/products", label: "Products", icon: "\ud83d\udce6" },
  { href: "/sales", label: "Sales", icon: "\ud83e\uddfe" },
  { href: "/customers", label: "Customers", icon: "\ud83d\udc65" },
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
    ? [...NAV_ITEMS, { href: "/manage-users", label: "Manage Users", icon: "\ud83d\udd10" }]
    : NAV_ITEMS;

  return (
    <aside className="w-60 shrink-0 bg-brand-600 text-white min-h-screen flex flex-col">
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
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-100 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span>\ud83d\udeaa</span> Logout
        </button>
      </div>
    </aside>
  );
}
