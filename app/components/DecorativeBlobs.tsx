import { LayoutDashboard, Package, Receipt, Users, ShieldCheck } from "lucide-react";

const THEMES: Record<string, { a: string; b: string; icon: string }> = {
  blue: { a: "bg-indigo-300", b: "bg-sky-300", icon: "text-indigo-400" },
  teal: { a: "bg-teal-300", b: "bg-emerald-300", icon: "text-teal-400" },
  amber: { a: "bg-amber-300", b: "bg-orange-300", icon: "text-amber-400" },
  violet: { a: "bg-violet-300", b: "bg-fuchsia-300", icon: "text-violet-400" },
  slate: { a: "bg-slate-300", b: "bg-blue-300", icon: "text-slate-400" },
};

const MARKS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  blue: LayoutDashboard,
  teal: Package,
  amber: Receipt,
  violet: Users,
  slate: ShieldCheck,
};

/**
 * Static glass orbs plus one large, faint Lucide mark. No animation on blurred
 * layers (they repaint expensively and caused input lag earlier).
 */
export default function DecorativeBlobs({ theme = "blue" }: { theme?: keyof typeof THEMES }) {
  const t = THEMES[theme];
  const Mark = MARKS[theme];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className={`absolute -top-20 -right-16 w-80 h-80 rounded-full ${t.a} opacity-30 blur-3xl`} />
      <div className={`absolute top-48 -left-24 w-72 h-72 rounded-full ${t.b} opacity-25 blur-3xl`} />
      <Mark className={`absolute -bottom-10 -right-6 w-72 h-72 ${t.icon} opacity-[0.12] rotate-[8deg]`} strokeWidth={0.75} />
    </div>
  );
}
