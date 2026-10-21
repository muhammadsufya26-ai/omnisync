"use client";

import { useState } from "react";
import { ShieldCheck, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [role, setRole] = useState<"OWNER" | "CUSTOMER">("OWNER");
  const [email, setEmail] = useState("whotf.sufii@gmail.com");
  const [password, setPassword] = useState("Sufii@3003");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    // Validate Admin/Owner credentials
    if (role === "OWNER") {
      const isSufiiAdmin = cleanEmail === "whotf.sufii@gmail.com" && password === "Sufii@3003";
      const isDefaultOwner = cleanEmail === "owner@omnisync.com" && password === "admin123";

      if (!isSufiiAdmin && !isDefaultOwner) {
        setErrorMessage("Invalid admin credentials. Please use whotf.sufii@gmail.com / Sufii@3003");
        return;
      }
    }

    setLoading(true);

    // Fire-and-forget instant login alert notification email in background
    if (role === "OWNER") {
      try {
        fetch("/api/auth/notify-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        }).catch((err) => console.warn("[notify-login] Background alert dispatch:", err));
      } catch {
        // Non-blocking background notification
      }
    }

    const targetRoute = role === "OWNER" ? "/orders" : "/customer/orders";

    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "OWNER"
            ? { portal: "owner", email: cleanEmail, password }
            : { portal: "customer", identifier: cleanEmail, email: cleanEmail }
        ),
      });
    } catch {
      // Continue with client fallback if network fails
    }

    if (typeof window !== "undefined") {
      const sessionToken = "session_token_" + Date.now() + "_" + role;
      const userPayload = JSON.stringify({
        role: role,
        email: cleanEmail,
        name: role === "OWNER" ? (cleanEmail.includes("sufii") ? "Sufii (Admin)" : "Store Owner") : "Ayesha Malik",
      });

      document.cookie = `omnisync_session=${sessionToken}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `omnisync_user=${encodeURIComponent(userPayload)}; path=/; max-age=2592000; SameSite=Lax`;

      localStorage.setItem("omnisync_user_role", role);
      localStorage.setItem("omnisync_user_email", cleanEmail);

      // Hard direct location navigation guarantees immediate page change without getting stuck
      window.location.href = targetRoute;
    }
  };

  const setDemoUser = (userRole: "OWNER" | "CUSTOMER") => {
    setRole(userRole);
    setErrorMessage(null);
    if (userRole === "OWNER") {
      setEmail("whotf.sufii@gmail.com");
      setPassword("Sufii@3003");
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

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

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
                placeholder={role === "OWNER" ? "whotf.sufii@gmail.com" : "0300-1234567"}
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
          <p className="text-[11px] text-slate-400 mb-2">Admin fast access:</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setDemoUser("OWNER")}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
            >
              Fill Admin (Sufii)
            </button>
            <button
              type="button"
              onClick={() => setDemoUser("CUSTOMER")}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
            >
              Fill Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
