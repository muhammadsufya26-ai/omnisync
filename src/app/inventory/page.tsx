"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Search,
  Filter,
  Plus,
  Minus,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Store,
  ShoppingCart,
  Globe,
  PackageCheck,
  DollarSign,
  Layers,
  X,
  ArrowUpDown,
  PackageOpen,
} from "lucide-react";
import { useOmniSync } from "@/context/OmniSyncContext";

export type InventoryCategory =
  | "Audio & Wearables"
  | "Peripherals"
  | "Charging & Power"
  | "Desk Accessories";

export type StockHealthStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface ChannelAllocations {
  Shopify: number;
  Amazon: number;
  Etsy: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  unitPrice: number;
  allocations: ChannelAllocations;
  lastPushedAt: string;
}

const LOW_STOCK_THRESHOLD = 10;

const CATEGORIES: InventoryCategory[] = [
  "Audio & Wearables",
  "Peripherals",
  "Charging & Power",
  "Desk Accessories",
];

function getTotalStock(allocations: ChannelAllocations): number {
  return allocations.Shopify + allocations.Amazon + allocations.Etsy;
}

function getStockHealth(totalStock: number): StockHealthStatus {
  if (totalStock <= 0) return "Out of Stock";
  if (totalStock < LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
}

const HEALTH_BADGE_STYLES: Record<
  StockHealthStatus,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  "In Stock": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/60",
    dot: "bg-emerald-600",
  },
  "Low Stock": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/60",
    dot: "bg-amber-600",
  },
  "Out of Stock": {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200/60",
    dot: "bg-slate-400",
  },
};

