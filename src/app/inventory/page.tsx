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
  Sparkles,
  PackageCheck,
  DollarSign,
  Layers,
  X,
  ArrowUpDown,
  PackageOpen,
  Radio,
} from "lucide-react";

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

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: "inv-1",
    sku: "OS-AUD-101",
    name: "AeroPods Pro ANC Wireless Earbuds",
    category: "Audio & Wearables",
    unitPrice: 99.5,
    allocations: { Shopify: 24, Amazon: 16, Etsy: 8 },
    lastPushedAt: "2 mins ago",
  },
  {
    id: "inv-2",
    sku: "OS-KBD-400",
    name: "KeyChronos 75% Hot-Swap Aluminum Keyboard",
    category: "Peripherals",
    unitPrice: 195.0,
    allocations: { Shopify: 4, Amazon: 3, Etsy: 1 },
    lastPushedAt: "5 mins ago",
  },
  {
    id: "inv-3",
    sku: "OS-PWR-302",
    name: "VoltMax 20000mAh 65W PD Power Bank",
    category: "Charging & Power",
    unitPrice: 89.99,
    allocations: { Shopify: 32, Amazon: 28, Etsy: 14 },
    lastPushedAt: "8 mins ago",
  },
  {
    id: "inv-4",
    sku: "OS-WTC-800",
    name: "Chronos Fit AMOLED Titanium Smartwatch",
    category: "Audio & Wearables",
    unitPrice: 245.75,
    allocations: { Shopify: 3, Amazon: 2, Etsy: 1 },
    lastPushedAt: "11 mins ago",
  },
  {
    id: "inv-5",
    sku: "OS-DAC-901",
    name: "StudioReference Balanced USB-C DAC/Amp",
    category: "Audio & Wearables",
    unitPrice: 205.0,
    allocations: { Shopify: 0, Amazon: 0, Etsy: 0 },
    lastPushedAt: "14 mins ago",
  },
  {
    id: "inv-6",
    sku: "OS-HUB-510",
    name: "HyperPort 8-in-1 Dual 4K USB-C Hub",
    category: "Peripherals",
    unitPrice: 61.0,
    allocations: { Shopify: 19, Amazon: 14, Etsy: 7 },
    lastPushedAt: "19 mins ago",
  },
  {
    id: "inv-7",
    sku: "OS-DSK-118",
    name: "Walnut Mechanical Wrist Rest (75%)",
    category: "Desk Accessories",
    unitPrice: 68.5,
    allocations: { Shopify: 2, Amazon: 1, Etsy: 4 },
    lastPushedAt: "23 mins ago",
  },
  {
    id: "inv-8",
    sku: "OS-CHG-115",
    name: "GaNPro 140W 4-Port Desktop Charger",
    category: "Charging & Power",
    unitPrice: 57.7,
    allocations: { Shopify: 15, Amazon: 12, Etsy: 5 },
    lastPushedAt: "27 mins ago",
  },
  {
    id: "inv-9",
    sku: "OS-KCP-701",
    name: "Artisan Anodized Brass Esc Keycap",
    category: "Desk Accessories",
    unitPrice: 89.0,
    allocations: { Shopify: 0, Amazon: 0, Etsy: 0 },
    lastPushedAt: "35 mins ago",
  },
];

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
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  "In Stock": {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    icon: PackageCheck,
  },
  "Low Stock": {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    icon: AlertTriangle,
  },
  "Out of Stock": {
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/30",
    icon: XCircle,
  },
};

