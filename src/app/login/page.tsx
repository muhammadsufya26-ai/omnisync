"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  KeyRound,
  Terminal,
  Truck,
  Building2,
  UserCheck,
  Phone,
  PackageSearch,
} from "lucide-react";
import { useOmniSync, type UserRole } from "@/context/OmniSyncContext";

type LoginPortalTab = "owner" | "customer";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCurrentRole } = useOmniSync();

  const redirectParam = searchParams.get("from") || "/orders";
  const initialTab: LoginPortalTab =
    searchParams.get("tab") === "customer" ||
    redirectParam.startsWith("/customer")
      ? "customer"
      : "owner";

  const [activeTab, setActiveTab] = useState<LoginPortalTab>(initialTab);

  // Tab 1: Business Owner / Staff State
  const [ownerEmail, setOwnerEmail] = useState<string>("owner@omnisync.com");
  const [ownerPassword, setOwnerPassword] = useState<string>("admin123");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Tab 2: Customer Track & Order Portal State
  const [customerIdentifier, setCustomerIdentifier] =
    useState<string>("+92-333-5120987");
  const [customerEmail, setCustomerEmail] = useState<string>(
    "ayesha.malik@example.com"
  );

  // Shared Form State
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingActionLabel, setLoadingActionLabel] = useState<string>(
    "Signing in..."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPasswordNotice, setForgotPasswordNotice] =
    useState<boolean>(false);

  const executeLoginRequest = async (
    payload: Record<string, unknown>,
    loadingText: string
  ) => {
    if (isLoading) return;
    setErrorMessage(null);
    setForgotPasswordNotice(false);
    setLoadingActionLabel(loadingText);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        redirectTo?: string;
        user?: {
          id: string;
          email: string;
          name: string;
          role: "OWNER" | "STAFF" | "CUSTOMER";
          uiRole?: UserRole;
        };
      };

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.error || "Authentication failed. Please check your credentials."
        );
        setIsLoading(false);
        return;
      }

      if (data.user?.uiRole) {
        setCurrentRole(data.user.uiRole);
      } else if (data.user?.role === "OWNER") {
        setCurrentRole("OWNER");
      }

      const targetRoute =
        data.redirectTo ||
        (data.user?.role === "CUSTOMER" ? "/customer/orders" : "/orders");
      router.push(targetRoute);
      router.refresh();
    } catch {
      setErrorMessage(
        "Network error while reaching authentication service. Please try again."
      );
      setIsLoading(false);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLoginRequest(
      {
        portal: "owner",
        email: ownerEmail.trim(),
        password: ownerPassword,
        rememberMe,
        redirectTo: redirectParam,
      },
      "Signing in to Owner Hub..."
    );
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLoginRequest(
      {
        portal: "customer",
        identifier: customerIdentifier.trim(),
        email: customerEmail.trim(),
        rememberMe,
      },
      "Opening Customer Portal..."
    );
  };

  // Instant 1-Click Test Quick-Login Handlers
  const handleQuickLoginOwner = async () => {
    setActiveTab("owner");
    setOwnerEmail("owner@omnisync.com");
    setOwnerPassword("admin123");
    await executeLoginRequest(
      {
        portal: "owner",
        email: "owner@omnisync.com",
        password: "admin123",
        rememberMe: true,
        redirectTo: "/orders",
      },
      "Logging in as Owner (Admin)..."
    );
  };

  const handleQuickLoginCustomer = async (
    email = "ayesha.malik@example.com",
    phone = "+92-333-5120987",
    label = "Ayesha Malik"
  ) => {
    setActiveTab("customer");
    setCustomerIdentifier(phone);
    setCustomerEmail(email);
    await executeLoginRequest(
      {
        portal: "customer",
        identifier: phone,
        email,
        rememberMe: true,
      },
      `Logging in as Customer (${label})...`
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center px-4 py-10 relative">
      {/* Main Centered Auth Card Wrapper */}
      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Top Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                OmniSync
              </span>
              <p className="text-xs text-slate-500">
                Store Operations &amp; Order Portal
              </p>
            </div>
          </div>
        </div>

        {/* Center SaaS Dual-Portal Login Card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6">
          {/* Dual Portal Tab Switcher */}
          <div
            role="tablist"
            aria-label="Select Login Portal"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "owner"}
              onClick={() => {
                setActiveTab("owner");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "owner"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Business Owner / Staff</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "customer"}
              onClick={() => {
                setActiveTab("customer");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "customer"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PackageSearch className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Customer Track &amp; Order Portal</span>
            </button>
          </div>

          {/* Active Tab Heading */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {activeTab === "owner"
                  ? "Merchant & Staff Sign In"
                  : "Customer Order Portal"}
              </h1>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                {activeTab === "owner" ? "Role: Owner / Staff" : "Role: Customer"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {activeTab === "owner"
                ? "Sign in with your store credentials to manage orders and inventory."
                : "Enter your Phone Number or Order ID and Email to track your deliveries."}
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Forgot Password Stub Notice */}
          {forgotPasswordNotice && activeTab === "owner" && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800"
            >
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  Password Reset Dispatched (Demo Stub)
                </p>
                <p className="text-amber-800 mt-0.5">
                  An administrator recovery link was dispatched to{" "}
                  <span className="font-mono underline">
                    {ownerEmail || "owner@omnisync.com"}
                  </span>
                  . Use the Quick-Login buttons below for instant access.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1 FORM: Business Owner / Staff */}
          {activeTab === "owner" ? (
            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="owner-email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Owner / Staff Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="owner-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@omnisync.com"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="owner-password"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordNotice(true)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="owner-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/10 cursor-pointer"
                  />
                  <span>Remember me for 30 days</span>
                </label>

                <span className="text-[11px] font-mono text-slate-400">
                  Redirects to /orders
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingActionLabel}</span>
                  </>
                ) : (
                  <>
                    <span>Sign in as Business Owner</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2 FORM: Customer Track & Order Portal */
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="customer-identifier"
                  className="block text-xs font-medium text-slate-700"
                >
                  Phone Number or Order ID
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="customer-identifier"
                    name="identifier"
                    type="text"
                    required
                    value={customerIdentifier}
                    onChange={(e) => setCustomerIdentifier(e.target.value)}
                    placeholder="+92-333-5120987 or ORD-2026-1003"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="customer-email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Customer Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="customer-email"
                    name="customerEmail"
                    type="email"
                    autoComplete="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="ayesha.malik@example.com"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/10 cursor-pointer"
                  />
                  <span>Keep my order tracker signed in</span>
                </label>

                <span className="text-[11px] font-mono text-slate-400">
                  Redirects to /customer/orders
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingActionLabel}</span>
                  </>
                ) : (
                  <>
                    <span>View My Orders &amp; Live Tracking</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* One-Click Test Quick-Login Buttons Banner */}
          <div className="pt-5 border-t border-slate-100 space-y-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">
                    Instant Demo Quick-Login
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  Seeded Accounts
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Quick Login Button 1: Login as Owner (Admin) */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void handleQuickLoginOwner()}
                  className="flex flex-col items-start p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all text-left cursor-pointer group disabled:opacity-60"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <Building2 className="w-3.5 h-3.5" />
                      Login as Owner (Admin)
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-1 truncate w-full">
                    owner@omnisync.com
                  </p>
                </button>

                {/* Quick Login Button 2: Login as Customer */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void handleQuickLoginCustomer(
                      "ayesha.malik@example.com",
                      "+92-333-5120987",
                      "Ayesha Malik"
                    )
                  }
                  className="flex flex-col items-start p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all text-left cursor-pointer group disabled:opacity-60"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <UserCheck className="w-3.5 h-3.5" />
                      Login as Customer
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-1 truncate w-full">
                    ayesha.malik@example.com
                  </p>
                </button>
              </div>

              {/* Second Seeded Customer Option */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span>Alt Customer:</span>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void handleQuickLoginCustomer(
                      "sana.farooq@example.com",
                      "+92-301-7745210",
                      "Sana Farooq"
                    )
                  }
                  className="font-mono text-slate-700 hover:text-slate-900 underline cursor-pointer"
                >
                  Login as Sana Farooq →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Public Customer Order Tracker Shortcut */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Have a direct tracking number?</span>
          <Link
            href="/track/ORD-9040"
            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span>Direct Waybill Lookup (/track/ORD-9040) →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
