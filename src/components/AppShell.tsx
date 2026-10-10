"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useOmniSync,
  ROLE_PERMISSIONS_MAP,
  type UserRole,
} from "@/context/OmniSyncContext";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Blocks,
  Settings,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Sparkles,
  Bell,
  Activity,
  Webhook,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  ArrowUpRight,
  SlidersHorizontal,
  Users,
  ShieldAlert,
  Lock,
  UserCheck,
  Truck,
  LogOut,
} from "lucide-react";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  warehouseAllowed?: boolean;
}

export type AuditLogCategory =
  | "Webhook"
  | "Stock Push"
  | "Automation"
  | "System";
export type AuditLogSeverity = "success" | "info" | "warning" | "error";

export interface SyncAuditLogItem {
  id: string;
  title: string;
  detail: string;
  channel: "Shopify" | "Amazon" | "Etsy" | "eBay" | "WooCommerce" | "System";
  category: AuditLogCategory;
  statusBadge: string;
  severity: AuditLogSeverity;
  timestampIso: string;
  relativeTime: string;
  unread?: boolean;
}

export interface GlobalToastNotification {
  id: string;
  title: string;
  message: string;
  severity: AuditLogSeverity;
  timestamp: string;
}

const AUDIT_LOGS_STORAGE_KEY = "omnisync_global_audit_logs_v2";

const DEFAULT_SYNC_AUDIT_LOGS: SyncAuditLogItem[] = [
  {
    id: "audit-101",
    title: "WhatsApp COD order hook received - 200 OK",
    detail:
      "Webhook verified via HMAC-SHA256. Order #OMS-1049 (Bilal Ahmed • Rs. 3,450) ingested in 118ms.",
    channel: "Shopify",
    category: "Webhook",
    statusBadge: "200 OK",
    severity: "success",
    timestampIso: "2026-10-07 15:12:08 PKT",
    relativeTime: "2m ago",
    unread: true,
  },
  {
    id: "audit-102",
    title: "Trax Logistics AWB assigned (#OMS-1048)",
    detail:
      "Airway bill TRAX-PK-883921 generated for Ayesha Malik (Gulshan-e-Iqbal Block 13D, Karachi).",
    channel: "Etsy",
    category: "Webhook",
    statusBadge: "Dispatched",
    severity: "info",
    timestampIso: "2026-10-07 15:06:41 PKT",
    relativeTime: "8m ago",
    unread: true,
  },
  {
    id: "audit-103",
    title: "Daraz Mall order sync completed - 200 OK",
    detail:
      "Order #OMS-1047 (Sana Farooq • Sector G-11/2, Islamabad) marked Delivered via Leopards Courier.",
    channel: "Amazon",
    category: "Webhook",
    statusBadge: "200 OK",
    severity: "success",
    timestampIso: "2026-10-07 14:58:19 PKT",
    relativeTime: "16m ago",
    unread: true,
  },
  {
    id: "audit-104",
    title: "Auto-inventory rebalance rule executed (OS-AUD-101)",
    detail:
      "Reserved 24 units for WhatsApp/Online Store and 16 units for Daraz Mall flash sale.",
    channel: "Shopify",
    category: "Stock Push",
    statusBadge: "Rebalanced",
    severity: "info",
    timestampIso: "2026-10-07 14:44:02 PKT",
    relativeTime: "30m ago",
    unread: false,
  },
  {
    id: "audit-105",
    title: "High RTO Risk flagged on Order #OMS-1049 (82%)",
    detail:
      "Previous parcel returned undelivered in Gujranwala • Incomplete house number detected.",
    channel: "System",
    category: "Automation",
    statusBadge: "⚠️ 82% Risk",
    severity: "warning",
    timestampIso: "2026-10-07 14:29:50 PKT",
    relativeTime: "44m ago",
    unread: false,
  },
];

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    warehouseAllowed: false,
  },
  {
    label: "Orders",
    href: "/orders",
    icon: ShoppingBag,
    badge: "Live",
    warehouseAllowed: true,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    warehouseAllowed: true,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    badge: "CRM",
    warehouseAllowed: false,
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: Blocks,
    warehouseAllowed: false,
  },
  {
    label: "Team & RBAC",
    href: "/settings/team",
    icon: UserCheck,
    warehouseAllowed: false,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    warehouseAllowed: false,
  },
];

