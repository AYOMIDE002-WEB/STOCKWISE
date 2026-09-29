"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

export default function DashboardCharts({
  revenueData,
  topProducts,
}: {
  revenueData: { date: string; total: number }[];
  topProducts: { name: string; qty: number }[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">Revenue \u2014 Last 14 Days</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `\u20a6${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [`\u20a6${v.toLocaleString()}`, "Revenue"]} />
            <Line type="monotone" dataKey="total" stroke="#2E75B6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">Top-Selling Products \u2014 Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip />
            <Bar dataKey="qty" fill="#2E75B6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {topProducts.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-2">No sales data yet this period.</p>
        )}
      </div>
    </div>
  );
}
