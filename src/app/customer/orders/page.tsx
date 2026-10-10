"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Copy,
  Check,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Search,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import type {
  SanitizedCustomerOrder,
  CustomerParcelStage,
} from "@/app/api/customer/orders/route";

const PARCEL_STAGES: CustomerParcelStage[] = [
  "Order Placed",
  "Dispatched",
  "Out for Delivery",
  "Delivered",
];

function getStageProgressIndex(stage: CustomerParcelStage): number {
  if (stage === "Order Placed" || stage === "Confirmed") return 0;
  if (stage === "Dispatched") return 1;
  if (stage === "Out for Delivery") return 2;
  if (stage === "Delivered") return 3;
  return 1;
}

const STAGE_BADGE_STYLES: Record<
  CustomerParcelStage,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  "Order Placed": {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  Confirmed: {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  Dispatched: {
    bg: "bg-sky-500/15",
    text: "text-sky-300",
    border: "border-sky-500/30",
    dot: "bg-sky-400",
  },
  "Out for Delivery": {
    bg: "bg-indigo-500/15",
    text: "text-indigo-300",
    border: "border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  Delivered: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
};

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function CustomerOrdersPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const restrictedParam = searchParams.get("restricted");
  const attemptedRoute = searchParams.get("attempted") || "/orders";

  const [customerProfile, setCustomerProfile] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
  }>({
    name: "Ayesha Malik",
    email: "ayesha.malik@example.com",
    phone: "+92-333-5120987",
    role: "CUSTOMER",
  });

  const [orders, setOrders] = useState<SanitizedCustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Delivered"
  >("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);
  const [showRestrictedToast, setShowRestrictedToast] = useState<boolean>(
    Boolean(restrictedParam)
  );

  useEffect(() => {
    if (restrictedParam) {
      setShowRestrictedToast(true);
    }
  }, [restrictedParam]);

  const fetchCustomerOrders = async (overrideEmail?: string) => {
    setIsLoading(true);
    try {
      const query = overrideEmail
        ? `?email=${encodeURIComponent(overrideEmail)}`
        : "";
      const res = await fetch(`/api/customer/orders${query}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          customer: {
            name: string;
            email: string;
            phone: string;
            role: string;
          };
          orders: SanitizedCustomerOrder[];
        };
        setCustomerProfile(data.customer);
        setOrders(data.orders);
      }
    } catch {
      // Keep existing state on transient error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomerOrders();
  }, []);

  const handleCopyTracking = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    setCopiedTrackingId(trackingNumber);
    setTimeout(() => {
      setCopiedTrackingId((prev) =>
        prev === trackingNumber ? null : prev
      );
    }, 2000);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login?tab=customer");
    router.refresh();
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All"
          ? true
          : statusFilter === "Delivered"
            ? order.parcelStatus === "Delivered"
            : order.parcelStatus !== "Delivered";
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.trackingNumber.toLowerCase().includes(q) ||
        order.courierName.toLowerCase().includes(q) ||
        order.items.some((i) => i.name.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const activeParcelsCount = useMemo(
    () => orders.filter((o) => o.parcelStatus !== "Delivered").length,
    [orders]
  );

  const deliveredCount = useMemo(
    () => orders.filter((o) => o.parcelStatus === "Delivered").length,
    [orders]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-16 selection:bg-sky-500 selection:text-neutral-950">
      {/* Top Customer Portal Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-neutral-950/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                  OmniSync
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Customer Order Portal
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate hidden sm:block">
                Signed in as {customerProfile.name} ({customerProfile.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch between the 2 seeded customer accounts for testing */}
            <select
              aria-label="Switch Seeded Customer Account"
              value={customerProfile.email}
              onChange={(e) => void fetchCustomerOrders(e.target.value)}
              className="hidden md:block px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-sky-500/50 cursor-pointer"
            >
              <option value="ayesha.malik@example.com">
                Ayesha Malik (3 Orders)
              </option>
              <option value="sana.farooq@example.com">
                Sana Farooq (2 Orders)
              </option>
            </select>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-rose-500/15 text-zinc-300 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile-Friendly Customer Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* RBAC Redirect Alert Banner (shown when a CUSTOMER attempts to visit /orders, /dashboard, /inventory, or /reconciliation) */}
        {showRestrictedToast && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/35 text-xs sm:text-sm text-amber-200 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">
                  Merchant Route Restricted (RBAC Guard Active)
                </p>
                <p className="text-xs text-amber-200/85 mt-0.5 leading-relaxed">
                  Your account has the{" "}
                  <strong className="font-mono">CUSTOMER</strong> role. Access
                  to internal store owner routes (
                  <code className="font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-300">
                    {attemptedRoute}
                  </code>
                  ) is restricted exclusively to{" "}
                  <strong className="font-mono">OWNER</strong> accounts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRestrictedToast(false)}
              aria-label="Dismiss alert"
              className="p-1 rounded-lg text-amber-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Customer Welcome & Summary Card */}
        <section className="rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-sky-950/25 border border-zinc-800/90 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                <span>Verified Customer Account</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Welcome back, {customerProfile.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  {customerProfile.email}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  {customerProfile.phone}
                </span>
              </div>
            </div>

            {/* Quick Parcel Counters */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-neutral-950/80 border border-zinc-800 text-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                  In Transit
                </p>
                <p className="text-xl font-bold text-sky-400 mt-0.5">
                  {activeParcelsCount}
                </p>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-neutral-950/80 border border-zinc-800 text-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                  Delivered
                </p>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">
                  {deliveredCount}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Portal Isolation Notice & RBAC Test Link */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Customer View: Wholesale pricing, supplier records, and internal
                AI risk scores are hidden.
              </span>
            </span>

            <Link
              href="/orders"
              className="text-[11px] font-medium text-sky-400 hover:text-sky-300 underline shrink-0"
            >
              Test RBAC Guard (Try opening /orders) →
            </Link>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your orders by Order #, Courier, or Product..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
            {(["All", "Active", "Delivered"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab
                    ? "bg-sky-500 text-neutral-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab === "All"
                  ? `All (${orders.length})`
                  : tab === "Active"
                    ? `In Transit (${activeParcelsCount})`
                    : `Delivered (${deliveredCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Orders Cards List */}
        {isLoading ? (
          <div className="rounded-2xl bg-neutral-900/60 border border-zinc-800 p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">
              Loading your personal orders and live courier tracking...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900/60 border border-zinc-800 p-12 text-center space-y-3">
            <Package className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-base font-semibold text-white">
              No matching orders found
            </p>
            <p className="text-xs text-zinc-400">
              Try clearing your search query or switching the filter tab above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const badgeStyle =
                STAGE_BADGE_STYLES[order.parcelStatus] ||
                STAGE_BADGE_STYLES.Dispatched;
              const currentStepIdx = getStageProgressIndex(order.parcelStatus);
              const isCopied = copiedTrackingId === order.trackingNumber;

              return (
                <article
                  key={order.id}
                  className="rounded-2xl bg-neutral-900/80 border border-zinc-800/90 hover:border-zinc-700/90 transition-all overflow-hidden shadow-lg"
                >
                  {/* Card Top Bar: Order Number, Storefront Channel, & Live Parcel Status */}
                  <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-neutral-950/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-white">
                        #{order.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {order.channel}
                      </span>
                      <span className="text-xs text-zinc-400">
                        • Placed{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot} ${
                            order.parcelStatus !== "Delivered"
                              ? "animate-pulse"
                              : ""
                          }`}
                        />
                        {order.parcelStatus}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 space-y-5">
                    {/* 4-Stage Visual Parcel Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-400">
                          Parcel Delivery Progress
                        </span>
                        <span className="font-semibold text-sky-400">
                          {order.parcelStatus === "Delivered"
                            ? "Completed"
                            : `Est. Arrival: ${order.estimatedDelivery}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {PARCEL_STAGES.map((stageLabel, idx) => {
                          const completed = idx <= currentStepIdx;
                          const isCurrent = idx === currentStepIdx;
                          return (
                            <div key={stageLabel} className="space-y-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  completed
                                    ? idx === 3
                                      ? "bg-emerald-400"
                                      : "bg-sky-400"
                                    : "bg-zinc-800"
                                }`}
                              />
                              <p
                                className={`text-[11px] font-medium truncate ${
                                  isCurrent
                                    ? "text-white font-semibold"
                                    : completed
                                      ? "text-zinc-300"
                                      : "text-zinc-600"
                                }`}
                              >
                                {stageLabel}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Courier Tracking & Delivery Address Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Courier & Tracking Number Box */}
                      <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-zinc-800/90 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-sky-400" />
                            <span>Courier Partner &amp; Waybill</span>
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-white truncate">
                            {order.courierName} •{" "}
                            <span className="font-mono text-sky-300">
                              {order.trackingNumber}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyTracking(order.trackingNumber)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-zinc-200 border border-zinc-700/80 text-xs font-medium shrink-0 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Delivery Address Box */}
                      <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-zinc-800/90 flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Delivery Destination ({order.city})
                          </p>
                          <p className="text-xs text-zinc-200 mt-0.5 leading-snug">
                            {order.deliveryAddress}, {order.city}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div className="rounded-xl bg-neutral-950/50 border border-zinc-800/80 divide-y divide-zinc-800/70">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-neutral-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-sky-300 shrink-0">
                              {item.quantity}x
                            </span>
                            <div className="truncate">
                              <span className="font-medium text-zinc-100">
                                {item.name}
                              </span>
                              <span className="text-zinc-500 font-mono ml-2 text-[11px]">
                                ({item.sku})
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-zinc-200 shrink-0">
                            {formatPKR(item.retailUnitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer: Total Paid + Public Tracking Link */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href="/track/ORD-9040"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <span>Open Detailed Map &amp; Milestone View</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">
                          Order Total:
                        </span>
                        <span className="text-base font-bold text-white font-mono">
                          {formatPKR(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomerOrdersPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
        </div>
      }
    >
      <CustomerOrdersPortalContent />
    </Suspense>
  );
}
