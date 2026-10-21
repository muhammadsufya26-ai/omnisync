"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useOmniSync,
  type CourierPartner,
  type Channel,
} from "@/context/OmniSyncContext";

type TrackingStageIndex = 0 | 1 | 2 | 3 | 4;

interface TrackingStep {
  index: TrackingStageIndex;
  label: string;
  description: string;
  timestamp: string;
}

const COURIER_BADGE_STYLES: Record<
  CourierPartner,
  { bg: string; text: string; border: string; tagline: string }
> = {
  "TCS Express": {
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/25",
    tagline: "TCS Express Domestic & COD Network",
  },
  "Trax Logistics": {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/25",
    tagline: "Trax Logistics Smart COD Fulfillment",
  },
  "Leopards Courier": {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/25",
    tagline: "Leopards Courier Nationwide Overnight",
  },
  DHL: {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/25",
    tagline: "DHL Express International Air Waybill",
  },
  FedEx: {
    bg: "bg-violet-500/10",
    text: "text-violet-300",
    border: "border-violet-500/25",
    tagline: "FedEx Priority Overnight® Logistics",
  },
  TCS: {
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/25",
    tagline: "TCS Express Domestic & COD Network",
  },
  Leopards: {
    bg: "bg-orange-500/10",
    text: "text-orange-300",
    border: "border-orange-500/25",
    tagline: "Leopards Courier Overnight Cargo",
  },
  BlueEx: {
    bg: "bg-sky-500/10",
    text: "text-sky-300",
    border: "border-sky-500/25",
    tagline: "BlueEx Smart Last-Mile Fulfillment",
  },
};

