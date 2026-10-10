"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Store,
  ShoppingCart,
  Globe,
  ShoppingBag,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings2,
  RefreshCw,
  PlugZap,
  Unplug,
  KeyRound,
  Link2,
  Webhook,
  Clock,
  X,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export type MarketplaceId =
  | "shopify"
  | "amazon"
  | "etsy"
  | "ebay"
  | "woocommerce";

export type ConnectionStatus = "Connected" | "Disconnected" | "Sync Error";
export type SyncInterval = "5m" | "15m" | "30m" | "1h";

export interface ChannelCredentials {
  storeUrl: string;
  apiKey: string;
  webhookSecret: string;
  autoSyncInterval: SyncInterval;
}

export interface MarketplaceIntegration {
  id: MarketplaceId;
  name: string;
  subtitle: string;
  status: ConnectionStatus;
  lastSynced: string;
  ordersSynced24h: number;
  errorMessage?: string;
  credentials: ChannelCredentials;
}

const STORAGE_KEY = "omnisync_channel_integrations_v1";

const INITIAL_INTEGRATIONS: MarketplaceIntegration[] = [
  {
    id: "shopify",
    name: "Shopify",
    subtitle: "Direct storefront orders, inventory & webhook events",
    status: "Connected",
    lastSynced: "Synced 5 mins ago",
    ordersSynced24h: 148,
    credentials: {
      storeUrl: "https://omnisync-flagship.myshopify.com",
      apiKey: "shpat_9f84b2c10e774a9183d2e110",
      webhookSecret: "whsec_shp_77a19c04f8b221",
      autoSyncInterval: "5m",
    },
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    subtitle: "SP-API order polling for FBA & FBM marketplace listings",
    status: "Connected",
    lastSynced: "Synced 12 mins ago",
    ordersSynced24h: 94,
    credentials: {
      storeUrl: "https://sellercentral.amazon.com/mws/A29X01",
      apiKey: "amzn1.sp.solution.8831-904a-bc12",
      webhookSecret: "whsec_amz_4490d81e30c2",
      autoSyncInterval: "15m",
    },
  },
  {
    id: "etsy",
    name: "Etsy",
    subtitle: "Open API v3 receipts, custom orders & dispatch tracking",
    status: "Connected",
    lastSynced: "Synced 22 mins ago",
    ordersSynced24h: 41,
    credentials: {
      storeUrl: "https://www.etsy.com/shop/OmniSyncCraft",
      apiKey: "etsy_v3_k91820471a8c44",
      webhookSecret: "whsec_ets_1904b882a1",
      autoSyncInterval: "15m",
    },
  },
  {
    id: "ebay",
    name: "eBay",
    subtitle: "Fulfillment API for fixed-price & auction order ingest",
    status: "Sync Error",
    lastSynced: "Attempted 18 mins ago",
    ordersSynced24h: 12,
    errorMessage: "OAuth refresh token expired — re-verify API credentials.",
    credentials: {
      storeUrl: "https://www.ebay.com/str/omnisyncdirect",
      apiKey: "ebay_prd_44109a8b7c6d5e",
      webhookSecret: "whsec_eby_0091283746",
      autoSyncInterval: "30m",
    },
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    subtitle: "REST API v3 self-hosted WordPress storefront connector",
    status: "Disconnected",
    lastSynced: "Never synced",
    ordersSynced24h: 0,
    credentials: {
      storeUrl: "",
      apiKey: "",
      webhookSecret: "",
      autoSyncInterval: "15m",
    },
  },
];

const CHANNEL_VISUALS: Record<
  MarketplaceId,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconText: string;
    iconBorder: string;
    accentRing: string;
    tagLabel: string;
  }