import { useOmniSync } from "@/context/OmniSyncContext";

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

  // Sync Indicator & Toast State
  const [syncIndicator, setSyncIndicator] = useState<{
    id: number;
    sku: string;
    message: string;
  } | null>(null);
  const [syncingSku, setSyncingSku] = useState<string | null>(null);
  const [isPushingAll, setIsPushingAll] = useState<boolean>(false);

  // Edit Allocation Modal State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [allocationDraft, setAllocationDraft] = useState<ChannelAllocations>({
    Shopify: 0,
    Amazon: 0,
    Etsy: 0,
  });

  const editingItem = useMemo(
    () => items.find((i) => i.id === editingItemId) ?? null,
    [items, editingItemId]
  );

  // Close modal on Escape
  useEffect(() => {
    if (!editingItemId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingItemId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingItemId]);

  const triggerSyncPushBanner = (sku: string, detail?: string) => {
    const id = Date.now();
    setSyncingSku(sku);
    setSyncIndicator({
      id,
      sku,
      message: detail
        ? `Stock pushed to all channels — ${detail}`
        : `Stock pushed to all channels (${sku})`,
    });

    setTimeout(() => {
      setSyncingSku((prev) => (prev === sku ? null : prev));
    }, 800);

    setTimeout(() => {
      setSyncIndicator((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  };

  // Inline Stock Increment / Decrement (backed by PATCH /api/inventory & OmniSyncContext)
  const handleInlineAdjustStock = (itemId: string, delta: number) => {
    if (!permissions.canReassignStock) return;
    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const currentTotal = getTotalStock(target.allocations);
    if (currentTotal + delta < 0) return;

    void adjustInventoryStock(itemId, delta);

    const newTotal = Math.max(0, currentTotal + delta);
    triggerSyncPushBanner(
      target.sku,
      `${target.sku} updated to ${newTotal} units across Shopify, Amazon & Etsy`
    );
  };

  // Open Edit Allocation Modal
  const handleOpenAllocationModal = (item: InventoryItem) => {
    if (!permissions.canReassignStock) return;
    setEditingItemId(item.id);
    setAllocationDraft({ ...item.allocations });
  };

  // Apply Preset Split in Modal
  const handleApplySplitPreset = (
    ratios: [number, number, number] // e.g. [0.5, 0.3, 0.2]
  ) => {
    const total = getTotalStock(allocationDraft);
    const shopify = Math.round(total * ratios[0]);
    const amazon = Math.round(total * ratios[1]);
    const etsy = Math.max(0, total - shopify - amazon);
    setAllocationDraft({
      Shopify: shopify,
      Amazon: amazon,
      Etsy: etsy,
    });
  };

  // Save Multi-Channel Allocation Modal (backed by PATCH /api/inventory & OmniSyncContext)
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
      `${editingItem.sku} allocation (${newTotal} units) synced to Shopify, Amazon & Etsy`
    );
  };

  // Force Global Stock Push
  const handlePushAllChannels = () => {
    if (isPushingAll) return;
    setIsPushingAll(true);
    setTimeout(async () => {
      await pushAllInventoryStock();
      setIsPushingAll(false);
      triggerSyncPushBanner(
        "ALL-SKUS",
        `All ${items.length} SKUs synchronized across Shopify, Amazon & Etsy`
      );
    }, 1000);
  };

  // Filtered Products
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

  // Real-time Inventory KPI Metrics
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-20">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Real-Time Stock Ledger</span>
            </span>

            {/* Live Auto-Sync Status Indicator */}
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>
                {syncIndicator
                  ? "Stock pushed to all channels"
                  : "Auto-sync active across 3 channels"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePushAllChannels}
              disabled={isPushingAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-70 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isPushingAll ? "animate-spin" : ""}`}
              />
              <span>
                {isPushingAll ? "Pushing Stock..." : "Push Stock to Channels"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating "Stock pushed to all channels" Toast Banner */}
      {syncIndicator && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-900/95 border border-emerald-500/40 text-neutral-100 text-xs font-medium shadow-2xl backdrop-blur-md"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-300">
              Stock pushed to all channels
            </p>
            <p className="text-[11px] text-neutral-400">
              {syncIndicator.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSyncIndicator(null)}
            aria-label="Dismiss notification"
            className="text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Inventory &amp; Stock Sync
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Adjust total stock inline or redistribute channel allocations
              across Shopify, Amazon, and Etsy in real time.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
              Showing{" "}
              <strong className="text-white">{filteredItems.length}</strong> of{" "}
              <strong className="text-white">{items.length}</strong> SKUs
            </span>
          </div>
        </div>

        {/* Top Inventory KPI Cards */}
        <section
          aria-label="Inventory Summary Metrics"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {/* Total SKUs & Units */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Total Inventory Units
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-2">
                {kpis.totalUnits}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Across {kpis.totalSkus} active SKUs
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Inventory Value */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Stock Valuation
              </p>
              {permissions.canViewFinancials ? (
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2">
                  $
                  {kpis.totalValuation.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              ) : (
                <p className="text-lg font-bold text-neutral-400 font-mono mt-2">
                  •••••• ({currentRole})
                </p>
              )}
              <p className="text-xs text-neutral-500 mt-1">
                {permissions.canViewFinancials
                  ? "Retail value across storefronts"
                  : "Financials hidden by RBAC"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Low Stock Threshold
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl sm:text-3xl font-bold text-amber-400">
                  {kpis.lowStockCount}
                </p>
                <span className="text-xs text-amber-300/90">
                  SKUs &lt; {LOW_STOCK_THRESHOLD} units
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setHealthFilter((prev) =>
                    prev === "Low Stock" ? "All" : "Low Stock"
                  )
                }
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline mt-1 cursor-pointer"
              >
                {healthFilter === "Low Stock"
                  ? "Show All SKUs"
                  : "Filter Low Stock →"}
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Out of Stock */}
          <div className="rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Out of Stock
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl sm:text-3xl font-bold text-rose-400">
                  {kpis.outOfStockCount}
                </p>
                <span className="text-xs text-rose-300/90">depleted SKUs</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setHealthFilter((prev) =>
                    prev === "Out of Stock" ? "All" : "Out of Stock"
                  )
                }
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline mt-1 cursor-pointer"
              >
                {healthFilter === "Out of Stock"
                  ? "Show All SKUs"
                  : "Filter Depleted →"}
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Search & Filters + Inventory Table Card */}
        <div className="rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Live Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by SKU or product title (e.g. OS-KBD-400)..."
                aria-label="Search by SKU or product title"
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 transition-all"
              />
            </div>

            {/* Stock Health & Category Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Stock Health Filter Pills */}
              <div
                role="group"
                aria-label="Filter by stock health"
                className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-xl"
              >
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? "bg-neutral-800 text-white shadow-2xs"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="category-filter"
                  className="text-xs font-medium text-neutral-400 inline-flex items-center gap-1"
                >
                  <Filter className="w-3.5 h-3.5 text-neutral-500" />
                  Category:
                </label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value as "All" | InventoryCategory
                    )
                  }
                  className="px-3 py-2 text-xs sm:text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                  className="px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Inventory Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <th scope="col" className="py-3.5 pl-6 pr-4">
                    <span className="inline-flex items-center gap-1">
                      SKU
                      <ArrowUpDown className="w-3 h-3 text-neutral-600" />
                    </span>
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Product Name
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Stock Level
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Channel Allocations
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    Unit Price
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Status
                  </th>
                  <th scope="col" className="py-3.5 pl-4 pr-6 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-sm">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 px-6 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-neutral-400 mb-3">
                          <PackageOpen className="w-6 h-6" />
                        </div>
                        <p className="text-base font-semibold text-neutral-200">
                          No matching products found
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          Try clearing your SKU search or changing the stock
                          health and category filters.
                        </p>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 transition-colors cursor-pointer"
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
                    const HealthIcon = badge.icon;
                    const isRowSyncing = syncingSku === item.sku;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isRowSyncing
                            ? "bg-emerald-500/10"
                            : "hover:bg-neutral-800/40"
                        }`}
                      >
                        {/* SKU */}
                        <th
                          scope="row"
                          className="py-4 pl-6 pr-4 font-mono text-xs sm:text-sm font-semibold text-white whitespace-nowrap"
                        >
                          <div>{item.sku}</div>
                          <div className="text-[11px] font-sans font-normal text-neutral-500 flex items-center gap-1 mt-0.5">
                            <RefreshCw
                              className={`w-2.5 h-2.5 ${
                                isRowSyncing
                                  ? "text-emerald-400 animate-spin"
                                  : "text-neutral-500"
                              }`}
                            />
                            <span>
                              {isRowSyncing
                                ? "Pushing to channels..."
                                : `Synced ${item.lastPushedAt}`}
                            </span>
                          </div>
                        </th>

                        {/* Product Name & Category */}
                        <td className="py-4 px-4">
                          <div className="font-medium text-neutral-100">
                            {item.name}
                          </div>
                          <span className="inline-block text-[11px] text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded mt-1">
                            {item.category}
                          </span>
                        </td>

                        {/* Live Inline Stock Level Adjuster */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleInlineAdjustStock(item.id, -1)
                              }
                              disabled={
                                totalStock <= 0 || !permissions.canReassignStock
                              }
                              aria-label={`Decrease stock for ${item.name}`}
                              className="w-7 h-7 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center border border-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <div className="min-w-[54px] text-center">
                              <span
                                className={`font-mono text-sm font-bold ${
                                  totalStock === 0
                                    ? "text-rose-400"
                                    : totalStock < LOW_STOCK_THRESHOLD
                                      ? "text-amber-400"
                                      : "text-white"
                                }`}
                              >
                                {totalStock}
                              </span>
                              <span className="block text-[10px] text-neutral-500 leading-none">
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
                              className="w-7 h-7 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-emerald-400 flex items-center justify-center border border-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Channel Allocations (Shopify, Amazon, Etsy) */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                              <Store className="w-3 h-3 text-emerald-400" />
                              <span>Shopify:</span>
                              <strong className="font-mono text-white">
                                {item.allocations.Shopify}
                              </strong>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                              <ShoppingCart className="w-3 h-3 text-amber-400" />
                              <span>Amazon:</span>
                              <strong className="font-mono text-white">
                                {item.allocations.Amazon}
                              </strong>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-300 border border-orange-500/25">
                              <Globe className="w-3 h-3 text-orange-400" />
                              <span>Etsy:</span>
                              <strong className="font-mono text-white">
                                {item.allocations.Etsy}
                              </strong>
                            </span>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="py-4 px-4 whitespace-nowrap text-right font-semibold text-white">
                          {permissions.canViewFinancials
                            ? `$${item.unitPrice.toFixed(2)}`
                            : "••••"}
                        </td>

                        {/* Stock Health Status Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <HealthIcon className="w-3.5 h-3.5" />
                              {health}
                            </span>
                            {totalStock > 0 &&
                              totalStock < LOW_STOCK_THRESHOLD && (
                                <p className="text-[10px] text-amber-400/90 font-medium">
                                  Below {LOW_STOCK_THRESHOLD}-unit threshold
                                </p>
                              )}
                          </div>
                        </td>

                        {/* Edit Allocation Action */}
                        <td className="py-4 pl-4 pr-6 whitespace-nowrap text-right">
                          <button
                            type="button"
                            disabled={!permissions.canReassignStock}
                            onClick={() => handleOpenAllocationModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {permissions.canReassignStock
                                ? "Edit Allocation"
                                : `Locked (${currentRole})`}
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
      </main>

      {/* Edit Multi-Channel Allocation Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
          editingItem
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!editingItem}
      >
        <div
          onClick={() => setEditingItemId(null)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="allocation-modal-title"
          className={`relative z-10 w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden transform transition-all duration-200 ${
            editingItem ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {editingItem && (
            <>
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h2
                      id="allocation-modal-title"
                      className="text-base font-bold text-white"
                    >
                      Edit Channel Allocation
                    </h2>
                    <p className="text-xs text-neutral-400 font-mono">
                      {editingItem.sku} — {editingItem.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingItemId(null)}
                  aria-label="Close allocation modal"
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveAllocation} className="p-6 space-y-5">
                {/* Total Computed Banner */}
                <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-neutral-400 block">
                      Combined Multi-Channel Stock
                    </span>
                    <span className="text-xl font-bold font-mono text-white">
                      {getTotalStock(allocationDraft)} units
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleApplySplitPreset([0.34, 0.33, 0.33])
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 cursor-pointer"
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySplitPreset([0.5, 0.3, 0.2])}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 cursor-pointer"
                    >
                      50 / 30 / 20
                    </button>
                  </div>
                </div>

                {/* Per-Channel Quantity Inputs */}
                <div className="space-y-3">
                  {/* Shopify */}
                  <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <label
                          htmlFor="alloc-shopify"
                          className="text-sm font-semibold text-white block"
                        >
                          Shopify Storefront
                        </label>
                        <span className="text-xs text-neutral-500">
                          Primary D2C warehouse pool
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
                      className="w-24 px-3 py-2 text-right font-mono text-sm font-semibold bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* Amazon */}
                  <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <label
                          htmlFor="alloc-amazon"
                          className="text-sm font-semibold text-white block"
                        >
                          Amazon Seller Central
                        </label>
                        <span className="text-xs text-neutral-500">
                          FBA &amp; FBM marketplace reserve
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
                      className="w-24 px-3 py-2 text-right font-mono text-sm font-semibold bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* Etsy */}
                  <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <label
                          htmlFor="alloc-etsy"
                          className="text-sm font-semibold text-white block"
                        >
                          Etsy Shop
                        </label>
                        <span className="text-xs text-neutral-500">
                          Artisan &amp; custom listing pool
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
                      className="w-24 px-3 py-2 text-right font-mono text-sm font-semibold bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingItemId(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-sm shadow-emerald-500/20 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Save &amp; Push to All Channels</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
