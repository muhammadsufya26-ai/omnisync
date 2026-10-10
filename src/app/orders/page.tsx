"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Sparkles,
  ArrowUpDown,
  Layers,
  DollarSign,
  X,
  MapPin,
  Mail,
  Phone,
  User,
  Package,
  Calendar,
  ChevronRight,
  Store,
  ShoppingCart,
  Download,
  CheckSquare,
  BarChart3,
  Printer,
  ExternalLink,
  ShieldAlert,
  Lock,
  Radio,
  MessageCircle,
  AlertTriangle,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import {
  useOmniSync,
  type Channel,
  type LocalizedChannelLabel,
  type OrderStatus,
  type CourierPartner,
  type OrderedItem,
  type OrderRecord,
} from "@/context/OmniSyncContext";

export type {
  Channel,
  LocalizedChannelLabel,
  OrderStatus,
  CourierPartner,
  OrderedItem,
  OrderRecord,
};

export interface OrderAnalyticsMetrics {
  totalRevenue: number;
  activeRevenue: number;
  totalOrders: number;
  activeOrdersCount: number;
  cancelledCount: number;
  pendingCount: number;
  shippedCount: number;
  deliveredCount: number;
  highRiskCount: number;
  flaggedPhoneCount: number;
  localizedChannelCounts: Record<LocalizedChannelLabel, number>;
}

type FilterTabValue =
  | "All"
  | OrderStatus
  | "HIGH_RISK"
  | "CLEAN_RETURNS";

const LOCAL_COURIERS: CourierPartner[] = [
  "TCS Express",
  "Trax Logistics",
  "Leopards Courier",
];

const COURIER_PREFIX: Record<string, string> = {
  "TCS Express": "TCS",
  "Trax Logistics": "TRAX-PK",
  "Leopards Courier": "LCS",
  TCS: "TCS",
  Leopards: "LCS",
  DHL: "DHL-AWB",
  FedEx: "FDX-PRI",
  BlueEx: "BLX-COD",
};

const LOCALIZED_CHANNELS: Array<{
  label: LocalizedChannelLabel;
  subtitle: string;
  badgeClass: string;
  dot: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    label: "WhatsApp",
    subtitle: "Ordered via direct DM voice note confirmation",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    dot: "bg-[#16A34A]",
    icon: MessageCircle,
  },
  {
    label: "Instagram DM",
    subtitle: "Sale campaign: Winter drop",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/60",
    dot: "bg-rose-500",
    icon: Sparkles,
  },
  {
    label: "Daraz Store",
    subtitle: "Daraz Mall order sync",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/60",
    dot: "bg-amber-500",
    icon: ShoppingCart,
  },
  {
    label: "Online Store",
    subtitle: "Direct Checkout",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    dot: "bg-indigo-500",
    icon: Store,
  },
];

function getLocalizedChannel(order: OrderRecord): LocalizedChannelLabel {
  if (order.channelDisplay) return order.channelDisplay;
  if (order.channel === "Shopify") return "WhatsApp";
  if (order.channel === "Amazon") return "Daraz Store";
  return "Instagram DM";
}

function getLocalizedChannelNote(order: OrderRecord): string {
  if (order.channelNote) return order.channelNote;
  const label = getLocalizedChannel(order);
  const found = LOCALIZED_CHANNELS.find((c) => c.label === label);
  return found?.subtitle || "Direct Checkout";
}

function getChannelStyle(label: LocalizedChannelLabel) {
  return (
    LOCALIZED_CHANNELS.find((c) => c.label === label) || LOCALIZED_CHANNELS[0]
  );
}

const STATUS_BADGES: Record<
  OrderStatus,
  {
    humanLabel: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Pending: {
    humanLabel: "Awaiting WhatsApp Confirmation",
    bg: "bg-[#FFFBEB]",
    text: "text-[#92400E]",
    border: "border-[#FEF3C7]",
    dot: "bg-amber-500",
    icon: Clock,
  },
  Shipped: {
    humanLabel: "Dispatched via Courier",
    bg: "bg-[#EFF6FF]",
    text: "text-[#1E40AF]",
    border: "border-[#DBEAFE]",
    dot: "bg-blue-600",
    icon: Truck,
  },
  Delivered: {
    humanLabel: "COD Delivered & Settled",
    bg: "bg-[#F0FDF4]",
    text: "text-[#166534]",
    border: "border-[#DCFCE7]",
    dot: "bg-[#16A34A]",
    icon: CheckCircle2,
  },
  Cancelled: {
    humanLabel: "Returned / RTO",
    bg: "bg-[#FEF2F2]",
    text: "text-[#991B1B]",
    border: "border-[#FEE2E2]",
    dot: "bg-[#DC2626]",
    icon: XCircle,
  },
};

const ALL_STATUSES: OrderStatus[] = [
  "Pending",
  "Shipped",
  "Delivered",
  "Cancelled",
];

function formatPKR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-US")}`;
}

