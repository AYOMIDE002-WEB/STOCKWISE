import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import Sidebar from "../components/Sidebar";
import DashboardCharts from "./DashboardCharts";
import PageHeader from "../components/PageHeader";
import DecorativeBlobs from "../components/DecorativeBlobs";
import { DashboardIcon } from "../components/Icons";
import dayjs from "dayjs";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as "Admin" | "Staff") || "Staff";

  const [{ count: totalProducts }, { count: lowStockCount }, { count: totalCustomers }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).lt("quantity_in_stock", 10),
      supabase.from("customers").select("*", { count: "exact", head: true }),
    ]);

  const thirtyDaysAgo = dayjs().subtract(30, "day").toISOString();
  const { data: recentSales } = await supabase
    .from("sales")
    .select("id, total_amount, sale_date, customers(customer_name), sale_items(quantity, products(product_name))")
    .gte("sale_date", thirtyDaysAgo)
    .order("sale_date", { ascending: false });

  const salesRows = recentSales || [];

  const todayStr = dayjs().format("YYYY-MM-DD");
  const todaysSales = salesRows
    .filter((s: any) => dayjs(s.sale_date).format("YYYY-MM-DD") === todayStr)
    .reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);

  // Revenue by day (last 14 days) for the line chart
  const revenueByDay: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    revenueByDay[dayjs().subtract(i, "day").format("MMM D")] = 0;
  }
  salesRows.forEach((s: any) => {
    const key = dayjs(s.sale_date).format("MMM D");
    if (key in revenueByDay) revenueByDay[key] += Number(s.total_amount);
  });
  const revenueChartData = Object.entries(revenueByDay).map(([date, total]) => ({ date, total }));

  // Top 5 products by quantity sold (last 30 days)
  const productTotals: Record<string, number> = {};
  salesRows.forEach((s: any) => {
    (s.sale_items || []).forEach((item: any) => {
      const name = item.products?.product_name || "Unknown";
      productTotals[name] = (productTotals[name] || 0) + item.quantity;
    });
  });
  const topProductsData = Object.entries(productTotals)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="flex">
      <Sidebar role={role} />
      <main className="relative flex-1 p-8 max-w-6xl">
        <DecorativeBlobs theme="blue" />
        <PageHeader
          icon={<DashboardIcon />}
          title="Dashboard"
          subtitle={`Welcome back, ${profile?.full_name || "there"}`}
          theme="blue"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Total Products" value={String(totalProducts ?? 0)} />
          <SummaryCard label="Low Stock Items" value={String(lowStockCount ?? 0)} tone="warning" />
          <SummaryCard label="Total Customers" value={String(totalCustomers ?? 0)} />
          <SummaryCard
            label="Today's Sales"
            value={`\u20a6${todaysSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            tone="success"
          />
        </div>

        <DashboardCharts revenueData={revenueChartData} topProducts={topProductsData} />

        <div className="card mt-8">
          <h2 className="font-semibold text-slate-700 mb-4">Recent Sales</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b">
                <th className="pb-2">Items</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Units</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {salesRows.slice(0, 8).map((s: any) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2">
                    {(s.sale_items || []).map((i: any) => i.products?.product_name).filter(Boolean).slice(0, 2).join(", ")}
                    {(s.sale_items || []).length > 2 ? ` +${s.sale_items.length - 2} more` : ""}
                  </td>
                  <td className="py-2">{s.customers?.customer_name || "Walk-in"}</td>
                  <td className="py-2">{(s.sale_items || []).reduce((n: number, i: any) => n + i.quantity, 0)}</td>
                  <td className="py-2">&#8358;{Number(s.total_amount).toLocaleString()}</td>
                  <td className="py-2 text-slate-500">{dayjs(s.sale_date).format("D MMM, h:mm A")}</td>
                </tr>
              ))}
              {salesRows.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400">No sales recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "warning" | "success" }) {
  const borderColor =
    tone === "warning" ? "border-l-accent-warning" : tone === "success" ? "border-l-accent-success" : "border-l-brand-500";
  return (
    <div className={`card border-l-4 ${borderColor}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-brand-600 mt-1">{value}</p>
    </div>
  );
}
