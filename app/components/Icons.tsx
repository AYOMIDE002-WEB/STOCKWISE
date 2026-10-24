import { LayoutDashboard, Package, Receipt, Users, ShieldCheck } from "lucide-react";

const size = { className: "w-6 h-6", strokeWidth: 1.75 } as const;

export function DashboardIcon() {
  return <LayoutDashboard {...size} />;
}
export function BoxIcon() {
  return <Package {...size} />;
}
export function ReceiptIcon() {
  return <Receipt {...size} />;
}
export function UsersIcon() {
  return <Users {...size} />;
}
export function ShieldIcon() {
  return <ShieldCheck {...size} />;
}
