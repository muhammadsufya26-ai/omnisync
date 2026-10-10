"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  useOmniSync,
  type OrderRecord,
  type Channel,
  type OrderStatus,
} from "@/context/OmniSyncContext";

interface CustomerProfile {
  email: string;
  name: string;
  totalOrders: number;
  lifetimeValue: number;
  channels: Channel[];
  lastActiveDate: string;
  lastSyncedAt: string;
  shippingAddress: string;
  orders: OrderRecord[];
}

const CHANNEL_BADGE: Record<Channel, string> = {
  Shopify: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Amazon: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Etsy: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  Pending: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  Shipped: "bg-sky-500/10 text-sky-300 border-sky-500/25",
  Delivered: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  Cancelled: "bg-rose-500/10 text-rose-300 border-rose-500/25",
};

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomersCrmPage() {
  const { orders, permissions, currentRole, updateOrderStatus } = useOmniSync();

  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<Channel | "All">("All");
  const [segmentFilter, setSegmentFilter] = useState<"All" | "Repeat" | "VIP">(
    "All"
  );
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<
    string | null
  >(null);

  // Aggregate unique customer profiles by email across all channels
  const customerProfiles: CustomerProfile[] = useMemo(() => {
    const map = new Map<string, CustomerProfile>();

    for (const order of orders) {
      const key = order.customerEmail.toLowerCase().trim();
      const existing = map.get(key);
      const validRevenue = order.status !== "Cancelled" ? order.amount : 0;

      if (!existing) {
        map.set(key, {
          email: order.customerEmail,
          name: order.customer,
          totalOrders: 1,
          lifetimeValue: validRevenue,
          channels: [order.channel],
          lastActiveDate: order.date,
          lastSyncedAt: order.syncedAt,
          shippingAddress: order.shippingAddress,
          orders: [order],
        });
      } else {
        existing.totalOrders += 1;
        existing.lifetimeValue = Number(
          (existing.lifetimeValue + validRevenue).toFixed(2)
        );
        if (!existing.channels.includes(order.channel)) {
          existing.channels.push(order.channel);
        }
        if (order.date > existing.lastActiveDate) {
          existing.lastActiveDate = order.date;
          existing.lastSyncedAt = order.syncedAt;
        }
        existing.orders.push(order);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.lifetimeValue - a.lifetimeValue
    );
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    return customerProfiles.filter((c) => {
      const matchesChannel =
        channelFilter === "All" || c.channels.includes(channelFilter);
      const matchesSegment =
        segmentFilter === "All"
          ? true
          : segmentFilter === "Repeat"
            ? c.totalOrders >= 2
            : c.lifetimeValue >= 300;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.shippingAddress.toLowerCase().includes(q);
      return matchesChannel && matchesSegment && matchesSearch;
    });
  }, [customerProfiles, channelFilter, segmentFilter, searchQuery]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerEmail) return null;
    return (
      customerProfiles.find(
        (c) => c.email.toLowerCase() === selectedCustomerEmail.toLowerCase()
      ) || null
    );
  }, [customerProfiles, selectedCustomerEmail]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedCustomerEmail(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const totalLtv = useMemo(
    () => customerProfiles.reduce((sum, c) => sum + c.lifetimeValue, 0),
    [customerProfiles]
  );
  const repeatCount = useMemo(
    () => customerProfiles.filter((c) => c.totalOrders >= 2).length,
    [customerProfiles]
  );
  const multiChannelCount = useMemo(
    () => customerProfiles.filter((c) => c.channels.length >= 2).length,
    [customerProfiles]
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Unified CRM
              </span>
              <span className="text-xs text-slate-400">
                Active Role:{" "}
                <strong className="text-slate-200">{currentRole}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Customer CRM &amp; Cross-Channel LTV
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Identity-resolved customer profiles across Shopify, Amazon, and
              Etsy storefronts. Click any customer to inspect unified order
              history.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/orders"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800 transition-colors"
            >
              View All Orders
            </Link>
          </div>
        </div>

        {/* CRM Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <p className="text-xs font-medium text-slate-400">
              Unique Customers
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {customerProfiles.length}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1">
              Deduplicated by verified email
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <p className="text-xs font-medium text-slate-400">
              Cumulative Customer LTV
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {permissions.canViewFinancials
                ? formatUSD(totalLtv)
                : "Restricted (RBAC)"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Avg{" "}
              {permissions.canViewFinancials && customerProfiles.length > 0
                ? formatUSD(totalLtv / customerProfiles.length)
                : "•••"}{" "}
              per customer
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <p className="text-xs font-medium text-slate-400">
              Repeat Buyers (2+ Orders)
            </p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">
              {repeatCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {customerProfiles.length > 0
                ? `${Math.round((repeatCount / customerProfiles.length) * 100)}% retention rate`
                : "0%"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <p className="text-xs font-medium text-slate-400">
              Omnichannel Shoppers
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {multiChannelCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Purchased across 2+ marketplaces
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <svg
              className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name, email, or address..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segment Filter */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              {(["All", "Repeat", "VIP"] as const).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setSegmentFilter(seg)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    segmentFilter === seg
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {seg === "All"
                    ? "All Segments"
                    : seg === "Repeat"
                      ? "Repeat Buyers"
                      : "VIP ($300+)"}
                </button>
              ))}
            </div>

            {/* Storefront Channel Filter */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              {(["All", "Shopify", "Amazon", "Etsy"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    channelFilter === ch
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customers CRM Table */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Lifetime Value (LTV)</th>
                  <th className="py-3.5 px-4">Connected Store Source</th>
                  <th className="py-3.5 px-4">Last Active Date</th>
                  <th className="py-3.5 px-4 text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400"
                    >
                      No customer profiles match your current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.email}
                      onClick={() => setSelectedCustomerEmail(customer.email)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                            {customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                {customer.name}
                              </span>
                              {customer.lifetimeValue >= 300 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  VIP
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {customer.shippingAddress}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {customer.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-white">
                          {customer.totalOrders}{" "}
                          {customer.totalOrders === 1 ? "order" : "orders"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {permissions.canViewFinancials
                          ? formatUSD(customer.lifetimeValue)
                          : "••••••"}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {customer.channels.map((ch) => (
                            <span
                              key={ch}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${CHANNEL_BADGE[ch]}`}
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div>{customer.lastActiveDate}</div>
                        <div className="text-[11px] text-slate-500">
                          Synced {customer.lastSyncedAt}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerEmail(customer.email);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Order History
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Cross-Platform Order History Slide-Over Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedCustomerEmail(null)}
          />

          <div className="relative z-10 w-full max-w-xl bg-[#0b0f19] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-slate-950/60">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-base font-bold text-white shadow-md shadow-indigo-600/20">
                  {selectedCustomer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {selectedCustomer.name}
                    </h2>
                    {selectedCustomer.totalOrders >= 2 && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        Repeat Customer
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    {selectedCustomer.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerEmail(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                aria-label="Close customer drawer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Customer LTV & Store Sources Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Total Orders
                  </p>
                  <p className="text-lg font-bold text-white mt-1">
                    {selectedCustomer.totalOrders}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Lifetime Value
                  </p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">
                    {permissions.canViewFinancials
                      ? formatUSD(selectedCustomer.lifetimeValue)
                      : "••••••"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Last Active
                  </p>
                  <p className="text-xs font-semibold text-slate-200 mt-1.5">
                    {selectedCustomer.lastActiveDate}
                  </p>
                </div>
              </div>

              {/* Primary Address & Connected Storefronts */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Primary Shipping Address
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedCustomer.channels.map((ch) => (
                      <span
                        key={ch}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${CHANNEL_BADGE[ch]}`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-slate-200">
                  {selectedCustomer.shippingAddress}
                </p>
              </div>

              {/* Cross-Platform Order History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cross-Platform Purchase History (
                    {selectedCustomer.orders.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Linked by {selectedCustomer.email}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedCustomer.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            #{ord.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              CHANNEL_BADGE[ord.channel]
                            }`}
                          >
                            {ord.channel}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              STATUS_BADGE[ord.status]
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-white">
                          {permissions.canViewFinancials
                            ? formatUSD(ord.amount)
                            : "••••"}
                        </span>
                      </div>

                      {/* Ordered Items */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/70">
                        {ord.items.map((item) => (
                          <div
                            key={item.sku}
                            className="flex items-center justify-between text-xs text-slate-300"
                          >
                            <span>
                              <strong className="text-slate-200">
                                {item.quantity}x
                              </strong>{" "}
                              {item.name}{" "}
                              <span className="font-mono text-[11px] text-slate-400">
                                ({item.sku})
                              </span>
                            </span>
                            <span className="font-mono text-slate-400">
                              {permissions.canViewFinancials
                                ? formatUSD(item.price * item.quantity)
                                : "•••"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Courier & Actions Footer */}
                      <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="text-slate-400">
                          {ord.courierPartner ? (
                            <span>
                              Carrier:{" "}
                              <strong className="text-slate-200">
                                {ord.courierPartner}
                              </strong>{" "}
                              ({ord.trackingNumber})
                            </span>
                          ) : (
                            <span>Placed on {ord.date}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {permissions.canUpdateOrderStatus &&
                            ord.status !== "Delivered" && (
                              <select
                                aria-label={`Update status for ${ord.id}`}
                                value={ord.status}
                                onChange={(e) =>
                                  void updateOrderStatus(
                                    ord.id,
                                    e.target.value as OrderStatus
                                  )
                                }
                                className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            )}

                          <Link
                            href={`/track/${ord.id}`}
                            className="px-2.5 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-medium transition-colors"
                          >
                            Track Shipment →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