> = {
  shopify: {
    icon: Store,
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-400",
    iconBorder: "border-emerald-500/30",
    accentRing: "hover:border-emerald-500/40",
    tagLabel: "GraphQL Admin API",
  },
  amazon: {
    icon: ShoppingCart,
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-400",
    iconBorder: "border-amber-500/30",
    accentRing: "hover:border-amber-500/40",
    tagLabel: "Selling Partner API",
  },
  etsy: {
    icon: Globe,
    iconBg: "bg-orange-500/15",
    iconText: "text-orange-400",
    iconBorder: "border-orange-500/30",
    accentRing: "hover:border-orange-500/40",
    tagLabel: "Open API v3",
  },
  ebay: {
    icon: ShoppingBag,
    iconBg: "bg-sky-500/15",
    iconText: "text-sky-400",
    iconBorder: "border-sky-500/30",
    accentRing: "hover:border-sky-500/40",
    tagLabel: "Fulfillment REST",
  },
  woocommerce: {
    icon: Layers,
    iconBg: "bg-purple-500/15",
    iconText: "text-purple-400",
    iconBorder: "border-purple-500/30",
    accentRing: "hover:border-purple-500/40",
    tagLabel: "WP REST v3",
  },
};

const STATUS_STYLES: Record<
  ConnectionStatus,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Connected: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
  },
  "Sync Error": {
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-400",
    icon: AlertTriangle,
  },
  Disconnected: {
    bg: "bg-neutral-800/90",
    text: "text-neutral-400",
    border: "border-neutral-700",
    dot: "bg-neutral-500",
    icon: XCircle,
  },
};

const SYNC_INTERVAL_OPTIONS: Array<{ value: SyncInterval; label: string }> = [
  { value: "5m", label: "Every 5 minutes (Real-time)" },
  { value: "15m", label: "Every 15 minutes (Recommended)" },
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every 1 hour" },
];

import { useOmniSync } from "@/context/OmniSyncContext";