export default function InventoryPage() {
  const {
    inventory: items,
    adjustInventoryStock,
    updateInventoryAllocations,
    pushAllInventoryStock,
    permissions,
    currentRole,
  } = useOmniSync();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [healthFilter, setHealthFilter] = useState<"All" | StockHealthStatus>(
    "All"
  );
  const [categoryFilter, setCategoryFilter] = useState<
    "All" | InventoryCategory
  >("All");

  const [syncingSku, setSyncingSku] = useState<string | null>(null);
  const [isPushingAll, setIsPushingAll] = useState<boolean>(false);
  const [syncIndicator, setSyncIndicator] = useState<{
    sku: string;
    message: string;
  } | null>(null);

  // Edit Allocation Modal State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [allocationDraft, setAllocationDraft] = useState<ChannelAllocations>({
    Shopify: 0,
    Amazon: 0,
    Etsy: 0,
  });

  const editingItem = useMemo(
    () => items.find((i) => i.id === editingItemId) || null,
    [items, editingItemId]
  );

  const triggerSyncPushBanner = (sku: string, message: string) => {
    setSyncIndicator({ sku, message });
    setSyncingSku(sku);
    setTimeout(() => setSyncingSku(null), 1200);
    setTimeout(() => setSyncIndicator(null), 4000);
  };

  const handleInlineAdjustStock = (itemId: string, delta: number) => {
    if (!permissions.canReassignStock) return;
    const currentItem = items.find((i) => i.id === itemId);
    if (!currentItem) return;

    const currentTotal = getTotalStock(currentItem.allocations);
    if (delta < 0 && currentTotal <= 0) return;

    adjustInventoryStock(itemId, delta);
    triggerSyncPushBanner(
      currentItem.sku,
      `Pushed +${delta} unit to channels for SKU ${currentItem.sku}`
    );
  };

  const handleOpenAllocationModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setAllocationDraft({ ...item.allocations });
  };

  const handleApplySplitPreset = (percentages: [number, number, number]) => {
    const total = getTotalStock(allocationDraft);
    const shopify = Math.round(total * percentages[0]);
    const amazon = Math.round(total * percentages[1]);
    const etsy = Math.max(0, total - shopify - amazon);
    setAllocationDraft({
      Shopify: shopify,
      Amazon: amazon,
      Etsy: etsy,
    });
  };

  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const sanitized: ChannelAllocations = {
      Shopify: Math.max(0, Math.floor(Number(allocationDraft.Shopify) || 0)),
      Amazon: Math.max(0, Math.floor(Number(allocationDraft.Amazon) || 0)),
      Etsy: Math.max(0, Math.floor(Number(allocationDraft.Etsy) || 0)),
    };

    const newTotal = getTotalStock(sanitized);
    void updateInventoryAllocations(editingItem.id, sanitized);
    setEditingItemId(null);
    triggerSyncPushBanner(
      editingItem.sku,
      `${editingItem.sku} allocation (${newTotal} units) updated`
    );
  };

  const handlePushAllChannels = () => {
    if (isPushingAll) return;
    setIsPushingAll(true);
    setTimeout(async () => {
      await pushAllInventoryStock();
      setIsPushingAll(false);
      triggerSyncPushBanner(
        "ALL-SKUS",
        `All ${items.length} SKUs synchronized across channels`
      );
    }, 1000);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const total = getTotalStock(item.allocations);
      const health = getStockHealth(total);

      const matchesSearch =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q);

      const matchesHealth =
        healthFilter === "All" || health === healthFilter;

      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;

      return matchesSearch && matchesHealth && matchesCategory;
    });
  }, [items, searchQuery, healthFilter, categoryFilter]);

  const kpis = useMemo(() => {
    let totalUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of items) {
      const stock = getTotalStock(item.allocations);
      const health = getStockHealth(stock);
      totalUnits += stock;
      totalValuation += stock * item.unitPrice;
      if (health === "Low Stock") lowStockCount++;
      if (health === "Out of Stock") outOfStockCount++;
    }

    return {
      totalSkus: items.length,
      totalUnits,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    };
  }, [items]);

  const resetFilters = () => {
    setSearchQuery("");
    setHealthFilter("All");
    setCategoryFilter("All");
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-entry">
      {/* Toast Notification */}
      {syncIndicator && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-900 text-xs font-medium shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12)] animate-entry"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span>{syncIndicator.message}</span>
          <button
            type="button"
            onClick={() => setSyncIndicator(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Inventory &amp; Stock Levels
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time multi-channel inventory counts, threshold alerts, and warehouse allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePushAllChannels}
            disabled={isPushingAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isPushingAll ? "animate-spin" : ""}`}
            />
            <span>{isPushingAll ? "Syncing..." : "Push to Channels"}</span>
          </button>
        </div>
      </div>

      {/* 4 Single-Level KPI Cards */}
      <section
        aria-label="Inventory Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Inventory Units
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                {kpis.totalUnits.toLocaleString()}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Across {kpis.totalSkus} active SKUs
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Stock Valuation
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
                {permissions.canViewFinancials
                  ? `Rs. ${Math.round(kpis.totalValuation).toLocaleString()}`
                  : "••••••"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {permissions.canViewFinancials
              ? "Calculated at unit retail price"
              : "Financials restricted by RBAC"}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Low Stock Threshold
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                  {kpis.lowStockCount}
                </p>
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  &lt; {LOW_STOCK_THRESHOLD} units
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() =>
                setHealthFilter((prev) =>
                  prev === "Low Stock" ? "All" : "Low Stock"
                )
              }
              className="text-amber-700 font-medium hover:underline cursor-pointer"
            >
              {healthFilter === "Low Stock"
                ? "Show All SKUs"
                : "Filter Low Stock →"}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Out of Stock
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                  {kpis.outOfStockCount}
                </p>
                <span className="text-xs text-slate-500">depleted SKUs</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() =>
                setHealthFilter((prev) =>
                  prev === "Out of Stock" ? "All" : "Out of Stock"
                )
              }
              className="text-slate-600 font-medium hover:underline cursor-pointer"
            >
              {healthFilter === "Out of Stock"
                ? "Show All SKUs"
                : "Filter Depleted →"}
            </button>
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
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU or product name..."
              className="w-full pl-10 pr-4 h-10 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Health Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              {(
                [
                  "All",
                  "In Stock",
                  "Low Stock",
                  "Out of Stock",
                ] as Array<"All" | StockHealthStatus>
              ).map((option) => {
                const active = healthFilter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setHealthFilter(option)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as "All" | InventoryCategory)
                }
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all cursor-pointer"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery ||
              healthFilter !== "All" ||
              categoryFilter !== "All") && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[650px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th scope="col" className="py-3.5 pl-6 pr-4">
                  SKU
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Product
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Stock Units
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Channel Allocations
                </th>
                <th scope="col" className="py-3.5 px-4 text-right">
                  Price
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Health
                </th>
                <th scope="col" className="py-3.5 pl-4 pr-6 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 px-6 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                        <PackageOpen className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        No products match your filter
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Try adjusting your search query or reset the filters.
                      </p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const totalStock = getTotalStock(item.allocations);
                  const health = getStockHealth(totalStock);
                  const badge = HEALTH_BADGE_STYLES[health];
                  const isRowSyncing = syncingSku === item.sku;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* SKU */}
                      <th
                        scope="row"
                        className="py-4 pl-6 pr-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap"
                      >
                        <div>{item.sku}</div>
                        <div className="text-[11px] font-sans font-normal text-slate-400 mt-0.5">
                          {isRowSyncing ? "Syncing..." : item.lastPushedAt}
                        </div>
                      </th>

                      {/* Product Name */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-900">
                          {item.name}
                        </div>
                        <span className="inline-block text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded mt-1">
                          {item.category}
                        </span>
                      </td>

                      {/* Inline Stock Adjustment */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleInlineAdjustStock(item.id, -1)
                            }
                            disabled={
                              totalStock <= 0 || !permissions.canReassignStock
                            }
                            aria-label={`Decrease stock for ${item.name}`}
                            className="w-6 h-6 rounded bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200/80 shadow-2xs disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <div className="min-w-[44px] text-center">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {totalStock}
                            </span>
                            <span className="block text-[10px] text-slate-400 leading-none">
                              units
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleInlineAdjustStock(item.id, 1)
                            }
                            disabled={!permissions.canReassignStock}
                            aria-label={`Increase stock for ${item.name}`}
                            className="w-6 h-6 rounded bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200/80 shadow-2xs disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Channel Allocations */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium">
                            <Store className="w-3 h-3 text-emerald-600" />
                            <span>Shopify: {item.allocations.Shopify}</span>
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
                            <ShoppingCart className="w-3 h-3 text-amber-600" />
                            <span>Amazon: {item.allocations.Amazon}</span>
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200/60 font-medium">
                            <Globe className="w-3 h-3 text-orange-600" />
                            <span>Etsy: {item.allocations.Etsy}</span>
                          </span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-4 px-4 whitespace-nowrap text-right font-medium text-slate-900">
                        {permissions.canViewFinancials
                          ? `Rs. ${item.unitPrice.toLocaleString()}`
                          : "••••"}
                      </td>

                      {/* Health Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{health}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-4 pr-6 whitespace-nowrap text-right">
                        <button
                          type="button"
                          disabled={!permissions.canReassignStock}
                          onClick={() => handleOpenAllocationModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>
                            {permissions.canReassignStock
                              ? "Allocate"
                              : `Locked`}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setEditingItemId(null)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="allocation-modal-title"
            className="relative z-10 w-full max-w-lg rounded-xl bg-white border border-slate-200/80 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2
                  id="allocation-modal-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Edit Channel Allocations
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {editingItem.sku} • {editingItem.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                aria-label="Close modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAllocation} className="p-6 space-y-5">
              <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">
                    Combined Inventory Pool
                  </span>
                  <span className="text-lg font-semibold font-mono text-slate-900">
                    {getTotalStock(allocationDraft)} units
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplySplitPreset([0.34, 0.33, 0.33])}
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 cursor-pointer"
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySplitPreset([0.5, 0.3, 0.2])}
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 cursor-pointer"
                  >
                    50 / 30 / 20
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-200/80 bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <div>
                      <label
                        htmlFor="alloc-shopify"
                        className="text-xs font-medium text-slate-900 block"
                      >
                        Shopify Store
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Direct website stock
                      </span>
                    </div>
                  </div>
                  <input
                    id="alloc-shopify"
                    type="number"
                    min={0}
                    max={9999}
                    value={allocationDraft.Shopify}
                    onChange={(e) =>
                      setAllocationDraft((prev) => ({
                        ...prev,
                        Shopify: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-20 px-2.5 py-1 text-right font-mono text-xs font-semibold bg-white border border-slate-200/80 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-200/80 bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <ShoppingCart className="w-4 h-4 text-amber-600" />
                    <div>
                      <label
                        htmlFor="alloc-amazon"
                        className="text-xs font-medium text-slate-900 block"
                      >
                        Amazon Store
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Marketplace reserve
                      </span>
                    </div>
                  </div>
                  <input
                    id="alloc-amazon"
                    type="number"
                    min={0}
                    max={9999}
                    value={allocationDraft.Amazon}
                    onChange={(e) =>
                      setAllocationDraft((prev) => ({
                        ...prev,
                        Amazon: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-20 px-2.5 py-1 text-right font-mono text-xs font-semibold bg-white border border-slate-200/80 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-200/80 bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-orange-600" />
                    <div>
                      <label
                        htmlFor="alloc-etsy"
                        className="text-xs font-medium text-slate-900 block"
                      >
                        Etsy Store
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Custom listing pool
                      </span>
                    </div>
                  </div>
                  <input
                    id="alloc-etsy"
                    type="number"
                    min={0}
                    max={9999}
                    value={allocationDraft.Etsy}
                    onChange={(e) =>
                      setAllocationDraft((prev) => ({
                        ...prev,
                        Etsy: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-20 px-2.5 py-1 text-right font-mono text-xs font-semibold bg-white border border-slate-200/80 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingItemId(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Save Allocations</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
