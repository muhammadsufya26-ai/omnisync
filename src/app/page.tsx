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
  PackageCheck,
  Webhook,
  X,
  ChevronRight,
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
  barColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: React.ComponentType<{ className?: string }>;
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
    barColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Shopify: {
    barColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200/60",
    icon: Store,
  },
  Amazon: {
    barColor: "bg-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200/60",
    icon: ShoppingCart,
  },
  Etsy: {
    barColor: "bg-orange-500",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    badgeBorder: "border-orange-200/60",
    icon: Globe,
  },
  eBay: {
    barColor: "bg-blue-500",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200/60",
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
  const [isGlobalSyncing, setIsGlobalSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleTriggerGlobalSync = () => {
    if (isGlobalSyncing) return;
    setIsGlobalSyncing(true);

    setTimeout(async () => {
      const synced = await triggerChannelOrdersSync();
      setIsGlobalSyncing(false);

      setToastMessage(
        `Channel sync complete (+${synced.length} new ${
          synced.length === 1 ? "order" : "orders"
        }).`
      );
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    }, 1000);
  };

  // Compute Channel Performance & Global GMV dynamically
  const dashboardStats = useMemo(() => {
    const tf = TIMEFRAME_DATA[timeframe];

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
    <div className="space-y-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-entry">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-900 text-xs font-medium shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12)] animate-entry"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Operations Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time fulfillment metrics, sales telemetry, and channel sync health.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Timeframe Selector */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200/80">
            {(["7D", "30D", "90D"] as TimeframeKey[]).map((tf) => {
              const active = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleTriggerGlobalSync}
            disabled={isGlobalSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isGlobalSyncing ? "animate-spin" : ""
              }`}
            />
            <span>{isGlobalSyncing ? "Syncing..." : "Sync Channels"}</span>
          </button>
        </div>
      </div>

      {/* 4 Single-Level Key Metric Cards */}
      <section
        aria-label="Key Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* 1. GMV */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Gross Merchandise Value
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                $
                {dashboardStats.totalGmv.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              <TrendingUp className="w-3 h-3" />
              {dashboardStats.wowChange} WoW
            </span>
            <span className="text-slate-500">{dashboardStats.timeframeLabel}</span>
          </div>
        </div>

        {/* 2. Active Channels */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Active Storefronts
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                {dashboardStats.activeChannelsCount}{" "}
                <span className="text-slate-400 text-lg font-normal">
                  / {dashboardStats.totalChannelsCount}
                </span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              All feeds live
            </span>
            <Link
              href="/integrations"
              className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-0.5"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. Orders Today */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Orders Today
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                  {dashboardStats.ordersToday}
                </p>
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  {dashboardStats.unfulfilledQueue} pending
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Fulfillment rate:</span>
            <span className="font-medium text-slate-900">
              {dashboardStats.fulfillmentPct}%
            </span>
          </div>
        </div>

        {/* 4. Stock Units */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Inventory Units
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                {dashboardStats.totalStockUnits.toLocaleString()}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Threshold: &lt; {settings.lowStockThreshold}u</span>
            <Link
              href="/inventory"
              className="text-amber-700 font-medium hover:underline"
            >
              {dashboardStats.lowStockSkus} low stock
            </Link>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Channel Revenue Distribution */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Channel Revenue Distribution
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparative volume and share ({dashboardStats.timeframeLabel})
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {dashboardStats.totalOrdersInPeriod.toLocaleString()} orders
              </span>
            </div>

            {/* Stacked Proportional Bar */}
            <div className="space-y-2">
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
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
                      className={`h-full ${ch.barColor}`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                {dashboardStats.channels.map((ch) => {
                  const sharePct =
                    dashboardStats.totalGmv > 0
                      ? (ch.revenue / dashboardStats.totalGmv) * 100
                      : 0;
                  return (
                    <div key={ch.channel} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${ch.barColor}`} />
                      <span className="font-medium text-slate-700">{ch.channel}</span>
                      <span className="text-slate-400">({sharePct.toFixed(1)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-Channel List */}
            <div className="space-y-3 pt-2">
              {dashboardStats.channels.map((ch) => {
                const Icon = ch.icon;
                const sharePct =
                  dashboardStats.totalGmv > 0
                    ? ((ch.revenue / dashboardStats.totalGmv) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={ch.channel}
                    className="rounded-lg bg-slate-50/80 border border-slate-200/60 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ch.badgeBg} ${ch.badgeText}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {ch.channel}
                          </span>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                            +{ch.growthPct}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ch.orders.toLocaleString()} orders • AOV ${ch.aov.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900">
                        $
                        {ch.revenue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {sharePct}% of GMV
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Settlement ledger reconciled across channels</span>
            <Link
              href="/orders"
              className="font-medium text-slate-900 hover:text-slate-700 inline-flex items-center gap-1"
            >
              <span>View all orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Right 5 Columns: Activity Feed */}
        <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Activity Feed
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent sync events and orders
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              {(
                [
                  { key: "all", label: "All" },
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
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Activity Items */}
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {filteredActivities.map((evt) => {
                const EventIcon =
                  evt.category === "order"
                    ? ShoppingBag
                    : evt.category === "inventory"
                    ? PackageCheck
                    : Webhook;

                return (
                  <div key={evt.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                      <EventIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {evt.title}
                        </p>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {evt.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {evt.subtitle}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                          {evt.channel}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400 font-mono">
                          {evt.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredActivities.length} recent events</span>
            <button
              type="button"
              onClick={handleTriggerGlobalSync}
              disabled={isGlobalSyncing}
              className="text-slate-900 font-medium hover:text-slate-700 cursor-pointer disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </section>
      </div>

      {/* Quick Navigation Shortcuts */}
      <section aria-label="Shortcuts">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/orders"
            className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Orders</p>
                <p className="text-xs text-slate-500">Fulfillment &amp; dispatch</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>

          <Link
            href="/inventory"
            className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Inventory</p>
                <p className="text-xs text-slate-500">Stock &amp; allocations</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>

          <Link
            href="/integrations"
            className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Blocks className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Integrations</p>
                <p className="text-xs text-slate-500">Marketplaces &amp; webhooks</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>

          <Link
            href="/settings"
            className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Settings</p>
                <p className="text-xs text-slate-500">Rules &amp; preferences</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>
        </div>
      </section>
    </div>
  );
}
