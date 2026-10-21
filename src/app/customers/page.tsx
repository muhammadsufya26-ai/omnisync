"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  ArrowUpRight,
  X,
  Store,
  ShoppingCart,
  Globe,
  Clock,
  DollarSign,
  ChevronRight,
} from "lucide-react";
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
  Shopify: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
  Amazon: "bg-amber-50 text-amber-800 border-amber-200/60",
  Etsy: "bg-orange-50 text-orange-800 border-orange-200/60",
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  Pending: "bg-amber-50 text-amber-800 border-amber-200/60",
  Shipped: "bg-blue-50 text-blue-800 border-blue-200/60",
  Delivered: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
  Cancelled: "bg-slate-100 text-slate-700 border-slate-200/60",
};

function formatUSD(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString()}`;
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
      const emailKey =
        order.customerEmail?.toLowerCase() ||
        `${order.customer.toLowerCase().replace(/\s+/g, ".")}@customer.local`;

      const existing = map.get(emailKey);
      if (existing) {
        existing.totalOrders += 1;
        existing.lifetimeValue += order.amount;
        if (!existing.channels.includes(order.channel)) {
          existing.channels.push(order.channel);
        }
        existing.orders.push(order);
      } else {
        map.set(emailKey, {
          email: emailKey,
          name: order.customer,
          totalOrders: 1,
          lifetimeValue: order.amount,
          channels: [order.channel],
          lastActiveDate: order.date,
          lastSyncedAt: order.syncedAt,
          shippingAddress: order.shippingAddress,
          orders: [order],
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.lifetimeValue - a.lifetimeValue
    );
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return customerProfiles.filter((cust) => {
      const matchesSearch =
        !q ||
        cust.name.toLowerCase().includes(q) ||
        cust.email.toLowerCase().includes(q) ||
        cust.shippingAddress.toLowerCase().includes(q);

      const matchesChannel =
        channelFilter === "All" || cust.channels.includes(channelFilter);

      const matchesSegment =
        segmentFilter === "All"
          ? true
          : segmentFilter === "Repeat"
          ? cust.totalOrders >= 2
          : cust.lifetimeValue >= 300;

      return matchesSearch && matchesChannel && matchesSegment;
    });
  }, [customerProfiles, searchQuery, channelFilter, segmentFilter]);

  const selectedCustomer = useMemo(
    () =>
      customerProfiles.find((c) => c.email === selectedCustomerEmail) || null,
    [customerProfiles, selectedCustomerEmail]
  );

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
    <div className="space-y-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-entry">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Customers &amp; Omnichannel Profiles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Identity-resolved customer profiles across Shopify, Amazon, and Etsy storefronts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs transition-colors"
          >
            <span>View All Orders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Single-Level KPI Cards */}
      <section
        aria-label="Customer Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Unique Customers
          </p>
          <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            {customerProfiles.length}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Deduplicated by verified email
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Cumulative Customer LTV
          </p>
          <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            {permissions.canViewFinancials
              ? formatUSD(totalLtv)
              : "••••••"}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Avg {permissions.canViewFinancials && customerProfiles.length > 0 ? formatUSD(totalLtv / customerProfiles.length) : "•••"} per customer
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Repeat Buyers (2+ Orders)
          </p>
          <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            {repeatCount}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {customerProfiles.length > 0
              ? `${Math.round((repeatCount / customerProfiles.length) * 100)}% retention rate`
              : "0%"}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Omnichannel Shoppers
          </p>
          <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
            {multiChannelCount}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Purchased across 2+ storefronts
          </div>
        </div>
      </section>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name, email, or city..."
              className="w-full pl-10 pr-4 h-10 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Segment Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              {(["All", "Repeat", "VIP"] as const).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setSegmentFilter(seg)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    segmentFilter === seg
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {seg === "All"
                    ? "All Customers"
                    : seg === "Repeat"
                    ? "Repeat"
                    : "VIP Customers"}
                </button>
              ))}
            </div>

            {/* Channel Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              {(["All", "Shopify", "Amazon", "Etsy"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    channelFilter === ch
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[650px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 pl-6 pr-4">Customer</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Lifetime Value</th>
                <th className="py-3.5 px-4">Channels</th>
                <th className="py-3.5 px-4">Last Active</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm bg-white">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                    No customer profiles match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.email}
                    onClick={() => setSelectedCustomerEmail(customer.email)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0">
                          {customer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {customer.name}
                            </span>
                            {customer.lifetimeValue >= 300 && (
                              <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">
                            {customer.shippingAddress}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {customer.email}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-medium text-slate-700">
                        {customer.totalOrders} {customer.totalOrders === 1 ? "order" : "orders"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {permissions.canViewFinancials
                        ? formatUSD(customer.lifetimeValue)
                        : "••••"}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        {customer.channels.map((ch) => (
                          <span
                            key={ch}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${CHANNEL_BADGE[ch]}`}
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {customer.lastActiveDate}
                    </td>

                    <td className="py-3.5 pl-4 pr-6 text-right">
                      <span className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile Slide-over Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setSelectedCustomerEmail(null)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs transition-opacity"
          />

          <div className="relative z-10 w-full max-w-md bg-white border-l border-slate-200/80 shadow-2xl flex flex-col animate-entry">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {selectedCustomer.name}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedCustomer.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerEmail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] uppercase font-medium text-slate-500">
                    Orders
                  </p>
                  <p className="text-base font-semibold text-slate-900 mt-1">
                    {selectedCustomer.totalOrders}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] uppercase font-medium text-slate-500">
                    LTV
                  </p>
                  <p className="text-base font-semibold text-slate-900 mt-1">
                    {permissions.canViewFinancials
                      ? formatUSD(selectedCustomer.lifetimeValue)
                      : "••••"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] uppercase font-medium text-slate-500">
                    Active
                  </p>
                  <p className="text-xs font-semibold text-slate-900 mt-1.5">
                    {selectedCustomer.lastActiveDate}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[11px] font-medium text-slate-500 uppercase">
                  Shipping Address
                </p>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {selectedCustomer.shippingAddress}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Order History ({selectedCustomer.orders.length})
                </h3>

                <div className="space-y-2.5">
                  {selectedCustomer.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-lg border border-slate-200/80 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900">
                            #{ord.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                              CHANNEL_BADGE[ord.channel]
                            }`}
                          >
                            {ord.channel}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                              STATUS_BADGE[ord.status]
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {permissions.canViewFinancials
                            ? formatUSD(ord.amount)
                            : "••••"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>{ord.items.length} items</span>
                        <Link
                          href={`/track/${ord.id}`}
                          className="text-slate-900 font-medium hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Track</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
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
