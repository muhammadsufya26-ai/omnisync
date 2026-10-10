"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useOmniSync } from "@/context/OmniSyncContext";
import {
  DollarSign,
  TrendingUp,
  Radio,
  ShoppingBag,
  Activity,
  RefreshCw,
  ArrowUpRight,
  Boxes,
  Blocks,
  Store,
  ShoppingCart,
  Globe,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronRight,
  PackageCheck,
  Webhook,
  X,
} from "lucide-react";

export type TimeframeKey = "7D" | "30D" | "90D";
export type ChannelName = "Shopify" | "Amazon" | "Etsy" | "eBay";
export type ActivityCategory = "order" | "inventory" | "webhook";

export interface ChannelPerformance {
  channel: ChannelName;
  revenue: number;
  orders: number;
  aov: number;
  growthPct: number;
  colorClass: string;
  barGradient: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ActivityEvent {
  id: string;
  category: ActivityCategory;
  title: string;
  subtitle: string;
  channel: ChannelName;
  timestamp: string;
}

const TIMEFRAME_DATA: Record<
  TimeframeKey,
  {
    label: string;
    wowChange: string;
    channels: Array<{
      channel: ChannelName;
      revenue: number;
      orders: number;
      growthPct: number;
    }>;
  }
> = {
  "7D": {
    label: "Last 7 Days",
    wowChange: "+18.4%",
    channels: [
      { channel: "Shopify", revenue: 57229, orders: 408, growthPct: 22.4 },
      { channel: "Amazon", revenue: 41684.61, orders: 365, growthPct: 15.8 },
      { channel: "Etsy", revenue: 18224.5, orders: 161, growthPct: 14.1 },
      { channel: "eBay", revenue: 9500, orders: 89, growthPct: 9.2 },
    ],
  },
  "30D": {
    label: "Last 30 Days",
    wowChange: "+24.7%",
    channels: [
      { channel: "Shopify", revenue: 241609, orders: 1706, growthPct: 28.1 },
      { channel: "Amazon", revenue: 176194.61, orders: 1517, growthPct: 21.3 },
      { channel: "Etsy", revenue: 78784.5, orders: 692, growthPct: 19.5 },
      { channel: "eBay", revenue: 38900, orders: 340, growthPct: 11.8 },
    ],
  },
  "90D": {
    label: "Last 90 Days",
    wowChange: "+31.2%",
    channels: [
      { channel: "Shopify", revenue: 717309, orders: 5036, growthPct: 34.6 },
      { channel: "Amazon", revenue: 518994.61, orders: 4477, growthPct: 27.9 },
      { channel: "Etsy", revenue: 228484.5, orders: 1977, growthPct: 24.2 },
      { channel: "eBay", revenue: 112400, orders: 990, growthPct: 16.4 },
    ],
  },
};

const CHANNEL_STYLES: Record<
  ChannelName,
  {
    colorClass: string;
    barGradient: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    strokeColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Shopify: {
    colorClass: "text-emerald-400",
    barGradient: "from-emerald-500 to-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/25",
    strokeColor: "#10b981",
    icon: Store,
  },
  Amazon: {
    colorClass: "text-amber-400",
    barGradient: "from-amber-500 to-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/25",
    strokeColor: "#f59e0b",
    icon: ShoppingCart,
  },
  Etsy: {
    colorClass: "text-orange-400",
    barGradient: "from-orange-500 to-orange-400",
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-400",
    badgeBorder: "border-orange-500/25",
    strokeColor: "#f97316",
    icon: Globe,
  },
  eBay: {
    colorClass: "text-sky-400",
    barGradient: "from-sky-500 to-sky-400",
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-400",
    badgeBorder: "border-sky-500/25",
    strokeColor: "#0ea5e9",
    icon: ShoppingBag,
  },
};

export default function ExecutiveDashboardPage() {
  const {
    orders,
    inventory,
    integrations,
    settings,
    activities,
    triggerChannelOrdersSync,
  } = useOmniSync();

  const [timeframe, setTimeframe] = useState<TimeframeKey>("7D");
  const [activityFilter, setActivityFilter] = useState<
    "all" | ActivityCategory
  >("all");

  // Global Sync Simulation State
  const [isGlobalSyncing, setIsGlobalSyncing] = useState<boolean>(false);
  const [lastGlobalSync, setLastGlobalSync] = useState<string>("2m ago");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleTriggerGlobalSync = () => {
    if (isGlobalSyncing) return;
    setIsGlobalSyncing(true);

    setTimeout(async () => {
      const synced = await triggerChannelOrdersSync();
      setLastGlobalSync("Just now");
      setIsGlobalSyncing(false);

      setToastMessage(
        `Global sync completed across Shopify, Amazon, Etsy & eBay (+${synced.length} new order${
          synced.length === 1 ? "" : "s"
        }).`
      );
      setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    }, 1200);
  };

  // Compute Channel Performance & Global GMV dynamically incorporating live shared orders, inventory & integrations
  const dashboardStats = useMemo(() => {
    const tf = TIMEFRAME_DATA[timeframe];

    // Live non-cancelled orders revenue & counts from shared OmniSyncContext
    const liveRevenueByChannel: Record<ChannelName, number> = {
      Shopify: 0,
      Amazon: 0,
      Etsy: 0,
      eBay: 0,
    };
    const liveOrdersByChannel: Record<ChannelName, number> = {
      Shopify: 0,
      Amazon: 0,
      Etsy: 0,
      eBay: 0,
    };

    let unfulfilledQueue = 0;
    let fulfilledCount = 0;

    for (const ord of orders) {
      if (ord.status === "Pending") {
        unfulfilledQueue++;
      } else if (ord.status === "Shipped" || ord.status === "Delivered") {
        fulfilledCount++;
      }

      if (ord.status !== "Cancelled") {
        liveRevenueByChannel[ord.channel] =
          (liveRevenueByChannel[ord.channel] ?? 0) + ord.amount;
        liveOrdersByChannel[ord.channel] =
          (liveOrdersByChannel[ord.channel] ?? 0) + 1;
      }
    }

    const channels: ChannelPerformance[] = tf.channels.map((ch) => {
      const style = CHANNEL_STYLES[ch.channel];
      const revenue = ch.revenue + (liveRevenueByChannel[ch.channel] ?? 0);
      const orderCount = ch.orders + (liveOrdersByChannel[ch.channel] ?? 0);

      return {
        channel: ch.channel,
        revenue,
        orders: orderCount,
        aov: orderCount > 0 ? revenue / orderCount : 0,
        growthPct: ch.growthPct,
        ...style,
      };
    });

    const totalGmv = channels.reduce((sum, c) => sum + c.revenue, 0);
    const totalOrdersInPeriod = channels.reduce((sum, c) => sum + c.orders, 0);
    const maxChannelRevenue = Math.max(...channels.map((c) => c.revenue), 1);

    const activeChannelsCount = integrations.filter(
      (item) => item.status === "Connected"
    ).length;

    let totalStockUnits = 0;
    let lowStockSkus = 0;
    for (const item of inventory) {
      const units =
        item.allocations.Shopify +
        item.allocations.Amazon +
        item.allocations.Etsy;
      totalStockUnits += units;
      if (units > 0 && units < settings.lowStockThreshold) {
        lowStockSkus++;
      }
    }

    const activeNonCancelled = Math.max(1, unfulfilledQueue + fulfilledCount);
    const fulfillmentPct = Math.round(
      (fulfilledCount / activeNonCancelled) * 100
    );

    return {
      timeframeLabel: tf.label,
      wowChange: tf.wowChange,
      totalGmv,
      totalOrdersInPeriod,
      maxChannelRevenue,
      channels,
      ordersToday: 54 + orders.length,
      unfulfilledQueue,
      fulfillmentPct,
      activeChannelsCount,
      totalChannelsCount: integrations.length,
      totalStockUnits,
      lowStockSkus,
    };
  }, [
    timeframe,
    orders,
    integrations,
    inventory,
    settings.lowStockThreshold,
  ]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return activities;
    return activities.filter((item) => item.category === activityFilter);
  }, [activities, activityFilter]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-20">
      {/* Top Executive Command Bar */}
      <header className="sticky top-0 z-20 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Executive Command Center</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Last global sync: <strong className="text-neutral-200">{lastGlobalSync}</strong>
            </span>
          </div>

          {/* Quick Header Shortcuts */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/orders"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Orders Queue</span>
            </Link>
            <Link
              href="/inventory"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors"
            >
              <Boxes className="w-3.5 h-3.5 text-sky-400" />
              <span>Inventory</span>
            </Link>
            <button
              type="button"
              onClick={handleTriggerGlobalSync}
              disabled={isGlobalSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-70 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isGlobalSyncing ? "animate-spin" : ""
                }`}
              />
              <span>
                {isGlobalSyncing ? "Syncing All..." : "Trigger Global Sync"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Sync Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-900/95 border border-emerald-500/40 text-neutral-100 text-xs font-medium shadow-2xl backdrop-blur-md"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Heading + Timeframe Selector */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              OmniSync Operations Overview
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Unified multi-channel GMV telemetry, storefront sync health, and
              live fulfillment velocity.
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="inline-flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl self-start md:self-auto">
            {(["7D", "30D", "90D"] as TimeframeKey[]).map((tf) => {
              const active = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-500 text-neutral-950 shadow-2xs"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Global Key Metric Cards */}
        <section
          aria-label="Global Executive Metrics"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {/* 1. Gross Merchandise Value (GMV) */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 hover:border-emerald-500/30 transition-colors p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Gross Merchandise Value
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
                  $
                  {dashboardStats.totalGmv.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/70 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                {dashboardStats.wowChange} WoW
              </span>
              <span className="text-neutral-400">
                {dashboardStats.timeframeLabel}
              </span>
            </div>
          </div>

          {/* 2. Active Channels Online */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 hover:border-sky-500/30 transition-colors p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Active Channels Online
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {dashboardStats.activeChannelsCount}{" "}
                    <span className="text-neutral-500 text-xl">
                      / {dashboardStats.totalChannelsCount}
                    </span>
                  </p>
                  <span className="text-xs font-semibold text-emerald-400">
                    Connected
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
                <Radio className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {integrations.map((ch) => (
                  <span
                    key={ch.id}
                    className={`w-2 h-2 rounded-full ${
                      ch.status === "Connected"
                        ? "bg-emerald-400"
                        : ch.status === "Sync Error"
                        ? "bg-rose-400"
                        : "bg-neutral-600"
                    }`}
                    title={`${ch.name}: ${ch.status}`}
                  />
                ))}
              </div>
              <Link
                href="/integrations"
                className="font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5"
              >
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 3. Orders Today vs Unfulfilled Queue */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 hover:border-amber-500/30 transition-colors p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Orders Today vs Queue
                </p>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {dashboardStats.ordersToday}
                  </p>
                  <span className="text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    {dashboardStats.unfulfilledQueue} unfulfilled
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/70 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Fulfillment Velocity</span>
                <span className="font-mono text-neutral-200">
                  {dashboardStats.fulfillmentPct}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  style={{ width: `${dashboardStats.fulfillmentPct}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Sync Health Score & Inventory Pool */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 hover:border-emerald-500/30 transition-colors p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Sync Health Score
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
                    99.8%
                  </p>
                  <span className="text-xs font-medium text-neutral-400">
                    uptime
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/70 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-neutral-400">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Stock pool:{" "}
                <strong className="text-neutral-200 font-mono">
                  {dashboardStats.totalStockUnits}u
                </strong>
              </span>
              <Link
                href="/inventory"
                className="text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                {dashboardStats.lowStockSkus} Low Stock
              </Link>
            </div>
          </div>
        </section>

        {/* Main Two-Column Analytical Section: Revenue Distribution Chart + Recent Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Multi-Channel Revenue Distribution Chart */}
          <section className="lg:col-span-7 rounded-2xl bg-neutral-900/75 backdrop-blur-md border border-neutral-800 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Multi-Channel Revenue Distribution
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Comparative sales volume, order share &amp; AOV across
                    Shopify, Amazon, Etsy, and eBay ({dashboardStats.timeframeLabel})
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400 bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  {dashboardStats.totalOrdersInPeriod.toLocaleString()} orders
                </span>
              </div>

              {/* Stacked Proportional Multi-Channel Ribbon Bar */}
              <div className="space-y-2 pt-1">
                <div className="w-full h-3.5 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden flex p-0.5 gap-0.5">
                  {dashboardStats.channels.map((ch) => {
                    const sharePct =
                      dashboardStats.totalGmv > 0
                        ? (ch.revenue / dashboardStats.totalGmv) * 100
                        : 25;
                    return (
                      <div
                        key={ch.channel}
                        style={{ width: `${sharePct}%` }}
                        title={`${ch.channel}: ${sharePct.toFixed(1)}%`}
                        className={`h-full first:rounded-l-full last:rounded-r-full bg-gradient-to-r ${ch.barGradient} transition-all duration-500`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                  {dashboardStats.channels.map((ch) => {
                    const sharePct =
                      dashboardStats.totalGmv > 0
                        ? (ch.revenue / dashboardStats.totalGmv) * 100
                        : 0;
                    return (
                      <span
                        key={ch.channel}
                        className="inline-flex items-center gap-1.5"
                      >
                        <span
                          className={`w-2 h-2 rounded-full bg-gradient-to-r ${ch.barGradient}`}
                        />
                        <span className="font-medium text-neutral-300">
                          {ch.channel}
                        </span>
                        <span className="font-mono text-neutral-500">
                          ({sharePct.toFixed(1)}%)
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Per-Channel Horizontal Bar Breakdown */}
              <div className="space-y-4 pt-2">
                {dashboardStats.channels.map((ch) => {
                  const Icon = ch.icon;
                  const widthPct = Math.max(
                    8,
                    Math.round(
                      (ch.revenue / dashboardStats.maxChannelRevenue) * 100
                    )
                  );
                  const sharePct =
                    dashboardStats.totalGmv > 0
                      ? ((ch.revenue / dashboardStats.totalGmv) * 100).toFixed(
                          1
                        )
                      : "0.0";

                  return (
                    <div
                      key={ch.channel}
                      className="rounded-xl bg-neutral-950/70 border border-neutral-800/80 p-4 space-y-2.5 hover:border-neutral-700/80 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center ${ch.badgeBg} ${ch.badgeText} ${ch.badgeBorder}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">
                                {ch.channel}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                +{ch.growthPct}%
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500">
                              {ch.orders.toLocaleString()} orders • AOV $
                              {ch.aov.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm sm:text-base font-bold font-mono text-white">
                            $
                            {ch.revenue.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {sharePct}% of total GMV
                          </p>
                        </div>
                      </div>

                      {/* Animated Revenue Bar */}
                      <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className={`h-full rounded-full bg-gradient-to-r ${ch.barGradient} transition-all duration-500`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Summary Strip */}
            <div className="pt-4 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Settlement ledger automatically reconciled across 4 active
                storefronts.
              </span>
              <Link
                href="/orders"
                className="font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                <span>Inspect All Orders</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* Right 5 Cols: Real-Time Recent Activity Feed */}
          <section className="lg:col-span-5 rounded-2xl bg-neutral-900/75 backdrop-blur-md border border-neutral-800 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Real-Time Activity Feed
                    </h2>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <p className="text-xs text-neutral-400">
                    Live order ingest, stock pushes &amp; webhook events
                  </p>
                </div>
              </div>

              {/* Activity Category Filter Tabs */}
              <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-xl">
                {(
                  [
                    { key: "all", label: "All Events" },
                    { key: "order", label: "Orders" },
                    { key: "inventory", label: "Stock" },
                    { key: "webhook", label: "Webhooks" },
                  ] as const
                ).map((tab) => {
                  const active = activityFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActivityFilter(tab.key)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? "bg-neutral-800 text-white shadow-2xs"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Feed Timeline List */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredActivities.map((evt) => {
                  const chStyle = CHANNEL_STYLES[evt.channel];
                  const EventIcon =
                    evt.category === "order"
                      ? ShoppingBag
                      : evt.category === "inventory"
                        ? PackageCheck
                        : Webhook;

                  return (
                    <div
                      key={evt.id}
                      className="rounded-xl bg-neutral-950/80 border border-neutral-800/80 p-3.5 flex items-start gap-3 hover:border-neutral-700 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${chStyle.badgeBg} ${chStyle.badgeText} ${chStyle.badgeBorder}`}
                      >
                        <EventIcon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-neutral-100 truncate">
                            {evt.title}
                          </p>
                          <span className="text-[11px] text-neutral-500 whitespace-nowrap inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {evt.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                          {evt.subtitle}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.2 rounded text-[10px] font-semibold border ${chStyle.badgeBg} ${chStyle.badgeText} ${chStyle.badgeBorder}`}
                          >
                            {evt.channel}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
                            {evt.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
              <span>Showing latest {filteredActivities.length} events</span>
              <button
                type="button"
                onClick={handleTriggerGlobalSync}
                disabled={isGlobalSyncing}
                className="font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isGlobalSyncing ? "animate-spin" : ""}`}
                />
                <span>Poll New Events</span>
              </button>
            </div>
          </section>
        </div>

        {/* Quick Navigation & Action Shortcuts */}
        <section aria-label="Quick Navigation and Action Shortcuts">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            Quick Navigation &amp; Action Shortcuts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Shortcut 1: Orders Queue */}
            <Link
              href="/orders"
              className="group rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 p-4 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Orders Queue
                  </p>
                  <p className="text-xs text-neutral-400">
                    Inspect, batch ship &amp; export CSV
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            {/* Shortcut 2: Inventory & Stock Sync */}
            <Link
              href="/inventory"
              className="group rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-sky-500/40 p-4 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                    Inventory &amp; Stock
                  </p>
                  <p className="text-xs text-neutral-400">
                    Adjust SKUs &amp; channel allocations
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            {/* Shortcut 3: Marketplace Integrations */}
            <Link
              href="/integrations"
              className="group rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 p-4 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Blocks className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Channel Connect
                  </p>
                  <p className="text-xs text-neutral-400">
                    Manage API keys &amp; sync intervals
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            {/* Shortcut 4: Global Sync Trigger */}
            <button
              type="button"
              onClick={handleTriggerGlobalSync}
              disabled={isGlobalSyncing}
              className="group rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 p-4 flex items-center justify-between text-left transition-all cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-neutral-950 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                  <RefreshCw
                    className={`w-5 h-5 ${
                      isGlobalSyncing ? "animate-spin" : ""
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-300">
                    {isGlobalSyncing
                      ? "Syncing Channels..."
                      : "Trigger Global Sync"}
                  </p>
                  <p className="text-xs text-emerald-400/80">
                    Force poll all 4 online storefronts
                  </p>
                </div>
              </div>
              <Zap className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
