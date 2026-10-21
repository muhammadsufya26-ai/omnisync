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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col pb-16">
      {/* Top Customer Portal Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  OmniSync
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  Customer Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
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
              className="hidden md:block px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile-Friendly Customer Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* RBAC Redirect Alert Banner */}
        {showRestrictedToast && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  Merchant Route Restricted
                </p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Your account has the <strong className="font-mono">CUSTOMER</strong> role. Access
                  to internal store owner routes (<code className="font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">{attemptedRoute}</code>) is restricted to store staff.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRestrictedToast(false)}
              aria-label="Dismiss alert"
              className="p-1 rounded-lg text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Customer Welcome & Summary Card */}
        <section className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                <span>Verified Customer</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome back, {customerProfile.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {customerProfile.email}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customerProfile.phone}
                </span>
              </div>
            </div>

            {/* Quick Parcel Counters */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  In Transit
                </p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {activeParcelsCount}
                </p>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  Delivered
                </p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">
                  {deliveredCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your orders by Order #, Courier, or Product..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            {(["All", "Active", "Delivered"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
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
          <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <RefreshCw className="w-6 h-6 text-slate-600 animate-spin mx-auto" />
            <p className="text-sm text-slate-500">
              Loading your personal orders and courier tracking...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <Package className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-base font-semibold text-slate-900">
              No matching orders found
            </p>
            <p className="text-xs text-slate-500">
              Try clearing your search query or switching the filter tab above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const currentStepIdx = getStageProgressIndex(order.parcelStatus);
              const isCopied = copiedTrackingId === order.trackingNumber;

              return (
                <article
                  key={order.id}
                  className="rounded-2xl bg-white border border-slate-200/80 shadow-xs transition-all overflow-hidden"
                >
                  {/* Card Top Bar */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        #{order.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {order.channel}
                      </span>
                      <span className="text-xs text-slate-500">
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          order.parcelStatus === "Delivered"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            order.parcelStatus === "Delivered"
                              ? "bg-emerald-600"
                              : "bg-blue-600"
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
                        <span className="font-medium text-slate-500">
                          Delivery Progress
                        </span>
                        <span className="font-semibold text-slate-900">
                          {order.parcelStatus === "Delivered"
                            ? "Delivered"
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
                                      ? "bg-emerald-500"
                                      : "bg-slate-900"
                                    : "bg-slate-100"
                                }`}
                              />
                              <p
                                className={`text-[11px] font-medium truncate ${
                                  isCurrent
                                    ? "text-slate-900 font-semibold"
                                    : completed
                                      ? "text-slate-700"
                                      : "text-slate-400"
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
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1 font-medium">
                            <Truck className="w-3 h-3 text-slate-600" />
                            <span>Courier Partner &amp; Waybill</span>
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {order.courierName} •{" "}
                            <span className="font-mono text-slate-700">
                              {order.trackingNumber}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyTracking(order.trackingNumber)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium shrink-0 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Delivery Address Box */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                            Delivery Destination ({order.city})
                          </p>
                          <p className="text-xs text-slate-700 mt-0.5 leading-snug">
                            {order.deliveryAddress}, {order.city}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div className="rounded-xl bg-slate-50/50 border border-slate-200 divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-800 shrink-0">
                              {item.quantity}x
                            </span>
                            <div className="truncate">
                              <span className="font-medium text-slate-900">
                                {item.name}
                              </span>
                              <span className="text-slate-400 font-mono ml-2 text-[11px]">
                                ({item.sku})
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-slate-900 shrink-0">
                            {formatPKR(item.retailUnitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer: Total Paid + Public Tracking Link */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href={`/track/${order.orderNumber}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <span>Open Waybill Tracking Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          Order Total:
                        </span>
                        <span className="text-base font-bold text-slate-900 font-mono">
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
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-slate-700 animate-spin" />
        </div>
      }
    >
      <CustomerOrdersPortalContent />
    </Suspense>
  );
}