export default function IntegrationsPage() {
  const { integrations, setIntegrations, permissions, currentRole } =
    useOmniSync();

  // Modal State
  const [activeChannelId, setActiveChannelId] = useState<MarketplaceId | null>(
    null
  );
  const [formState, setFormState] = useState<ChannelCredentials>({
    storeUrl: "",
    apiKey: "",
    webhookSecret: "",
    autoSyncInterval: "15m",
  });
  const [showSecrets, setShowSecrets] = useState<boolean>(false);
  const [isSavingModal, setIsSavingModal] = useState<boolean>(false);

  // Per-card Syncing Spinner State
  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});

  // Toast State
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!activeChannelId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveChannelId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeChannelId]);

  const activeChannel = useMemo(
    () => integrations.find((item) => item.id === activeChannelId) ?? null,
    [integrations, activeChannelId]
  );

  // Open Configure / Connect Modal
  const handleOpenModal = (channel: MarketplaceIntegration) => {
    if (!permissions.canManageIntegrations) {
      showToast(
        `Role ${currentRole} cannot view or modify API credentials & webhook secrets.`
      );
      return;
    }
    setActiveChannelId(channel.id);
    setShowSecrets(false);
    setFormState({
      storeUrl:
        channel.credentials.storeUrl ||
        `https://store.${channel.id}.com/omnisync`,
      apiKey: channel.credentials.apiKey || "",
      webhookSecret: channel.credentials.webhookSecret || "",
      autoSyncInterval: channel.credentials.autoSyncInterval || "15m",
    });
  };

  // Quick Toggle Switch (Connect / Disconnect)
  const handleToggleConnection = (channel: MarketplaceIntegration) => {
    if (!permissions.canManageIntegrations) {
      showToast(
        `Role ${currentRole} cannot toggle storefront connections.`
      );
      return;
    }
    if (channel.status === "Connected") {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === channel.id
            ? {
                ...item,
                status: "Disconnected",
                lastSynced: "Disconnected just now",
                errorMessage: undefined,
              }
            : item
        )
      );
      showToast(`Disconnected ${channel.name} storefront.`);
    } else {
      // If credentials are empty, open the modal to let user configure first
      if (!channel.credentials.apiKey.trim()) {
        handleOpenModal(channel);
        return;
      }

      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === channel.id
            ? {
                ...item,
                status: "Connected",
                lastSynced: "Synced just now",
                errorMessage: undefined,
              }
            : item
        )
      );
      showToast(`Connected ${channel.name} and resumed auto-sync.`);
    }
  };

  // Trigger Manual Channel Sync on a Card
  const handleTriggerChannelSync = (channel: MarketplaceIntegration) => {
    if (syncingIds[channel.id]) return;
    setSyncingIds((prev) => ({ ...prev, [channel.id]: true }));

    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === channel.id
            ? {
                ...item,
                status: "Connected",
                lastSynced: "Synced just now",
                ordersSynced24h: item.ordersSynced24h + 2,
                errorMessage: undefined,
              }
            : item
        )
      );
      setSyncingIds((prev) => ({ ...prev, [channel.id]: false }));
      showToast(`Successfully synced latest orders from ${channel.name}.`);
    }, 1200);
  };

  // Save Credentials from Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel) return;

    setIsSavingModal(true);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === activeChannel.id
            ? {
                ...item,
                status: "Connected",
                lastSynced: "Synced just now",
                errorMessage: undefined,
                ordersSynced24h:
                  item.ordersSynced24h > 0 ? item.ordersSynced24h : 18,
                credentials: {
                  storeUrl: formState.storeUrl.trim(),
                  apiKey: formState.apiKey.trim(),
                  webhookSecret: formState.webhookSecret.trim(),
                  autoSyncInterval: formState.autoSyncInterval,
                },
              }
            : item
        )
      );
      setIsSavingModal(false);
      setActiveChannelId(null);
      showToast(
        `Saved ${activeChannel.name} credentials & connected (Auto-sync: ${formState.autoSyncInterval}).`
      );
    }, 600);
  };

  const summary = useMemo(() => {
    const connected = integrations.filter(
      (i) => i.status === "Connected"
    ).length;
    const errors = integrations.filter(
      (i) => i.status === "Sync Error"
    ).length;
    const total24hOrders = integrations.reduce(
      (sum, i) => sum + i.ordersSynced24h,
      0
    );
    return { connected, errors, total24hOrders };
  }, [integrations]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Channel Storefront Mesh</span>
            </span>
            <span className="hidden sm:inline text-xs text-neutral-400">
              <strong className="text-white">{summary.connected}</strong> of{" "}
              <strong className="text-white">{integrations.length}</strong>{" "}
              channels active
            </span>
          </div>

          <div className="flex items-center gap-3">
            {summary.errors > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                {summary.errors} Sync Error
              </span>
            )}
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-900 text-neutral-300 border border-neutral-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {summary.total24hOrders} orders ingested (24h)
            </span>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-900/95 border border-emerald-500/40 text-neutral-100 text-xs font-medium shadow-2xl backdrop-blur-md"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Integrations &amp; Channel Connect
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Manage API credentials, webhook secrets, and automatic order
              polling intervals across all marketplace storefronts.
            </p>
          </div>
        </div>

        {/* Channel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {integrations.map((channel) => {
            const visual = CHANNEL_VISUALS[channel.id];
            const Icon = visual.icon;
            const statusStyle = STATUS_STYLES[channel.status];
            const StatusIcon = statusStyle.icon;
            const isConnected = channel.status === "Connected";
            const isSyncingCard = !!syncingIds[channel.id];

            return (
              <div
                key={channel.id}
                className={`group rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800/90 ${visual.accentRing} transition-all p-6 flex flex-col justify-between gap-5 shadow-lg`}
              >
                {/* Top Card Row: Icon Badge + Status Badge & Toggle */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${visual.iconBg} ${visual.iconText} ${visual.iconBorder}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-white">
                            {channel.name}
                          </h2>
                        </div>
                        <span className="inline-block text-[11px] font-mono text-neutral-400 bg-neutral-950/80 border border-neutral-800 px-2 py-0.5 rounded mt-1">
                          {visual.tagLabel}
                        </span>
                      </div>
                    </div>

                    {/* Quick Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isConnected}
                      aria-label={`Toggle ${channel.name} connection`}
                      onClick={() => handleToggleConnection(channel)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isConnected ? "bg-emerald-500" : "bg-neutral-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isConnected ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {channel.subtitle}
                  </p>

                  {/* Status Badge & Sync Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {channel.status}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      {channel.lastSynced}
                    </span>
                  </div>

                  {/* Error Banner if Sync Error */}
                  {channel.errorMessage && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{channel.errorMessage}</span>
                    </div>
                  )}

                  {/* Metadata Strip */}
                  <div className="rounded-xl bg-neutral-950/70 border border-neutral-800/80 px-3.5 py-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[11px]">
                        Auto-Sync Interval
                      </span>
                      <span className="font-mono font-semibold text-neutral-200">
                        Every {channel.credentials.autoSyncInterval}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-500 block text-[11px]">
                        24h Orders Synced
                      </span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {channel.ordersSynced24h} orders
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Action Buttons */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(channel)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800/90 hover:bg-neutral-800 text-neutral-100 border border-neutral-700/80 transition-colors cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      {channel.status === "Disconnected"
                        ? "Configure & Connect"
                        : "Configure"}
                    </span>
                  </button>

                  {isConnected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTriggerChannelSync(channel)}
                        disabled={isSyncingCard}
                        title="Sync channel now"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isSyncingCard ? "animate-spin" : ""
                          }`}
                        />
                        <span>{isSyncingCard ? "Syncing" : "Sync"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleConnection(channel)}
                        title="Disconnect channel"
                        className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-medium bg-neutral-950 hover:bg-rose-500/15 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-500/30 transition-colors cursor-pointer"
                        aria-label={`Disconnect ${channel.name}`}
                      >
                        <Unplug className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        channel.credentials.apiKey.trim()
                          ? handleToggleConnection(channel)
                          : handleOpenModal(channel)
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors cursor-pointer"
                    >
                      <PlugZap className="w-3.5 h-3.5" />
                      <span>
                        {channel.status === "Sync Error"
                          ? "Reconnect"
                          : "Connect"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Interactive Connect / Configure Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
          activeChannel
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!activeChannel}
      >
        {/* Backdrop */}
        <div
          onClick={() => setActiveChannelId(null)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Box */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="channel-modal-title"
          className={`relative z-10 w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden transform transition-all duration-200 ${
            activeChannel ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {activeChannel && (
            <>
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const vis = CHANNEL_VISUALS[activeChannel.id];
                    const ModalIcon = vis.icon;
                    return (
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center ${vis.iconBg} ${vis.iconText} ${vis.iconBorder}`}
                      >
                        <ModalIcon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <h2
                      id="channel-modal-title"
                      className="text-base font-bold text-white"
                    >
                      Configure {activeChannel.name}
                    </h2>
                    <p className="text-xs text-neutral-400">
                      API credentials &amp; automated order polling settings
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveChannelId(null)}
                  aria-label="Close modal"
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveModal} className="p-6 space-y-4">
                {/* Store URL */}
                <div>
                  <label
                    htmlFor="store-url-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1.5"
                  >
                    Storefront / Seller Endpoint URL
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="store-url-input"
                      type="url"
                      required
                      value={formState.storeUrl}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          storeUrl: e.target.value,
                        }))
                      }
                      placeholder="https://your-store.myshopify.com"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60"
                    />
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="api-key-input"
                      className="block text-xs font-semibold text-neutral-300"
                    >
                      API Access Token / Client Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSecrets((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                    >
                      {showSecrets ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hide secrets</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Reveal secrets</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="api-key-input"
                      type={showSecrets ? "text" : "password"}
                      required
                      value={formState.apiKey}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          apiKey: e.target.value,
                        }))
                      }
                      placeholder="Enter marketplace API key or access token"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60"
                    />
                  </div>
                </div>

                {/* Webhook Secret */}
                <div>
                  <label
                    htmlFor="webhook-secret-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1.5"
                  >
                    Webhook Signing Secret
                  </label>
                  <div className="relative">
                    <Webhook className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="webhook-secret-input"
                      type={showSecrets ? "text" : "password"}
                      required
                      value={formState.webhookSecret}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          webhookSecret: e.target.value,
                        }))
                      }
                      placeholder="whsec_..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60"
                    />
                  </div>
                </div>

                {/* Auto-Sync Interval */}
                <div>
                  <label
                    htmlFor="sync-interval-select"
                    className="block text-xs font-semibold text-neutral-300 mb-1.5"
                  >
                    Auto-Sync Polling Interval
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="sync-interval-select"
                      value={formState.autoSyncInterval}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          autoSyncInterval: e.target.value as SyncInterval,
                        }))
                      }
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60"
                    >
                      {SYNC_INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isSavingModal ? "animate-spin" : ""
                      }`}
                    />
                    <span>
                      {isSavingModal
                        ? "Verifying & Saving..."
                        : "Save & Connect Channel"}
                    </span>
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
