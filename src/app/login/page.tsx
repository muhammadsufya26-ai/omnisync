"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Phone,
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
  const [loadingActionLabel, setLoadingActionLabel] =
    useState<string>("Signing in...");
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
      "Signing in..."
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
      "Verifying order access..."
    );
  };

  const handleAutoFill = async (type: "owner" | "customer") => {
    if (type === "owner") {
      setActiveTab("owner");
      setOwnerEmail("owner@omnisync.com");
      setOwnerPassword("admin123");
      await executeLoginRequest(
        {
          portal: "owner",
          email: "owner@omnisync.com",
          password: "admin123",
          rememberMe: true,
          redirectTo: redirectParam,
        },
        "Signing in as Owner..."
      );
    } else {
      setActiveTab("customer");
      setCustomerIdentifier("+92-333-5120987");
      setCustomerEmail("ayesha.malik@example.com");
      await executeLoginRequest(
        {
          portal: "customer",
          identifier: "+92-333-5120987",
          email: "ayesha.malik@example.com",
          rememberMe: true,
        },
        "Signing in as Customer..."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              OmniSync
            </h1>
            <p className="text-sm text-slate-500">
              Sign in to manage your orders and shipments
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
          {/* Tab Switcher: Store Owner vs Track Your Order */}
          <div
            role="tablist"
            aria-label="Portal Selection"
            className="grid grid-cols-2 p-1 rounded-lg bg-slate-100 border border-slate-200/70"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "owner"}
              onClick={() => {
                setActiveTab("owner");
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "owner"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Store Owner
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "customer"}
              onClick={() => {
                setActiveTab("customer");
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "customer"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Track Your Order
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Forgot Password Notice */}
          {forgotPasswordNotice && activeTab === "owner" && (
            <div
              role="status"
              className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1"
            >
              <p className="font-medium text-slate-900">
                Demo Password Reset
              </p>
              <p>
                Default credentials are <span className="font-mono text-slate-800">owner@omnisync.com</span> / <span className="font-mono text-slate-800">admin123</span>. You can also use the demo autofill below.
              </p>
            </div>
          )}

          {/* Form: Store Owner */}
          {activeTab === "owner" ? (
            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="owner-email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Email Address
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
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg pl-10 pr-3.5 py-2.5 transition-all outline-none"
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
                    className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
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
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg pl-10 pr-10 py-2.5 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                  <span>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingActionLabel}</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Form: Customer Track & Order */
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
                    placeholder="+92 333 5120987 or ORD-9040"
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg pl-10 pr-3.5 py-2.5 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="customer-email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Email Address
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
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg pl-10 pr-3.5 py-2.5 transition-all outline-none"
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
                  <span>Remember this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingActionLabel}</span>
                  </>
                ) : (
                  <>
                    <span>Track Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Toned Down Demo Login Section */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <p className="text-xs text-slate-500 text-center">
              Testing the platform? Choose a role to auto-fill:
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleAutoFill("owner")}
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs py-1.5 px-3 rounded-md transition-colors cursor-pointer disabled:opacity-60 font-medium"
              >
                Owner Demo
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleAutoFill("customer")}
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs py-1.5 px-3 rounded-md transition-colors cursor-pointer disabled:opacity-60 font-medium"
              >
                Customer Demo
              </button>
            </div>
          </div>
        </div>

        {/* Quiet Footer Links */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Need to check a package?</span>
          <Link
            href="/track/ORD-9040"
            className="text-slate-700 hover:text-slate-900 font-medium transition-colors"
          >
            Track shipment →
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
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