const CHANNEL_ACCENT: Record<Channel, string> = {
  Shopify: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Amazon: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Etsy: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

export default function PublicOrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { orders } = useOmniSync();

  const decodedOrderId = decodeURIComponent(params?.orderId || "ORD-9040");
  const [searchInput, setSearchInput] = useState(decodedOrderId);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [overrideStage, setOverrideStage] =
    useState<TrackingStageIndex | null>(null);

  const order = useMemo(() => {
    const normalized = decodedOrderId.trim().toUpperCase();
    return (
      orders.find((o) => o.id.toUpperCase() === normalized) ||
      orders.find((o) => o.trackingNumber?.toUpperCase() === normalized) ||
      null
    );
  }, [orders, decodedOrderId]);

  // Derive natural stage from order status:
  // 0: Order Placed, 1: Processing, 2: Shipped, 3: Out for Delivery, 4: Delivered
  const defaultStageIndex: TrackingStageIndex = useMemo(() => {
    if (!order) return 0;
    if (order.status === "Pending") return 1; // Order Placed (0) completed, Processing (1) active
    if (order.status === "Shipped") {
      return order.id.endsWith("0") ? 3 : 2;
    }
    if (order.status === "Delivered") return 4;
    return 0;
  }, [order]);

  const activeStageIndex: TrackingStageIndex =
    overrideStage !== null ? overrideStage : defaultStageIndex;

  const steps: TrackingStep[] = useMemo(() => {
    const baseDate = order?.date || "2026-10-06";
    const courier = order?.courierPartner || "DHL";
    return [
      {
        index: 0,
        label: "Order Placed",
        description: `Order confirmed via ${order?.channel || "Storefront"} and verified by OmniSync.`,
        timestamp: `${baseDate} • 09:14 AM`,
      },
      {
        index: 1,
        label: "Processing",
        description:
          "Items picked, quality-checked, and packed at fulfillment center.",
        timestamp: `${baseDate} • 11:40 AM`,
      },
      {
        index: 2,
        label: "Shipped",
        description: `Handed over to ${courier} courier facility with tracking manifest.`,
        timestamp: `${baseDate} • 04:25 PM`,
      },
      {
        index: 3,
        label: "Out for Delivery",
        description: `${courier} local courier agent is en route to destination address.`,
        timestamp: order?.estimatedDelivery
          ? `${order.estimatedDelivery} • 08:50 AM`
          : "In Transit",
      },
      {
        index: 4,
        label: "Delivered",
        description: "Package delivered and signed at recipient address.",
        timestamp: order?.estimatedDelivery
          ? `${order.estimatedDelivery} • 02:15 PM`
          : "Pending Arrival",
      },
    ];
  }, [order]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setOverrideStage(null);
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  };

  const handleCopyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const courierName: CourierPartner = order?.courierPartner || "DHL";
  const courierStyle = COURIER_BADGE_STYLES[courierName];
  const trackingCode =
    order?.trackingNumber ||
    `TRK-${decodedOrderId.replace(/[^0-9]/g, "") || "9040"}882`;
  const estimatedDelivery = order?.estimatedDelivery || "Oct 10, 2026";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Public Brand Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-slate-900">
                  OmniSync
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Order Tracking
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Real-time delivery status &amp; carrier waybill tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Merchant Console
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search / Order ID Switcher Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form
              onSubmit={handleLookupSubmit}
              className="flex-1 flex items-center gap-2"
            >
              <div className="relative flex-1">
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter Order ID (e.g. OMS-1049) or Tracking Number..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
              >
                Track Package
              </button>
            </form>

            {/* Quick Sample Order Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 mr-1">
                Sample:
              </span>
              {orders.slice(0, 5).map((sample) => (
                <Link
                  key={sample.id}
                  href={`/track/${sample.id}`}
                  onClick={() => {
                    setSearchInput(sample.id);
                    setOverrideStage(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                    order?.id === sample.id
                      ? "bg-slate-900 text-white border-slate-900 font-semibold"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  #{sample.id}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {!order ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              Order &ldquo;{decodedOrderId}&rdquo; Not Found
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              We couldn&apos;t locate a shipment matching that Order ID or
              Tracking Number. Try selecting one of the active sample orders above.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Order Summary & Courier Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      Order #{order.id}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {order.channel} Storefront
                    </span>
                    {order.status === "Cancelled" ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-800 border border-red-200">
                        Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {steps[activeStageIndex].label}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {order.status === "Cancelled"
                      ? "Shipment Cancelled"
                      : activeStageIndex === 4
                        ? `Delivered to ${order.customer}`
                        : `Arriving by ${estimatedDelivery}`}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Recipient:{" "}
                    <span className="text-slate-900 font-medium">
                      {order.customer}
                    </span>{" "}
                    • Destination:{" "}
                    <span className="text-slate-700">
                      {order.shippingAddress}
                    </span>
                  </p>
                </div>

                {/* Courier Partner & Tracking Number Box */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4 min-w-[260px]">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800">
                      {courierName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {courierStyle.tagline}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                        Courier Waybill
                      </p>
                      <p className="text-sm font-mono font-bold text-slate-900">
                        {trackingCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyTracking(trackingCode)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedTracking ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* 5-Stage Interactive Progress Tracker */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Shipment Timeline
                  </h2>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>Preview stage:</span>
                    {steps.map((s) => (
                      <button
                        key={s.index}
                        type="button"
                        onClick={() => setOverrideStage(s.index)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                          activeStageIndex === s.index
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {s.index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Bar & 5 Stage Nodes */}
                <div className="relative my-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative z-10">
                    {steps.map((step) => {
                      const isCompleted =
                        step.index <= activeStageIndex &&
                        order.status !== "Cancelled";
                      const isCurrent =
                        step.index === activeStageIndex &&
                        order.status !== "Cancelled";

                      return (
                        <div
                          key={step.label}
                          onClick={() => setOverrideStage(step.index)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-slate-50 border-slate-300 shadow-xs ring-1 ring-slate-900/10"
                              : isCompleted
                                ? "bg-white border-slate-200"
                                : "bg-slate-50/60 border-slate-200/60 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3 md:flex-col md:items-start">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-all ${
                                isCurrent
                                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                  : isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                            >
                              {isCompleted && !isCurrent ? (
                                <svg
                                  className="w-4 h-4 text-emerald-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <span>0{step.index + 1}</span>
                              )}
                            </div>

                            <div className="flex-1">
                              <p
                                className={`text-xs font-semibold ${
                                  isCurrent
                                    ? "text-slate-900"
                                    : isCompleted
                                      ? "text-slate-900"
                                      : "text-slate-400"
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {step.description}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400 mt-1.5">
                                {step.timestamp}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Grid: Shipment Metadata + Ordered Item Summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Delivery & Carrier Details */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Shipment &amp; Delivery Details
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                      Delivery Address
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {order.customer}
                    </p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {order.shippingAddress}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                        Courier Partner
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {courierName}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                        Est. Delivery
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {estimatedDelivery}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                        Last Status Update
                      </p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        {order.syncedAt} via {order.channel}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 2 Columns: Order Items Summary */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Order Items (
                      {order.items.reduce((sum, i) => sum + i.quantity, 0)}{" "}
                      Units)
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      {order.items.length} Distinct SKU(s)
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                    {order.items.map((item) => (
                      <div
                        key={item.sku}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-mono font-bold text-slate-700">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {item.name}
                            </p>
                            <p className="text-xs font-mono text-slate-400">
                              SKU: {item.sku}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatPKR(item.price * item.quantity)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatPKR(item.price)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Need help? Contact{" "}
                    <span className="text-slate-900 font-medium">
                      support@omnisync.com
                    </span>{" "}
                    referencing{" "}
                    <span className="font-mono text-slate-700">
                      #{order.id}
                    </span>
                    .
                  </div>
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                      Total COD Amount
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatPKR(order.amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