function buildWhatsAppVerifyUrl(order: OrderRecord): string {
  const rawPhone = order.customerPhone || "+92 300 1234567";
  let digits = rawPhone.replace(/[^0-9]/g, "");
  if (digits.startsWith("03")) {
    digits = `92${digits.slice(1)}`;
  } else if (!digits.startsWith("92")) {
    digits = `923001234567`;
  }
  const message = `Salam ${order.customer}! Your order ${order.id} (${formatPKR(
    order.amount
  )}) is ready for dispatch to "${
    order.shippingAddress
  }". Please reply YES to confirm your Cash-on-Delivery parcel.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function getOrderRiskDetails(order: OrderRecord): {
  score: number;
  level: "HIGH" | "MODERATE" | "LOW";
  reason: string;
} {
  const score =
    order.rtoRiskScore ??
    (order.status === "Cancelled"
      ? 86
      : order.status === "Pending"
        ? 82
        : 12);
  const level =
    order.rtoRiskLevel ??
    (score >= 70 ? "HIGH" : score >= 45 ? "MODERATE" : "LOW");
  const reason =
    order.rtoRiskReason ??
    (level === "HIGH"
      ? "Previous parcel returned undelivered in Gujranwala • Incomplete house number detected."
      : level === "MODERATE"
        ? "First-time COD buyer without house/plot number • WhatsApp call verification advised."
        : "Complete residential address verified • Repeat COD customer with zero returns.");
  return { score, level, reason };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateBarcodeBars(code: string): number[] {
  const clean = code || "OMS-1049";
  const bars: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    bars.push((charCode % 3) + 1);
    bars.push(((charCode >> 2) % 2) + 1);
    bars.push(((charCode >> 4) % 3) + 1);
  }
  return bars.slice(0, 48);
}

export default function OrdersPage() {
  const {
    orders,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    triggerChannelOrdersSync,
    triggerSignedWebhookOrder,
    permissions,
    currentRole,
    sseConnected,
  } = useOmniSync();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<
    "All" | LocalizedChannelLabel
  >("All");
  const [statusFilter, setStatusFilter] = useState<FilterTabValue>("All");

  // Sliding Tab Indicator State & Refs
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 4, width: 82, opacity: 1 });

  // Live Sync Simulation State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSimulatingWebhook, setIsSimulatingWebhook] =
    useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("Just now");
  const [recheckingOrderId, setRecheckingOrderId] = useState<string | null>(
    null
  );

  // Toast Notification State
  const [toast, setToast] = useState<{
    id: number;
    message: string;
  } | null>(null);

  // Batch / Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Slide-over Drawer State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fulfillment Courier & Tracking State inside Drawer
  const [courierInput, setCourierInput] =
    useState<CourierPartner>("TCS Express");
  const [trackingInput, setTrackingInput] = useState<string>("TCS-77291048");
  const [estimatedDeliveryInput, setEstimatedDeliveryInput] =
    useState<string>("Oct 9, 2026");

  // Printable Shipping Slip Modal State
  const [shippingSlipOrder, setShippingSlipOrder] =
    useState<OrderRecord | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  // Synchronize courier & tracking form fields whenever an order is opened in the drawer
  useEffect(() => {
    if (!selectedOrder) return;
    const defaultCourier: CourierPartner =
      selectedOrder.courierPartner &&
      LOCAL_COURIERS.includes(selectedOrder.courierPartner)
        ? selectedOrder.courierPartner
        : "TCS Express";
    const digits = selectedOrder.id.replace(/[^0-9]/g, "") || "1049";
    const prefix = COURIER_PREFIX[defaultCourier] || "TCS";
    const defaultTracking =
      selectedOrder.trackingNumber || `${prefix}-7729${digits}`;
    setCourierInput(defaultCourier);
    setTrackingInput(defaultTracking);
    setEstimatedDeliveryInput(
      selectedOrder.estimatedDelivery || "Oct 9, 2026"
    );
  }, [selectedOrder]);

  const showToastNotification = (message: string) => {
    const toastId = Date.now();
    setToast({ id: toastId, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === toastId ? null : prev));
    }, 5000);
  };

  // Close drawer or shipping slip modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (shippingSlipOrder) {
          setShippingSlipOrder(null);
        } else if (selectedOrderId) {
          setSelectedOrderId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrderId, shippingSlipOrder]);

  // Dynamically computed Analytics KPI Metrics
  const metrics: OrderAnalyticsMetrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const activeRevenue = orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.amount, 0);

    const pendingCount = orders.filter((o) => o.status === "Pending").length;
    const shippedCount = orders.filter((o) => o.status === "Shipped").length;
    const deliveredCount = orders.filter(
      (o) => o.status === "Delivered"
    ).length;
    const cancelledCount = orders.filter(
      (o) => o.status === "Cancelled"
    ).length;
    const activeOrdersCount = orders.length - cancelledCount;

    const highRiskCount = orders.filter(
      (o) => getOrderRiskDetails(o).level === "HIGH"
    ).length;

    const flaggedPhoneCount = orders.filter(
      (o) => getOrderRiskDetails(o).level === "HIGH" || o.status === "Pending"
    ).length;

    const localizedChannelCounts: Record<LocalizedChannelLabel, number> = {
      WhatsApp: orders.filter((o) => getLocalizedChannel(o) === "WhatsApp")
        .length,
      "Instagram DM": orders.filter(
        (o) => getLocalizedChannel(o) === "Instagram DM"
      ).length,
      "Daraz Store": orders.filter(
        (o) => getLocalizedChannel(o) === "Daraz Store"
      ).length,
      "Online Store": orders.filter(
        (o) => getLocalizedChannel(o) === "Online Store"
      ).length,
    };

    return {
      totalRevenue,
      activeRevenue,
      totalOrders: orders.length,
      activeOrdersCount,
      cancelledCount,
      pendingCount,
      shippedCount,
      deliveredCount,
      highRiskCount,
      flaggedPhoneCount,
      localizedChannelCounts,
    };
  }, [orders]);

  // Sliding Tabs Configuration
  const filterTabs: Array<{
    id: FilterTabValue;
    label: string;
    count: number;
    hasHighRiskPing?: boolean;
  }> = useMemo(
    () => [
      { id: "All", label: "All", count: orders.length },
      { id: "Pending", label: "Pending", count: metrics.pendingCount },
      {
        id: "HIGH_RISK",
        label: "High Risk",
        count: metrics.highRiskCount,
        hasHighRiskPing: true,
      },
      { id: "Shipped", label: "Dispatched", count: metrics.shippedCount },
      { id: "Delivered", label: "Delivered", count: metrics.deliveredCount },
      { id: "CLEAN_RETURNS", label: "Today's Returns", count: 0 },
    ],
    [
      orders.length,
      metrics.pendingCount,
      metrics.highRiskCount,
      metrics.shippedCount,
      metrics.deliveredCount,
    ]
  );

  // Measure active tab position so the sliding pill indicator animates smoothly
  useEffect(() => {
    const updateIndicator = () => {
      const activeBtn = tabButtonRefs.current[statusFilter];
      if (activeBtn) {
        setTabIndicatorStyle({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
          opacity: 1,
        });
      } else {
        setTabIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [statusFilter, filterTabs]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "CLEAN_RETURNS") {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const localizedCh = getLocalizedChannel(order);
      const risk = getOrderRiskDetails(order);

      const matchesSearch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        (order.customerPhone &&
          order.customerPhone.toLowerCase().includes(query)) ||
        order.shippingAddress.toLowerCase().includes(query) ||
        (order.trackingNumber &&
          order.trackingNumber.toLowerCase().includes(query));

      const matchesChannel =
        channelFilter === "All" || localizedCh === channelFilter;

      const matchesStatus =
        statusFilter === "All"
          ? true
          : statusFilter === "HIGH_RISK"
            ? risk.level === "HIGH"
            : order.status === statusFilter;

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [orders, searchQuery, channelFilter, statusFilter]);

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedIds.includes(o.id));
  const someFilteredSelected =
    filteredOrders.some((o) => selectedIds.includes(o.id)) &&
    !allFilteredSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  // Live Channel Sync Simulation
  const handleSyncChannels = () => {
    if (isSyncing) return;
    setIsSyncing(true);

    setTimeout(async () => {
      const injectedOrders = await triggerChannelOrdersSync();
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSyncedAt(nowTime);
      setIsSyncing(false);

      const uniqueChannels = Array.from(
        new Set(injectedOrders.map((o) => getLocalizedChannel(o)))
      );
      const channelsLabel = uniqueChannels.join(" & ") || "WhatsApp & Daraz";
      showToastNotification(
        `Synced ${injectedOrders.length} new COD ${
          injectedOrders.length === 1 ? "order" : "orders"
        } from ${channelsLabel}.`
      );
    }, 1500);
  };

  // Real-Time Signed Webhook Push Test
  const handleSimulateWebhookOrder = async () => {
    if (isSimulatingWebhook) return;
    setIsSimulatingWebhook(true);
    try {
      const created = await triggerSignedWebhookOrder();
      if (created) {
        showToastNotification(
          `New order #${created.id} received via ${getLocalizedChannel(
            created
          )} (${formatPKR(created.amount)}).`
        );
      }
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  // Recheck AI Risk Action with Human Toast Feedback
  const handleRecheckRisk = (order: OrderRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecheckingOrderId(order.id);
    setTimeout(() => {
      setRecheckingOrderId(null);
      const count = order.previousOrdersCount || 4;
      showToastNotification(
        `Gemini scanned customer purchase frequency across ${count} previous orders.`
      );
    }, 550);
  };

  // Single Order Status Update
  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    if (!permissions.canUpdateOrderStatus) {
      showToastNotification(
        `Role ${currentRole} has read-only access and cannot modify order status.`
      );
      return;
    }

    if (nextStatus === "Shipped") {
      const prefix = COURIER_PREFIX[courierInput] || "TCS";
      const ensuredTracking =
        trackingInput.trim() ||
        `${prefix}-7729${orderId.replace(/[^0-9]/g, "")}`;
      void updateOrderStatus(orderId, "Shipped", {
        courierPartner: courierInput,
        trackingNumber: ensuredTracking,
        estimatedDelivery: estimatedDeliveryInput.trim() || "Oct 9, 2026",
      });
      const courierShort = courierInput.startsWith("TCS")
        ? "TCS"
        : courierInput;
      showToastNotification(
        `${courierShort} Airway bill generated for Order #${orderId}. Tracking code assigned.`
      );
      return;
    }

    void updateOrderStatus(orderId, nextStatus);
    showToastNotification(
      `Order #${orderId} updated to "${STATUS_BADGES[nextStatus].humanLabel}".`
    );
  };

  const handleSaveCourierDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!permissions.canUpdateOrderStatus) return;

    const prefix = COURIER_PREFIX[courierInput] || "TCS";
    const ensuredTracking =
      trackingInput.trim() ||
      `${prefix}-7729${selectedOrder.id.replace(/[^0-9]/g, "")}`;

    void updateOrderStatus(selectedOrder.id, "Shipped", {
      courierPartner: courierInput,
      trackingNumber: ensuredTracking,
      estimatedDelivery: estimatedDeliveryInput.trim() || "Oct 9, 2026",
    });

    const courierShort = courierInput.startsWith("TCS") ? "TCS" : courierInput;
    showToastNotification(
      `${courierShort} Airway bill generated for Order #${selectedOrder.id}. Tracking code assigned.`
    );
  };

  // Quick 1-click Dispatch directly from a table row
  const handleQuickDispatchOrder = (
    order: OrderRecord,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!permissions.canUpdateOrderStatus) return;
    const assignedCourier: CourierPartner =
      order.courierPartner || "TCS Express";
    const assignedTracking =
      order.trackingNumber ||
      `TCS-7729${order.id.replace(/[^0-9]/g, "") || "1049"}`;
    void updateOrderStatus(order.id, "Shipped", {
      courierPartner: assignedCourier,
      trackingNumber: assignedTracking,
      estimatedDelivery: order.estimatedDelivery || "Oct 9, 2026",
    });
    showToastNotification(
      `TCS Airway bill generated for Order #${order.id}. Tracking code assigned.`
    );
  };

  const handleRegenerateTracking = (courier: CourierPartner) => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    const prefix = COURIER_PREFIX[courier] || "TCS";
    setTrackingInput(`${prefix}-${rand}`);
  };

  // Bulk Row Checkbox Handlers
  const handleToggleRowSelect = (orderId: string) => {
    setSelectedIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredOrders.map((o) => o.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([
        ...selectedIds,
        ...filteredOrders.map((o) => o.id),
      ]);
      setSelectedIds(Array.from(merged));
    }
  };

  const handleBulkMarkShipped = () => {
    if (selectedIds.length === 0 || !permissions.canUpdateOrderStatus) return;
    const firstId = selectedIds[0] || "OMS-1049";
    void bulkUpdateOrderStatus(selectedIds, "Shipped");
    showToastNotification(
      `TCS Airway bill generated for Order #${firstId}${
        selectedIds.length > 1 ? ` (+${selectedIds.length - 1} more)` : ""
      }. Tracking code assigned.`
    );
    setSelectedIds([]);
  };

  const handleBulkCancelOrders = () => {
    if (selectedIds.length === 0 || !permissions.canUpdateOrderStatus) return;
    void bulkUpdateOrderStatus(selectedIds, "Cancelled");
    showToastNotification(
      `Marked ${selectedIds.length} selected ${
        selectedIds.length === 1 ? "parcel" : "parcels"
      } as Returned / RTO.`
    );
    setSelectedIds([]);
  };

  const handleBulkExportCsv = () => {
    if (selectedIds.length === 0) return;
    const targetSet = new Set(selectedIds);
    const selectedOrders = orders.filter((order) => targetSet.has(order.id));

    const headers = [
      "Order ID",
      "Customer",
      "Phone Number",
      "Delivery Address",
      "Channel",
      "Date",
      "COD Amount (PKR)",
      "Status",
      "RTO Risk Score",
      "Courier Partner",
      "Tracking Code",
      "Ordered Items",
    ];

    const rows = selectedOrders.map((order) => {
      const itemsSummary = order.items
        .map((i) => `${i.quantity}x ${i.name} (${i.sku})`)
        .join("; ");
      const risk = getOrderRiskDetails(order);
      return [
        escapeCsvCell(order.id),
        escapeCsvCell(order.customer),
        escapeCsvCell(order.customerPhone || "+92 300 1234567"),
        escapeCsvCell(order.shippingAddress),
        escapeCsvCell(getLocalizedChannel(order)),
        escapeCsvCell(order.date),
        escapeCsvCell(
          permissions.canViewFinancials
            ? `Rs. ${order.amount.toLocaleString("en-US")}`
            : "REDACTED"
        ),
        escapeCsvCell(STATUS_BADGES[order.status].humanLabel),
        escapeCsvCell(`${risk.score}% (${risk.level})`),
        escapeCsvCell(order.courierPartner || "Unassigned"),
        escapeCsvCell(order.trackingNumber || "N/A"),
        escapeCsvCell(itemsSummary),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `omnisync-cod-dispatch-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToastNotification(
      `Exported ${selectedOrders.length} COD dispatch ${
        selectedOrders.length === 1 ? "manifest" : "manifests"
      } to CSV.`
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setChannelFilter("All");
    setStatusFilter("All");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col pb-24">
      {/* Page Top Header Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] bg-[#F0FDF4] border border-[#DCFCE7] px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
              <span className="truncate">D2C COD Dispatch Queue</span>
            </div>
            <span className="hidden md:inline-flex items-center gap-2 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    sseConnected ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    sseConnected ? "bg-[#16A34A]" : "bg-amber-500"
                  }`}
                />
              </span>
              Live Order Feed: {sseConnected ? "Connected" : "Reconnecting"}
            </span>
            <span className="hidden sm:inline text-xs text-slate-500">
              Showing{" "}
              <strong className="text-slate-900 font-semibold">
                {filteredOrders.length}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-900 font-semibold">
                {orders.length}
              </strong>{" "}
              parcels
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSimulateWebhookOrder}
              disabled={isSimulatingWebhook}
              title="Simulate a new incoming Pakistani COD order over SSE"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer disabled:opacity-60"
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  isSimulatingWebhook ? "animate-ping" : ""
                }`}
              />
              <span>
                {isSimulatingWebhook
                  ? "Receiving Order..."
                  : "Simulate New COD Order"}
              </span>
            </button>

            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSyncing
                    ? "bg-amber-500 animate-ping"
                    : "bg-[#16A34A] animate-pulse"
                }`}
              />
              Last synced: {lastSyncedAt}
            </span>

            <button
              type="button"
              onClick={handleSyncChannels}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.08)] disabled:opacity-75 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>{isSyncing ? "Syncing..." : "Sync Channels"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Descriptive Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-slate-200/90 text-slate-900 text-xs font-medium shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12)] max-w-md animate-entry"
        >
          <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          </div>
          <span className="leading-relaxed text-slate-700">
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Merchant-Centric Heading & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-entry">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
              Daily Dispatch &amp; Fulfillment Radar
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Keep your inventory synced and stop Cash-on-Delivery return losses
              before parcels leave your warehouse.
            </p>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] font-semibold">
                {selectedIds.length}{" "}
                {selectedIds.length === 1 ? "parcel" : "parcels"} selected
              </span>
            </div>
          )}
        </div>

        {/* Helpful Merchant Savings Tip Banner */}
        <div className="rounded-2xl bg-[#FFFBEB] border border-[#FEF3C7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-entry animate-entry-delay-1">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 border border-amber-200/80 flex items-center justify-center text-[#92400E] shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#92400E] leading-relaxed">
                💡{" "}
                <strong className="font-semibold text-slate-900">
                  Tip: 3 orders have flagged phone numbers.
                </strong>{" "}
                Verifying via WhatsApp saves{" "}
                <strong className="text-[#166534] font-semibold bg-[#F0FDF4] border border-[#DCFCE7] px-1.5 py-0.5 rounded-md">
                  ~Rs. 750
                </strong>{" "}
                in wasted two-way courier fees today.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setStatusFilter((prev) =>
                  prev === "Pending" ? "All" : "Pending"
                )
              }
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-amber-50/70 text-[#92400E] border border-[#FEF3C7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
            >
              {statusFilter === "Pending"
                ? "Show All Parcels"
                : "Review 3 Flagged Orders →"}
            </button>
          </div>
        </div>

        {/* Top Metrics Bar (4 Editorial White SaaS KPI Cards with RBAC Guards) */}
        <section
          aria-label="Order Analytics KPIs"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-entry animate-entry-delay-2"
        >
          {/* Card 1: Total COD & Prepaid Volume */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300/90 transition-all p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Daily Dispatch Value
                </p>
                {permissions.canViewFinancials ? (
                  <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2 tracking-tight">
                    {formatPKR(metrics.totalRevenue)}
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-400 font-mono">
                      ••••••
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-[#FFFBEB] text-[#92400E] border border-[#FEF3C7]">
                      Hidden ({currentRole})
                    </span>
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-[#166534] shrink-0">
                {permissions.canViewFinancials ? (
                  <DollarSign className="w-5 h-5" />
                ) : (
                  <Lock className="w-4 h-4 text-[#92400E]" />
                )}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Net Collectible COD</span>
              <span className="font-semibold text-[#166534]">
                {permissions.canViewFinancials
                  ? formatPKR(metrics.activeRevenue)
                  : "Restricted by RBAC"}
              </span>
            </div>
          </div>

          {/* Card 2: Total Parcels */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300/90 transition-all p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Active Parcels Queue
                </p>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
                    {metrics.totalOrders}
                  </p>
                  <span className="text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-0.5 rounded-full">
                    {metrics.activeOrdersCount} active
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1E40AF] shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
              <span>
                <strong className="text-slate-900 font-semibold">
                  {metrics.shippedCount + metrics.deliveredCount}
                </strong>{" "}
                dispatched / delivered
              </span>
              <span>
                <strong className="text-[#991B1B] font-semibold">
                  {metrics.cancelledCount}
                </strong>{" "}
                RTO returned
              </span>
            </div>
          </div>

          {/* Card 3: Awaiting WhatsApp Confirmation */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300/90 transition-all p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Awaiting WhatsApp Verify
                </p>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <p className="text-2xl sm:text-3xl font-bold text-[#92400E] tracking-tight">
                    {metrics.pendingCount}
                  </p>
                  <span className="text-xs font-medium text-[#475569]">
                    hold before booking AWB
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FEF3C7] flex items-center justify-center text-[#92400E] shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Est. Courier Savings</span>
              <button
                type="button"
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === "Pending" ? "All" : "Pending"
                  )
                }
                className="font-semibold text-[#92400E] hover:text-amber-900 underline decoration-amber-400/60 cursor-pointer"
              >
                {statusFilter === "Pending"
                  ? "Show All Parcels"
                  : "~Rs. 750 saved today →"}
              </button>
            </div>
          </div>

          {/* Card 4: Localized Channel Breakdown */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300/90 transition-all p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Channel Breakdown
                </p>
                <p className="text-xs text-[#475569] mt-1">
                  WhatsApp, Instagram DM, Daraz &amp; Online Store
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              {LOCALIZED_CHANNELS.map((ch) => {
                const count = metrics.localizedChannelCounts[ch.label];
                const isSelected = channelFilter === ch.label;

                return (
                  <button
                    key={ch.label}
                    type="button"
                    title={ch.subtitle}
                    onClick={() =>
                      setChannelFilter((prev) =>
                        prev === ch.label ? "All" : ch.label
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer ${
                      ch.badgeClass
                    } ${
                      isSelected
                        ? "ring-2 ring-slate-900/15 shadow-xs"
                        : "opacity-90 hover:opacity-100"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ch.dot}`} />
                    <span>{ch.label}</span>
                    <span className="ml-0.5 px-1.5 py-0.2 rounded bg-white/80 text-slate-700 font-mono text-[10px] border border-slate-200/60">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interactive Sliding Tabs + Filters Bar + Pure White Table Card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden animate-entry animate-entry-delay-3">
          {/* Top Sliding Status Tabs Bar (Linear / Stripe / Vercel Style) */}
          <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#F8FAFC]/60">
            <div
              role="tablist"
              aria-label="Order Status & Risk Views"
              className="relative inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 overflow-x-auto max-w-full"
            >
              {/* Smoothly Animated Sliding Pill Indicator */}
              <div
                aria-hidden="true"
                style={{
                  transform: `translateX(${tabIndicatorStyle.left}px)`,
                  width: `${tabIndicatorStyle.width}px`,
                  opacity: tabIndicatorStyle.opacity,
                }}
                className="absolute top-1 bottom-1 left-0 rounded-lg bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out pointer-events-none"
              />

              {filterTabs.map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabButtonRefs.current[tab.id] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-[0.98] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer ${
                      isActive
                        ? "text-[#0F172A]"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {tab.hasHighRiskPing && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]" />
                      </span>
                    )}
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md font-mono text-[11px] transition-colors ${
                        isActive
                          ? tab.id === "HIGH_RISK"
                            ? "bg-[#FEF2F2] text-[#991B1B]"
                            : "bg-slate-100 text-slate-800"
                          : "bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Channel & Secondary Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Channel Dropdown */}
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="channel-filter"
                  className="text-xs font-medium text-[#64748B] inline-flex items-center gap-1"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  Channel:
                </label>
                <select
                  id="channel-filter"
                  value={channelFilter}
                  onChange={(e) =>
                    setChannelFilter(
                      e.target.value as "All" | LocalizedChannelLabel
                    )
                  }
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200/80 rounded-xl text-slate-700 font-medium shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none"
                >
                  <option value="All">All Channels</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram DM">Instagram DM</option>
                  <option value="Daraz Store">Daraz Store</option>
                  <option value="Online Store">Online Store</option>
                </select>
              </div>

              {/* Status / Risk Dropdown */}
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="status-filter"
                  className="text-xs font-medium text-[#64748B]"
                >
                  View:
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as FilterTabValue)
                  }
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200/80 rounded-xl text-slate-700 font-medium shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none"
                >
                  <option value="All">All Parcels</option>
                  <option value="Pending">
                    Awaiting WhatsApp Confirmation
                  </option>
                  <option value="HIGH_RISK">⚠️ High RTO Risk Parcels</option>
                  <option value="Shipped">Dispatched via Courier</option>
                  <option value="Delivered">COD Delivered &amp; Settled</option>
                  <option value="Cancelled">Historical RTO Returns</option>
                  <option value="CLEAN_RETURNS">
                    Today&apos;s Unresolved Returns (0)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Search & Quick Reset Bar */}
          <div className="p-4 sm:px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Customer, Order #OMS-1049, Phone, City, or AWB..."
                aria-label="Search by Customer Name, Order ID, Phone, or Tracking Number"
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              {(searchQuery ||
                channelFilter !== "All" ||
                statusFilter !== "All") && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/70 active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Responsive Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th scope="col" className="py-3.5 pl-6 pr-2 w-10">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleToggleSelectAll}
                      disabled={filteredOrders.length === 0}
                      aria-label="Select all visible orders"
                      className="w-4 h-4 rounded border-slate-300 bg-white text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer accent-slate-900"
                    />
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1">
                      Order &amp; Channel
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Customer &amp; Localized Address
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    RTO Risk Radar
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Courier &amp; Tracking
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    COD Amount
                  </th>
                  <th scope="col" className="py-3.5 pl-4 pr-6">
                    Fulfillment Status &amp; Verification
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm bg-white">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 px-6 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-[#16A34A] mb-3 shadow-xs">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <p className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                          <span>
                            No problematic parcels today! All active shipments
                            are running smooth.
                          </span>
                        </p>
                        <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                          Your COD dispatch queue is clear for this filter. All
                          verified parcels are moving through TCS Express, Trax
                          Logistics, and Leopards Courier without disruption.
                        </p>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
                        >
                          Back to All Active Shipments
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const localizedChannel = getLocalizedChannel(order);
                    const localizedNote = getLocalizedChannelNote(order);
                    const channelStyle = getChannelStyle(localizedChannel);
                    const statusStyle = STATUS_BADGES[order.status];
                    const StatusIcon = statusStyle.icon;
                    const risk = getOrderRiskDetails(order);
                    const isDrawerSelected = selectedOrderId === order.id;
                    const isChecked = selectedIds.includes(order.id);
                    const totalItems = order.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    );
                    const waUrl = buildWhatsAppVerifyUrl(order);

                    return (
                      <tr
                        key={order.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`View details for order ${order.id}`}
                        onClick={() => setSelectedOrderId(order.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedOrderId(order.id);
                          }
                        }}
                        className={`group cursor-pointer transition-all duration-150 ease-out hover:bg-slate-50/70 hover:shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${
                          isChecked
                            ? "bg-emerald-50/40"
                            : isDrawerSelected
                              ? "bg-slate-50"
                              : "bg-white"
                        }`}
                      >
                        {/* Row Selection Checkbox */}
                        <td
                          className="py-4 pl-6 pr-2 w-10 align-top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRowSelect(order.id)}
                            aria-label={`Select order ${order.id}`}
                            className="w-4 h-4 mt-1 rounded border-slate-300 bg-white text-slate-900 focus:ring-slate-900/10 focus:ring-offset-0 cursor-pointer accent-slate-900"
                          />
                        </td>

                        {/* Order ID & Channel Context */}
                        <th
                          scope="row"
                          className="py-4 px-4 align-top whitespace-nowrap"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] tracking-tight text-slate-700 font-medium">
                              #{order.id}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${channelStyle.badgeClass}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${channelStyle.dot}`}
                              />
                              {localizedChannel}
                            </span>
                          </div>
                          <div className="text-[11px] font-normal text-[#475569] mt-1 max-w-[230px] truncate">
                            {localizedNote}
                          </div>
                          <div className="text-[11px] font-normal text-[#64748B] mt-0.5">
                            {totalItems} {totalItems === 1 ? "item" : "items"} •{" "}
                            {order.syncedAt}
                          </div>
                        </th>

                        {/* Customer, Phone & Localized Address */}
                        <td className="py-4 px-4 align-top max-w-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#0F172A] group-hover:text-slate-950 transition-colors">
                              {order.customer}
                            </span>
                            <span className="font-mono text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded">
                              {order.customerPhone || "+92 300 1234567"}
                            </span>
                          </div>
                          <div className="text-xs text-[#475569] mt-1 leading-snug">
                            {order.shippingAddress}
                          </div>
                        </td>

                        {/* Empathetic RTO Risk Badge & Live Pulse Indicator */}
                        <td
                          className="py-4 px-4 align-top max-w-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            {risk.level === "HIGH" ? (
                              <span
                                title={risk.reason}
                                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2]"
                              >
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]" />
                                </span>
                                <span>⚠️ High RTO Risk ({risk.score}%)</span>
                              </span>
                            ) : risk.level === "MODERATE" ? (
                              <span
                                title={risk.reason}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FEF3C7]"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Moderate COD Risk ({risk.score}%)</span>
                              </span>
                            ) : (
                              <span
                                title={risk.reason}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]"
                              >
                                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                                <span>Verified Safe ({risk.score}%)</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleRecheckRisk(order, e)}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
                              title="Rescan customer COD history with Gemini"
                            >
                              {recheckingOrderId === order.id
                                ? "Scanning..."
                                : "Recheck Risk"}
                            </button>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-1.5 leading-snug line-clamp-2">
                            {risk.reason}
                          </p>
                        </td>

                        {/* Courier / Tracking */}
                        <td className="py-4 px-4 align-top whitespace-nowrap text-xs">
                          {order.courierPartner ? (
                            <div>
                              <span className="font-semibold text-[#1E40AF]">
                                {order.courierPartner}
                              </span>
                              <div className="font-mono text-[13px] tracking-tight text-slate-700 font-medium mt-0.5">
                                {order.trackingNumber}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Realistic PKR Amount */}
                        <td className="py-4 px-4 align-top whitespace-nowrap text-right font-bold text-[#0F172A]">
                          {permissions.canViewFinancials
                            ? formatPKR(order.amount)
                            : "••••"}
                          <div className="text-[10px] font-normal text-[#64748B] mt-0.5">
                            COD / PKR
                          </div>
                        </td>

                        {/* Human Status + Actionable WhatsApp Verification Module */}
                        <td
                          className="py-4 pl-4 pr-6 align-top whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col items-start gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                              />
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusStyle.humanLabel}
                            </span>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {(order.status === "Pending" ||
                                risk.level === "HIGH") && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Open WhatsApp chat with ${order.customer} (${order.customerPhone})`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F0FDF4] hover:bg-emerald-100/70 text-[#166534] border border-[#DCFCE7] active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                                  <span>
                                    {order.status === "Pending"
                                      ? "Send Verification WhatsApp"
                                      : "WhatsApp Verify"}
                                  </span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                                </a>
                              )}

                              {order.status === "Pending" && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleQuickDispatchOrder(order, e)
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#EFF6FF] hover:bg-blue-100/70 text-[#1E40AF] border border-[#DBEAFE] active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Dispatch</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedOrderId(order.id)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
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

      {/* Floating Bulk Action Bar */}
      <div
        className={`fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 transition-all duration-300 ${
          selectedIds.length > 0
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-12 opacity-0 pointer-events-none"
        }`}
        aria-hidden={selectedIds.length === 0}
      >
        <div className="bg-white/95 border border-slate-200/90 backdrop-blur-md rounded-2xl shadow-[0_12px_32px_-4px_rgba(15,23,42,0.12)] px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 pr-2 sm:border-r sm:border-slate-200">
            <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[#16A34A] hidden sm:inline" />
              {selectedIds.length === 1
                ? "Parcel Selected"
                : "Parcels Selected"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkMarkShipped}
              disabled={!permissions.canUpdateOrderStatus}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#EFF6FF] hover:bg-blue-100/80 text-[#1E40AF] border border-[#DBEAFE] active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer disabled:opacity-40"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Book Courier AWB &amp; Dispatch</span>
            </button>

            <button
              type="button"
              onClick={handleBulkExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F0FDF4] hover:bg-emerald-100/80 text-[#166534] border border-[#DCFCE7] active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export COD Manifest (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleBulkCancelOrders}
              disabled={!permissions.canUpdateOrderStatus}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FEF2F2] hover:bg-red-100/80 text-[#991B1B] border border-[#FEE2E2] active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer disabled:opacity-40"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Hold / Cancel Parcels</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Order Details Slide-over Drawer & Clean Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          selectedOrder
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!selectedOrder}
      >
        <div
          onClick={() => setSelectedOrderId(null)}
          className="fixed inset-0 backdrop-blur-sm bg-slate-900/20 transition-opacity duration-300"
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-order-title"
          className={`fixed inset-y-0 right-0 z-10 w-full max-w-xl bg-white border-l border-slate-200/80 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            selectedOrder ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedOrder && (
            <>
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-200/80 flex items-start justify-between gap-4 bg-[#F8FAFC]">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2
                      id="drawer-order-title"
                      className="font-mono text-lg tracking-tight text-[#0F172A] font-bold"
                    >
                      #{selectedOrder.id}
                    </h2>
                    {(() => {
                      const st = STATUS_BADGES[selectedOrder.status];
                      const StIcon = st.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${st.bg} ${st.text} ${st.border}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                          />
                          <StIcon className="w-3.5 h-3.5" />
                          {st.humanLabel}
                        </span>
                      );
                    })()}
                    <Link
                      href={`/track/${selectedOrder.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 transition-colors"
                    >
                      <span>Public Tracker</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Localized Channel Badge & Note */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                    {(() => {
                      const locCh = getLocalizedChannel(selectedOrder);
                      const ch = getChannelStyle(locCh);
                      const ChIcon = ch.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${ch.badgeClass}`}
                        >
                          <ChIcon className="w-3 h-3" />
                          {locCh} — {getLocalizedChannelNote(selectedOrder)}
                        </span>
                      );
                    })()}
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {selectedOrder.syncedAt}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  aria-label="Close order details drawer"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* RTO Risk Assessment & WhatsApp Customer Verification Module */}
                {(() => {
                  const risk = getOrderRiskDetails(selectedOrder);
                  const waUrl = buildWhatsAppVerifyUrl(selectedOrder);
                  return (
                    <section className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {risk.level === "HIGH" ? (
                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2]">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]" />
                              </span>
                              ⚠️ High RTO Risk ({risk.score}%)
                            </span>
                          ) : risk.level === "MODERATE" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FEF3C7]">
                              ⚡ Moderate COD Risk ({risk.score}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]">
                              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                              ✅ Verified Safe ({risk.score}%)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRecheckRisk(selectedOrder)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              {recheckingOrderId === selectedOrder.id
                                ? "Scanning..."
                                : "Recheck Risk"}
                            </span>
                          </button>

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#16A34A] hover:bg-emerald-700 text-white active:scale-[0.98] transition-all duration-100 ease-in-out shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Send Verification WhatsApp</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <p className="text-xs text-[#475569] leading-relaxed">
                        {risk.reason}
                      </p>
                    </section>
                  );
                })()}

                {/* Action Bar: Generate Shipping Slip */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/60">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      COD Airway Bill &amp; Packing Label
                    </p>
                    <p className="text-[11px] text-[#475569]">
                      Print thermal barcode label for TCS Express, Trax
                      Logistics, or Leopards Courier
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShippingSlipOrder(selectedOrder)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white shadow-xs active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Generate Shipping Slip</span>
                  </button>
                </div>

                {/* Section 1: Customer & Localized Shipping Details */}
                <section className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-3.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Customer &amp; Localized Delivery Address
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B]">Customer Name</p>
                        <p className="font-semibold text-[#0F172A]">
                          {selectedOrder.customer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B]">
                          Mobile Number (WhatsApp / SMS)
                        </p>
                        <p className="font-mono text-[13px] tracking-tight text-slate-700 font-medium">
                          {selectedOrder.customerPhone || "+92 300 1234567"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B]">Email Address</p>
                        <p className="font-medium text-slate-700">
                          {selectedOrder.customerEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B]">
                          Delivery Address ({selectedOrder.city || "Pakistan"})
                        </p>
                        <p className="font-medium text-slate-700 leading-relaxed">
                          {selectedOrder.shippingAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 2: Local Courier Partner & Tracking Assignment */}
                <section className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] inline-flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#1E40AF]" />
                      Local Courier &amp; Airway Bill Assignment
                    </h3>
                    {selectedOrder.courierPartner && (
                      <span className="font-mono text-[12px] tracking-tight text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#DBEAFE] font-medium">
                        {selectedOrder.courierPartner} •{" "}
                        {selectedOrder.trackingNumber}
                      </span>
                    )}
                  </div>

                  <form
                    onSubmit={handleSaveCourierDispatch}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
                        Select Local Courier Partner
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {LOCAL_COURIERS.map((c) => {
                          const active = courierInput === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setCourierInput(c);
                                const digits =
                                  selectedOrder.id.replace(/[^0-9]/g, "") ||
                                  "1049";
                                const prefix = COURIER_PREFIX[c] || "TCS";
                                setTrackingInput(`${prefix}-7729${digits}`);
                              }}
                              className={`py-2.5 px-2.5 rounded-xl text-xs font-bold border active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer ${
                                active
                                  ? "bg-[#EFF6FF] text-[#1E40AF] border-[#DBEAFE] shadow-xs"
                                  : "bg-[#F8FAFC] text-slate-600 border-slate-200/80 hover:text-slate-900"
                              }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor="tracking-number-input"
                            className="text-[11px] font-medium text-[#64748B]"
                          >
                            Tracking Code
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              handleRegenerateTracking(courierInput)
                            }
                            className="text-[10px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                          >
                            Auto-generate AWB
                          </button>
                        </div>
                        <input
                          id="tracking-number-input"
                          type="text"
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          placeholder="e.g. TCS-77291048"
                          className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200/80 font-mono text-[13px] tracking-tight text-slate-700 font-medium focus:outline-none focus:border-slate-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="est-delivery-input"
                          className="block text-[11px] font-medium text-[#64748B] mb-1"
                        >
                          Estimated Delivery Date
                        </label>
                        <input
                          id="est-delivery-input"
                          type="text"
                          value={estimatedDeliveryInput}
                          onChange={(e) =>
                            setEstimatedDeliveryInput(e.target.value)
                          }
                          placeholder="e.g. Oct 9, 2026"
                          className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200/80 text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!permissions.canUpdateOrderStatus}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>
                        Dispatch with {courierInput} &amp; Generate Airway Bill
                      </span>
                    </button>
                  </form>
                </section>

                {/* Section 3: Ordered Items List */}
                <section className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC]">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] inline-flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#16A34A]" />
                      Ordered Items ({selectedOrder.items.length})
                    </h3>
                    <span className="text-xs text-[#64748B]">
                      Order Date: {selectedOrder.date}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item) => {
                      const subtotal = item.quantity * item.price;
                      return (
                        <div
                          key={item.sku}
                          className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] leading-snug">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-[#64748B]">
                              <span className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/80 text-slate-700 font-medium">
                                {item.sku}
                              </span>
                              <span>•</span>
                              <span>
                                Qty:{" "}
                                <strong className="text-slate-800">
                                  {item.quantity}
                                </strong>
                                {permissions.canViewFinancials
                                  ? ` × ${formatPKR(item.price)}`
                                  : ""}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-[#0F172A]">
                              {permissions.canViewFinancials
                                ? formatPKR(subtotal)
                                : "••••"}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              Subtotal
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Financial Summary */}
                  <div className="px-4 py-3.5 bg-[#F8FAFC] border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Total COD Collectible
                    </span>
                    <span className="text-base font-bold text-[#166534]">
                      {permissions.canViewFinancials
                        ? formatPKR(selectedOrder.amount)
                        : "Restricted (RBAC)"}
                    </span>
                  </div>
                </section>

                {/* Section 4: Status Update Controls */}
                <section className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Fulfillment Status Controls
                    </h3>
                    {!permissions.canUpdateOrderStatus ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#92400E]">
                        <ShieldAlert className="w-3 h-3" />
                        Read-only for {currentRole}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#64748B]">
                        Syncs immediately with dispatch queue
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALL_STATUSES.map((statusOption) => {
                      const st = STATUS_BADGES[statusOption];
                      const StIcon = st.icon;
                      const isCurrent = selectedOrder.status === statusOption;

                      return (
                        <button
                          key={statusOption}
                          type="button"
                          disabled={!permissions.canUpdateOrderStatus}
                          onClick={() =>
                            handleStatusChange(selectedOrder.id, statusOption)
                          }
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer disabled:opacity-40 ${
                            isCurrent
                              ? `${st.bg} ${st.text} ${st.border} ring-2 ring-slate-900/10`
                              : "bg-[#F8FAFC] border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2 truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`}
                            />
                            <StIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{st.humanLabel}</span>
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 border border-slate-200/60 shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 border-t border-slate-200/80 bg-[#F8FAFC] flex items-center justify-between gap-3">
                <span className="text-xs text-[#64748B]">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                    Esc
                  </kbd>{" "}
                  or click outside to close
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Print-Ready Shipping Slip & Barcode Modal */}
      {shippingSlipOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/20">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden animate-entry">
            {/* Modal Action Header (hidden when printing) */}
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200/80 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-slate-700" />
                <span className="text-sm font-bold text-[#0F172A]">
                  COD Airway Bill &amp; Packing Slip — #{shippingSlipOrder.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white active:scale-[0.98] transition-all duration-100 ease-in-out cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Airway Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShippingSlipOrder(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* High-Contrast Printable Waybill Document */}
            <div className="p-6 sm:p-8 bg-white text-slate-950 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* Top Carrier & Service Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-950 text-white font-mono text-sm font-black uppercase tracking-wider">
                      {shippingSlipOrder.courierPartner || courierInput}
                    </span>
                    <span className="px-2 py-0.5 border border-slate-900 text-xs font-bold uppercase">
                      {getLocalizedChannel(shippingSlipOrder)} • COD:{" "}
                      {formatPKR(shippingSlipOrder.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 font-mono">
                    OMNISYNC PAKISTAN D2C MANIFEST • DATE:{" "}
                    {shippingSlipOrder.date}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Order Reference
                  </p>
                  <p className="text-xl font-black font-mono">
                    #{shippingSlipOrder.id}
                  </p>
                </div>
              </div>

              {/* From / To Address Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-200 pb-5">
                <div className="space-y-1 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    FROM (DISPATCH WAREHOUSE):
                  </p>
                  <p className="font-bold text-sm">
                    OmniSync Pakistan D2C Hub
                  </p>
                  <p>Plot 44-B, Industrial Area Gulberg III</p>
                  <p>Lahore, Punjab • Pakistan</p>
                  <p className="font-mono text-[11px] text-slate-600">
                    +92 300 4119823 • ops@omnisync.pk
                  </p>
                </div>

                <div className="p-3.5 border-2 border-slate-900 rounded-lg space-y-1 text-xs bg-slate-50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    SHIP TO (COD RECIPIENT):
                  </p>
                  <p className="font-black text-base text-slate-950">
                    {shippingSlipOrder.customer}
                  </p>
                  <p className="font-medium text-slate-800 leading-snug">
                    {shippingSlipOrder.shippingAddress}
                  </p>
                  <p className="font-mono text-[11px] text-slate-700 pt-1">
                    Phone:{" "}
                    {shippingSlipOrder.customerPhone || "+92 300 1234567"}
                  </p>
                </div>
              </div>

              {/* 1D Code-128 Style SVG Barcode Graphic */}
              <div className="py-4 px-4 border-2 border-dashed border-slate-300 rounded-lg text-center space-y-2 bg-slate-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  AIRWAY BILL TRACKING BARCODE (
                  {shippingSlipOrder.courierPartner || courierInput})
                </p>
                <div className="flex justify-center">
                  <svg
                    className="h-16 w-full max-w-md"
                    viewBox="0 0 260 60"
                    aria-label="Waybill Barcode"
                  >
                    {(() => {
                      const code =
                        shippingSlipOrder.trackingNumber ||
                        trackingInput ||
                        `TCS-77291048`;
                      const bars = generateBarcodeBars(code);
                      let currentX = 10;
                      return bars.map((width, idx) => {
                        const isBar = idx % 2 === 0;
                        const x = currentX;
                        currentX += width * 2.2;
                        if (!isBar) return null;
                        return (
                          <rect
                            key={idx}
                            x={x}
                            y={4}
                            width={width * 1.8}
                            height={52}
                            fill="#0f172a"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <p className="font-mono text-sm font-black tracking-widest text-slate-950">
                  {shippingSlipOrder.trackingNumber ||
                    trackingInput ||
                    `TCS-77291048`}
                </p>
              </div>

              {/* Line Items Packing Manifest Table */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                  PACKING SLIP LINE ITEMS (
                  {shippingSlipOrder.items.reduce(
                    (acc, i) => acc + i.quantity,
                    0
                  )}{" "}
                  TOTAL UNITS • COD COLLECTIBLE:{" "}
                  {formatPKR(shippingSlipOrder.amount)})
                </p>
                <table className="w-full text-left border-collapse text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shippingSlipOrder.items.map((item) => (
                      <tr key={item.sku}>
                        <td className="py-2 px-3 font-mono font-semibold">
                          {item.sku}
                        </td>
                        <td className="py-2 px-3">{item.name}</td>
                        <td className="py-2 px-3 text-right font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {formatPKR(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Verification Note */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200">
                <span>
                  Track online:{" "}
                  <strong className="font-mono text-slate-800">
                    /track/{shippingSlipOrder.id}
                  </strong>
                </span>
                <span>
                  Est. Delivery:{" "}
                  <strong className="text-slate-800">
                    {shippingSlipOrder.estimatedDelivery ||
                      estimatedDeliveryInput}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