const ALL_ROLES: UserRole[] = ["OWNER", "WAREHOUSE", "SUPPORT", "VIEWER"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentRole,
    setCurrentRole,
    permissions,
    sseConnected,
    triggerSignedWebhookOrder,
  } = useOmniSync();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Global Sync Logs / Activity Slide-over state
  const [activityDrawerOpen, setActivityDrawerOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<SyncAuditLogItem[]>(
    DEFAULT_SYNC_AUDIT_LOGS
  );
  const [logFilter, setLogFilter] = useState<"All" | "Webhook" | "Stock Push">(
    "All"
  );
  const [hasHydratedLogs, setHasHydratedLogs] = useState<boolean>(false);
  const [globalToasts, setGlobalToasts] = useState<GlobalToastNotification[]>(
    []
  );

  // Public customer order tracking (/track/[orderId]), /login, and /customer/* portal routes bypass the merchant sidebar shell
  const isPublicTrackingRoute =
    pathname?.startsWith("/track") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/customer");

  // Hydrate logs from localStorage on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SyncAuditLogItem[];
        if (Array.isArray(parsed)) {
          setAuditLogs(parsed);
        }
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setHasHydratedLogs(true);
    }
  }, []);

  // Persist logs to localStorage after hydration
  useEffect(() => {
    if (!hasHydratedLogs) return;
    try {
      window.localStorage.setItem(
        AUDIT_LOGS_STORAGE_KEY,
        JSON.stringify(auditLogs)
      );
    } catch {
      // Ignore storage write errors
    }
  }, [auditLogs, hasHydratedLogs]);

  // Listen for custom "omnisync:audit-log" events dispatched by pages or SSE
  useEffect(() => {
    function handleCustomAuditEvent(event: Event) {
      const customEvent = event as CustomEvent<{
        title: string;
        detail: string;
        channel?: SyncAuditLogItem["channel"];
        category?: AuditLogCategory;
        statusBadge?: string;
        severity?: AuditLogSeverity;
        showToast?: boolean;
      }>;

      const payload = customEvent.detail;
      if (!payload) return;

      const now = new Date();
      const isoFormatted = `${now.toISOString().slice(0, 10)} ${now
        .toISOString()
        .slice(11, 19)} PKT`;

      const newLog: SyncAuditLogItem = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: payload.title,
        detail: payload.detail,
        channel: payload.channel ?? "System",
        category: payload.category ?? "Webhook",
        statusBadge: payload.statusBadge ?? "200 OK",
        severity: payload.severity ?? "success",
        timestampIso: isoFormatted,
        relativeTime: "Just now",
        unread: true,
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      if (payload.showToast !== false) {
        const toastId = `toast-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        setGlobalToasts((prev) => [
          {
            id: toastId,
            title: newLog.title,
            message: newLog.detail,
            severity: newLog.severity,
            timestamp: "Just now",
          },
          ...prev.slice(0, 2),
        ]);

        window.setTimeout(() => {
          setGlobalToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 4500);
      }
    }

    window.addEventListener("omnisync:audit-log", handleCustomAuditEvent);
    return () => {
      window.removeEventListener("omnisync:audit-log", handleCustomAuditEvent);
    };
  }, []);

  // Close drawers on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActivityDrawerOpen(false);
        setMobileDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unreadCount = useMemo(
    () => auditLogs.filter((item) => item.unread).length,
    [auditLogs]
  );

  const filteredLogs = useMemo(() => {
    if (logFilter === "All") return auditLogs;
    return auditLogs.filter((item) => item.category === logFilter);
  }, [auditLogs, logFilter]);

  const currentRouteTitle = useMemo(() => {
    if (pathname === "/" || pathname === "/dashboard") {
      return "Executive Command Center";
    }
    if (pathname?.startsWith("/orders"))
      return "Daily Dispatch & Fulfillment Radar";
    if (pathname?.startsWith("/inventory")) return "Inventory & Stock Sync";
    if (pathname?.startsWith("/customers")) return "Customer CRM & LTV";
    if (pathname?.startsWith("/integrations"))
      return "Storefront Integrations";
    if (pathname?.startsWith("/settings/team"))
      return "Team & RBAC Permissions";
    if (pathname?.startsWith("/settings")) return "Settings & Preferences";
    if (pathname?.startsWith("/track")) return "Public Order Tracker";
    return "OmniSync Workspace";
  }, [pathname]);

  // Check if current route is blocked by RBAC for WAREHOUSE role
  const isRouteRestrictedForRole = useMemo(() => {
    if (isPublicTrackingRoute) return false;
    if (currentRole === "WAREHOUSE") {
      const allowed =
        pathname?.startsWith("/orders") || pathname?.startsWith("/inventory");
      return !allowed;
    }
    return false;
  }, [currentRole, pathname, isPublicTrackingRoute]);

  function handleOpenActivityDrawer() {
    setActivityDrawerOpen(true);
    setAuditLogs((prev) => prev.map((item) => ({ ...item, unread: false })));
  }

  async function handleSimulateIncomingHook() {
    await triggerSignedWebhookOrder();
  }

  function handleClearLogs() {
    setAuditLogs([]);
    const toastId = `toast-clear-${Date.now()}`;
    setGlobalToasts((prev) => [
      {
        id: toastId,
        title: "Sync audit logs cleared",
        message: "All historical webhook and stock push records were cleared.",
        severity: "info",
        timestamp: "Just now",
      },
      ...prev.slice(0, 2),
    ]);
    window.setTimeout(() => {
      setGlobalToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3500);
  }

  function handleRestoreDefaultLogs() {
    setAuditLogs(DEFAULT_SYNC_AUDIT_LOGS);
  }

  function handleExportLogsCsv() {
    if (auditLogs.length === 0) return;

    const headers = [
      "Audit ID",
      "Timestamp (PKT)",
      "Category",
      "Channel",
      "Status",
      "Event Summary",
      "Details",
    ];
    const rows = auditLogs.map((log) => [
      log.id,
      log.timestampIso,
      log.category,
      log.channel,
      log.statusBadge,
      `"${log.title.replace(/"/g, '""')}"`,
      `"${log.detail.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `omnisync-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const toastId = `toast-export-${Date.now()}`;
    setGlobalToasts((prev) => [
      {
        id: toastId,
        title: "Audit logs exported (.CSV)",
        message: `Downloaded ${auditLogs.length} sync & webhook audit entries.`,
        severity: "success",
        timestamp: "Just now",
      },
      ...prev.slice(0, 2),
    ]);
    window.setTimeout(() => {
      setGlobalToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3500);
  }

  function dismissToast(id: string) {
    setGlobalToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // If visiting public customer order tracking (/track/[orderId]), /login, or /customer/*
  if (isPublicTrackingRoute) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex print:block print:bg-white print:text-black">
      {/* Mobile Sidebar Backdrop */}
      <div
        onClick={() => setMobileDrawerOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden print:hidden ${
          mobileDrawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Collapsible Editorial Sidebar */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out lg:static lg:translate-x-0 print:hidden ${
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64 shrink-0`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 border-b border-[#F1F5F9] flex items-center ${
            isCollapsed
              ? "lg:justify-center lg:px-2 px-5"
              : "justify-between px-5"
          }`}
        >
          <Link
            href={currentRole === "WAREHOUSE" ? "/orders" : "/"}
            className="flex items-center gap-3 min-w-0 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none rounded-xl"
            title="OmniSync — Multi-Channel D2C Operations Hub"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div
              className={`transition-opacity duration-200 truncate ${
                isCollapsed ? "lg:hidden" : "block"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-[#0F172A]">
                  OmniSync
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                  D2C Ops
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-none mt-0.5 truncate">
                Fulfillment &amp; RTO Radar
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.98] transition-transform duration-100 ease-in-out"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <div
            className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] ${
              isCollapsed ? "lg:text-center lg:px-0" : ""
            }`}
          >
            {isCollapsed ? "•••" : "Operations Hub"}
          </div>

          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === "/dashboard"
                : item.href === "/settings"
                ? pathname === "/settings"
                : pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

            const lockedForWarehouse =
              currentRole === "WAREHOUSE" && !item.warehouseAllowed;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileDrawerOpen(false)}
                title={
                  isCollapsed
                    ? `${item.label}${lockedForWarehouse ? " (Restricted)" : ""}`
                    : undefined
                }
                className={`group relative flex items-center ${
                  isCollapsed
                    ? "lg:justify-center lg:px-0 px-3"
                    : "justify-between px-3"
                } py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none ${
                  isActive
                    ? "bg-slate-900 text-white shadow-[0_1px_3px_rgba(15,23,42,0.14)]"
                    : lockedForWarehouse
                    ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent"
                    : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100/80 border border-transparent"
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-emerald-400"
                        : lockedForWarehouse
                        ? "text-slate-400"
                        : "text-[#64748B] group-hover:text-[#0F172A]"
                    }`}
                  />
                  <span
                    className={`truncate ${
                      isCollapsed ? "lg:hidden" : "inline"
                    }`}
                  >
                    {item.label}
                  </span>
                </span>

                {lockedForWarehouse ? (
                  <Lock
                    className={`w-3.5 h-3.5 text-slate-400 ${
                      isCollapsed ? "lg:hidden" : "inline"
                    }`}
                  />
                ) : (
                  item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full items-center gap-1.5 ${
                        isCollapsed ? "lg:hidden" : "inline-flex"
                      } ${
                        isActive
                          ? "bg-white/15 text-white border border-white/20"
                          : "bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2]"
                      }`}
                    >
                      {item.badge === "Live" && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                        </span>
                      )}
                      {item.badge}
                    </span>
                  )
                )}
              </Link>
            );
          })}

          {/* Public Customer Order Tracker Shortcut */}
          <div className="pt-4 mt-4 border-t border-[#F1F5F9]">
            <div
              className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] ${
                isCollapsed ? "lg:text-center lg:px-0" : ""
              }`}
            >
              {isCollapsed ? "•••" : "Customer Portal"}
            </div>
            <Link
              href="/track/OMS-1049"
              className={`group flex items-center ${
                isCollapsed
                  ? "lg:justify-center lg:px-0 px-3"
                  : "justify-between px-3"
              } py-2 rounded-xl text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-slate-100/80 border border-transparent transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none`}
              title="Public Customer Order Tracking Portal (/track/OMS-1049)"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Truck className="w-4 h-4 text-[#1E40AF] shrink-0" />
                <span
                  className={`truncate ${isCollapsed ? "lg:hidden" : "inline"}`}
                >
                  Track Order Portal
                </span>
              </span>
              <ArrowUpRight
                className={`w-3.5 h-3.5 text-[#64748B] ${
                  isCollapsed ? "lg:hidden" : "inline"
                }`}
              />
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer: Storefront Sync Card & Collapse Toggle */}
        <div className="p-3 border-t border-[#F1F5F9] space-y-2">
          <div
            className={`rounded-xl bg-[#F8FAFC] border border-slate-200/80 p-3 ${
              isCollapsed ? "lg:hidden" : "block"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                Live Sync Engine
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#166534] bg-[#F0FDF4] border border-[#DCFCE7] px-2 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#16A34A]" />
                </span>
                {sseConnected ? "Connected" : "Active"}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
              WhatsApp, Daraz &amp; Courier AWB hooks synced in real time.
            </p>
            <button
              type="button"
              onClick={handleOpenActivityDrawer}
              className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>View Sync Audit Logs</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100/80 border border-transparent hover:border-slate-200/80 active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#0F172A]" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-[#64748B]" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Persistent Top Navigation / Header Bar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation drawer"
              className="lg:hidden p-2 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 border border-slate-200/80 active:scale-[0.98] transition-transform duration-100 ease-in-out"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex lg:hidden items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <span className="font-bold text-sm text-[#0F172A]">OmniSync</span>
            </div>

            <div className="hidden lg:flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-medium text-[#64748B]">
                Operations
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-[#0F172A] truncate">
                {currentRouteTitle}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]" />
                </span>
                Live Feed Active
              </span>
            </div>
          </div>

          {/* Right Actions: RBAC Role Switcher, Simulate Signed Webhook, Team Settings, & Sync Logs Bell */}
          <div className="flex items-center gap-2">
            {/* Active RBAC Role Selector */}
            <div className="flex items-center gap-1.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 px-2.5 py-1.5">
              <span className="hidden sm:inline text-[11px] font-medium text-[#64748B]">
                Role:
              </span>
              <select
                aria-label="Switch Active RBAC User Role"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                {ALL_ROLES.map((r) => (
                  <option
                    key={r}
                    value={r}
                    className="bg-white text-[#0F172A]"
                  >
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void handleSimulateIncomingHook()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-[#475569] hover:text-[#0F172A] border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
              title="Dispatch HMAC-SHA256 signed webhook order to /api/webhooks/orders"
            >
              <Webhook className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Simulate Order</span>
            </button>

            <Link
              href="/settings/team"
              className={`p-2 rounded-xl border transition-all duration-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none ${
                pathname?.startsWith("/settings/team")
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-[#475569] hover:text-[#0F172A] border-slate-200/80 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              }`}
              title="Team & RBAC Permissions (/settings/team)"
              aria-label="Team and RBAC Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleOpenActivityDrawer}
              aria-label="Open Global Sync Logs and Activity Panel"
              className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
            >
              <div className="relative">
                <Bell className="w-4 h-4 text-[#475569]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden md:inline text-xs font-medium text-[#0F172A]">
                Sync Logs
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-[#475569] border border-slate-200/80">
                {auditLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/login", { method: "DELETE" });
                router.push("/login");
                router.refresh();
              }}
              title="Sign out of OmniSync session"
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FEF2F2] text-[#475569] hover:text-[#991B1B] border border-slate-200/80 hover:border-[#FEE2E2] text-xs font-medium active:scale-[0.98] transition-all duration-100 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:outline-none cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content or RBAC Route Guard */}
        <div className="flex-1 flex flex-col min-w-0">
          {isRouteRestrictedForRole ? (
            <div className="max-w-2xl w-full mx-auto px-4 py-16 animate-entry">
              <div className="rounded-2xl bg-white border border-slate-200/80 p-8 text-center space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="w-14 h-14 rounded-2xl bg-[#FFFBEB] border border-[#FEF3C7] flex items-center justify-center mx-auto text-[#92400E]">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FEF3C7]">
                    RBAC Policy Enforced • Role: {currentRole}
                  </span>
                  <h2 className="text-xl font-bold text-[#0F172A]">
                    Access Restricted for {permissions.label}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
                    {permissions.description}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/orders"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98] transition-all duration-100"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Go to Orders</span>
                  </Link>
                  <Link
                    href="/inventory"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200/80 active:scale-[0.98] transition-all duration-100"
                  >
                    <Boxes className="w-4 h-4 text-[#1E40AF]" />
                    <span>Go to Inventory</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCurrentRole("OWNER")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F0FDF4] hover:bg-emerald-100/70 text-[#166534] border border-[#DCFCE7] active:scale-[0.98] transition-all duration-100 cursor-pointer"
                  >
                    <span>Switch to OWNER Role</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>

      {/* Persistent Global Notification Toast Stack (Bottom-Right) */}
      {globalToasts.length > 0 && (
        <div
          role="region"
          aria-label="Global Sync Notifications"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none print:hidden"
        >
          {globalToasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-2xl bg-white border border-slate-200/80 p-4 shadow-lg flex items-start gap-3 animate-entry"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  toast.severity === "success"
                    ? "bg-[#F0FDF4] border-[#DCFCE7] text-[#166534]"
                    : toast.severity === "warning" || toast.severity === "error"
                    ? "bg-[#FFFBEB] border-[#FEF3C7] text-[#92400E]"
                    : "bg-[#EFF6FF] border-[#DBEAFE] text-[#1E40AF]"
                }`}
              >
                {toast.severity === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : toast.severity === "warning" ||
                  toast.severity === "error" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#0F172A] truncate">
                    {toast.title}
                  </p>
                  <span className="text-[10px] text-[#64748B] shrink-0">
                    {toast.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2 leading-relaxed">
                  {toast.message}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      dismissToast(toast.id);
                      handleOpenActivityDrawer();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#166534] hover:underline cursor-pointer"
                  >
                    <span>Inspect in Sync Logs</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Global Sync Logs / Activity Slide-over Backdrop */}
      <div
        onClick={() => setActivityDrawerOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 print:hidden ${
          activityDrawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Global Sync Logs / Activity Slide-over Drawer */}
      <aside
        aria-label="Global Sync Logs and Webhook Activity Panel"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out print:hidden ${
          activityDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-slate-200/80 flex items-start justify-between gap-4 bg-[#F8FAFC]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Real-Time Audit Trail</span>
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
              Global Sync Logs &amp; Webhooks
            </h2>
            <p className="text-xs text-[#475569] mt-0.5">
              Live incoming marketplace webhook status codes and multi-channel
              stock level adjustments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActivityDrawerOpen(false)}
            aria-label="Close sync logs panel"
            className="p-2 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 border border-slate-200/80 active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            {(["All", "Webhook", "Stock Push"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLogFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                  logFilter === tab
                    ? "bg-white text-[#0F172A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {tab === "All"
                  ? `All (${auditLogs.length})`
                  : tab === "Webhook"
                  ? "Webhooks"
                  : "Stock Pushes"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleSimulateIncomingHook()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDF4] hover:bg-emerald-100/70 text-[#166534] border border-[#DCFCE7] active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Simulate Event</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8FAFC]">
          {filteredLogs.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 p-8 text-center space-y-3 my-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto text-[#64748B]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  No sync audit logs in view
                </h3>
                <p className="text-xs text-[#64748B] mt-1 max-w-xs mx-auto">
                  All historical webhook payloads and stock push records have
                  been cleared or filtered out.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDefaultLogs}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200/80 active:scale-[0.98] transition-all duration-100 cursor-pointer"
                >
                  Restore Sample Logs
                </button>
                <button
                  type="button"
                  onClick={() => void handleSimulateIncomingHook()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDF4] hover:bg-emerald-100/70 text-[#166534] border border-[#DCFCE7] active:scale-[0.98] transition-all duration-100 cursor-pointer"
                >
                  Trigger Webhook
                </button>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                        log.category === "Webhook"
                          ? "bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]"
                          : log.category === "Stock Push"
                          ? "bg-[#EFF6FF] text-[#1E40AF] border-[#DBEAFE]"
                          : "bg-[#FFFBEB] text-[#92400E] border-[#FEF3C7]"
                      }`}
                    >
                      {log.category}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-[#475569] border border-slate-200/80">
                      {log.channel}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                      log.severity === "success"
                        ? "bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]"
                        : log.severity === "warning" ||
                          log.severity === "error"
                        ? "bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]"
                        : "bg-[#EFF6FF] text-[#1E40AF] border-[#DBEAFE]"
                    }`}
                  >
                    {log.statusBadge}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-[#0F172A]">
                    {log.title}
                  </h3>
                  <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                    {log.detail}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-[#64748B] border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                    <Clock className="w-3 h-3 text-[#64748B]" />
                    {log.timestampIso}
                  </span>
                  <span className="text-[#475569] font-medium">
                    {log.relativeTime}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200/80 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClearLogs}
            disabled={auditLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#991B1B] bg-[#FEF2F2] hover:bg-red-100/80 border border-[#FEE2E2] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>

          <button
            type="button"
            onClick={handleExportLogsCsv}
            disabled={auditLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Logs (.CSV)</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
