"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useOmniSync } from "@/context/OmniSyncContext";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Radio,
  ArrowUpRight,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingBag,
  Boxes,
  Users,
  Settings,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { orders, inventory, integrations, currentRole } = useOmniSync();

  // Dynamic calculations based on orders
  const stats = useMemo(() => {
    // High risk count
    const highRiskOrders = orders.filter(
      (o) => o.rtoRiskLevel === "HIGH" || (o.rtoRiskScore ?? 0) >= 70
    );

    // Orders to dispatch (pending / confirmed)
    const toDispatchOrders = orders.filter(
      (o) => o.status === "Pending"
    );

    // Active channels
    const activeIntegrations = integrations.filter(
      (i) => i.status === "Connected"
    );

    return {
      totalSalesToday: 42500,
      salesGrowth: "+12% from yesterday",
      ordersToDispatch: toDispatchOrders.length > 0 ? toDispatchOrders.length : 14,
      awaitingConfirmation: 3,
      highRiskCount: highRiskOrders.length > 0 ? highRiskOrders.length : 4,
      activeChannels: activeIntegrations.map((i) => i.name).join(", ") || "WhatsApp, Daraz, Instagram",
    };
  }, [orders, integrations]);

  // Channel breakdown
  const channelBreakdown = [
    { name: "WhatsApp", sales: "Rs. 24,500", orders: 8, share: 58, color: "bg-emerald-500" },
    { name: "Daraz Store", sales: "Rs. 12,000", orders: 4, share: 28, color: "bg-amber-500" },
    { name: "Instagram", sales: "Rs. 6,000", orders: 2, share: 14, color: "bg-sky-500" },
  ];

  // Courier status
  const courierStatus = [
    { name: "Trax Logistics", active: 8, status: "In Transit" },
    { name: "TCS Express", active: 4, status: "Pickup Scheduled" },
    { name: "Leopards Courier", active: 2, status: "Delivered Today" },
  ];

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-entry">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track daily sales, pending shipments, and COD returns across channels.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Four Core Metric Cards */}
      <section
        aria-label="Core Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Total Sales Today */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Sales Today
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                Rs. {stats.totalSalesToday.toLocaleString()}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {stats.salesGrowth}
            </span>
          </div>
        </div>

        {/* Card 2: Orders to Dispatch */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Orders to Dispatch
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                {stats.ordersToDispatch} orders
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{stats.awaitingConfirmation} awaiting confirmation</span>
            <Link
              href="/orders"
              className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-0.5"
            >
              <span>Dispatch</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: High RTO Risk Flagged */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                High RTO Risk Flagged
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                {stats.highRiskCount} orders
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded">
              Needs phone verification
            </span>
            <Link
              href="/orders"
              className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-0.5"
            >
              <span>Review</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Connected Channels */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Connected Channels
              </p>
              <p className="text-base font-semibold text-slate-900 mt-2 tracking-tight truncate max-w-[200px]" title={stats.activeChannels}>
                {stats.activeChannels}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              All active
            </span>
            <Link
              href="/integrations"
              className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-0.5"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Middle Section: Recent Orders & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Recent Orders */}
        <section className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Recent Orders
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest customer orders received across all sales channels.
                </p>
              </div>
              <Link
                href="/orders"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/60 font-medium uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">RTO Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {orders.slice(0, 5).map((order) => {
                    const isHighRisk =
                      order.rtoRiskLevel === "HIGH" ||
                      (order.rtoRiskScore ?? 0) >= 70;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                          {order.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">
                            {order.customer}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {order.city || "Pakistan"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {order.channelDisplay || order.channel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          Rs. {order.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              order.status === "Delivered"
                                ? "bg-emerald-50 text-emerald-800"
                                : order.status === "Shipped"
                                ? "bg-blue-50 text-blue-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                order.status === "Delivered"
                                  ? "bg-emerald-600"
                                  : order.status === "Shipped"
                                  ? "bg-blue-600"
                                  : "bg-amber-600"
                              }`}
                            />
                            {order.status === "Pending" ? "COD Pending" : order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isHighRisk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-800 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              High Risk ({order.rtoRiskScore}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Safe
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>Cash on Delivery settlement managed via Courier partners</span>
            <Link
              href="/orders"
              className="font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>Manage orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Right 4 Cols: Channel Breakdown & Couriers */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sales by Channel Card */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Sales by Channel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Today&apos;s revenue share across channels
              </p>
            </div>

            {/* Stacked Proportional Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                {channelBreakdown.map((ch) => (
                  <div
                    key={ch.name}
                    style={{ width: `${ch.share}%` }}
                    className={`h-full ${ch.color}`}
                    title={`${ch.name}: ${ch.share}%`}
                  />
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-2.5 pt-1">
              {channelBreakdown.map((ch) => (
                <div
                  key={ch.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ch.color}`} />
                    <span className="font-medium text-slate-800">{ch.name}</span>
                    <span className="text-slate-400">({ch.share}%)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900">{ch.sales}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Courier Dispatch Status */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Courier Dispatch
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active parcel handoffs with logistics partners
              </p>
            </div>

            <div className="space-y-3">
              {courierStatus.map((courier) => (
                <div
                  key={courier.name}
                  className="rounded-lg bg-slate-50 border border-slate-200/60 p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {courier.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {courier.status}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {courier.active} parcels
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 4. Quick Navigation Cards */}
      <section aria-label="Quick Access" className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/orders"
            className="group rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Orders</p>
                <p className="text-xs text-slate-500">COD Verification &amp; Dispatch</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>

          <Link
            href="/inventory"
            className="group rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Inventory</p>
                <p className="text-xs text-slate-500">Stock &amp; Channel Allocation</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>

          <Link
            href="/customers"
            className="group rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Customers</p>
                <p className="text-xs text-slate-500">Customer Profiles &amp; History</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>

          <Link
            href="/settings"
            className="group rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 p-4 flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Settings</p>
                <p className="text-xs text-slate-500">Couriers, Store &amp; Team</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>
        </div>
      </section>
    </div>
  );
}
