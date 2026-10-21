"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Lock, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"OWNER" | "CUSTOMER">("OWNER");
  const [email, setEmail] = useState("owner@omnisync.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (role === "OWNER") {
        router.push("/orders");
      } else {
        router.push("/customer/orders");
      }
    }, 500);
  };

  const setDemoUser = (userRole: "OWNER" | "CUSTOMER") => {
    setRole(userRole);
    if (userRole === "OWNER") {
      setEmail("owner@omnisync.com");
      setPassword("admin123");
    } else {
      setEmail("ayesha.malik@example.com");
      setPassword("customer123");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-3 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">OmniSync</h1>
        <p className="text-sm text-slate-500 mt-1">Multi-channel order fulfillment & dispatch</p>
      </div>

      <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setDemoUser("OWNER")}
            className={`py-2 text-xs font-medium rounded-md transition-all ${
              role === "OWNER"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Store Owner
          </button>
          <button
            type="button"
            onClick={() => setDemoUser("CUSTOMER")}
            className={`py-2 text-xs font-medium rounded-md transition-all ${
              role === "CUSTOMER"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Track Order
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {role === "OWNER" ? "Work Email" : "Registered Email or Phone"}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "OWNER" ? "name@company.com" : "0300-1234567"}
                className="w-full pl-9 pr-3 h-10 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-900">
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 h-10 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 rounded-lg transition-all disabled:opacity-60"
          >
            {loading ? "Signing in..." : role === "OWNER" ? "Sign in to Dashboard" : "View My Orders"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 mb-2">Demo fast access:</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setDemoUser("OWNER")}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              Fill Owner
            </button>
            <button
              type="button"
              onClick={() => setDemoUser("CUSTOMER")}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              Fill Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
