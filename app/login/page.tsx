"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import WatermarkBackground from "../components/WatermarkBackground";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-violet-50 px-4">
      <WatermarkBackground />

      <div className="relative z-10 w-full max-w-sm p-[2px] rounded-2xl bg-gradient-to-br from-brand-400 via-violet-300 to-amber-300 shadow-xl shadow-brand-900/10">
        <div className="bg-gradient-to-br from-white via-white to-brand-50/60 rounded-[calc(1rem-2px)] p-8">
          <div className="flex flex-col items-center mb-2">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg shadow-brand-500/30">
              S
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
              Stockwise
            </h1>
          </div>
          <p className="text-sm text-slate-500 text-center mt-1 mb-6">
            Sign in to manage your business
          </p>

          {error && (
            <div className="bg-red-50 text-accent-danger text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full mt-1"
                placeholder="you@business.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full mt-1"
                placeholder="****************************************************************"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 transition-colors shadow-md shadow-brand-500/25"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
