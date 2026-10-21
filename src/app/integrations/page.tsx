"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Store,
  ShoppingCart,
  Globe,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  KeyRound,
  Link2,
  Webhook,
  Clock,
  X,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { useOmniSync } from "@/context/OmniSyncContext";

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

const CHANNEL_VISUALS: Record<
  MarketplaceId,
  {
    icon: React.ComponentType<{ className?: string }>;
    tagLabel: string;
  }
> = {
  shopify: {
    icon: Store,
    tagLabel: "Shopify API v2026",
  },
  amazon: {
    icon: ShoppingCart,
    tagLabel: "SP-API v2",
  },
  etsy: {
    icon: Globe,
    tagLabel: "Etsy Open API v3",
  },
  ebay: {
    icon: ShoppingBag,
    tagLabel: "eBay Fulfillment API",
  },
  woocommerce: {
    icon: Store,
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
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/60",
    dot: "bg-emerald-600",
    icon: CheckCircle2,
  },
  "Sync Error": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/60",
    dot: "bg-amber-600",
    icon: AlertTriangle,
  },
  Disconnected: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200/60",
    dot: "bg-slate-400",
    icon: XCircle,
  },
};

const SYNC_INTERVAL_OPTIONS: Array<{ value: SyncInterval; label: string }> = [
  { value: "5m", label: "Every 5 minutes (Real-time)" },
  { value: "15m", label: "Every 15 minutes (Standard)" },
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every 1 hour" },
];

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 ${
        checked ? "bg-slate-900" : "bg-slate-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function IntegrationsPage() {
  const { integrations, setIntegrations, permissions, currentRole } =
    useOmniSync();

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
  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});
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

  const activeChannel = useMemo(
    () => integrations.find((item) => item.id === activeChannelId) || null,
    [integrations, activeChannelId]
  );

  const summary = useMemo(() => {
    const connected = integrations.filter(
      (item) => item.status === "Connected"
    ).length;
    const errors = integrations.filter(
      (item) => item.status === "Sync Error"
    ).length;
    const total24hOrders = integrations.reduce(
      (acc, item) => acc + item.ordersSynced24h,
      0
    );
    return { connected, errors, total24hOrders };
  }, [integrations]);

  const handleToggleConnection = (channel: MarketplaceIntegration) => {
    if (!permissions.canManageIntegrations) {
      showToast(
        `Role ${currentRole} has read-only access and cannot toggle marketplace integrations.`
      );
      return;
    }

    const nextStatus: ConnectionStatus =
      channel.status === "Connected" ? "Disconnected" : "Connected";

    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === channel.id
          ? {
              ...item,
              status: nextStatus,
              lastSynced:
                nextStatus === "Connected"
                  ? "Connected just now"
                  : item.lastSynced,
              errorMessage: undefined,
            }
          : item
      )
    );

    showToast(
      `${channel.name} integration ${
        nextStatus === "Connected" ? "enabled" : "disabled"
      }.`
    );
  };

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
      showToast(`Synced latest orders from ${channel.name}.`);
    }, 1000);
  };

  const handleOpenConfigureModal = (channel: MarketplaceIntegration) => {
    if (!permissions.canManageIntegrations) {
      showToast(
        `Role ${currentRole} is restricted from viewing or modifying API secrets.`
      );
      return;
    }
    setActiveChannelId(channel.id);
    setFormState({ ...channel.credentials });
    setShowSecrets(false);
  };

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
                credentials: { ...formState },
              }
            : item
        )
      );
      setIsSavingModal(false);
      setActiveChannelId(null);
      showToast(`${activeChannel.name} credentials updated.`);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-entry">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-900 text-xs font-medium shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12)] animate-entry"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span>{toast.message}</span>
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Storefront Integrations
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Connect marketplace storefronts, configure API tokens, and monitor sync webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-medium">
            {summary.connected} of {integrations.length} channels connected
          </span>
          {summary.errors > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 font-medium">
              {summary.errors} error
            </span>
          )}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((channel) => {
          const visual = CHANNEL_VISUALS[channel.id];
          const Icon = visual.icon;
          const statusStyle = STATUS_STYLES[channel.status];
          const isConnected = channel.status === "Connected";
          const isSyncingCard = !!syncingIds[channel.id];

          return (
            <div
              key={channel.id}
              className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        {channel.name}
                      </h2>
                      <span className="text-[11px] font-mono text-slate-400">
                        {visual.tagLabel}
                      </span>
                    </div>
                  </div>

                  <Toggle
                    checked={isConnected}
                    onChange={() => handleToggleConnection(channel)}
                    disabled={!permissions.canManageIntegrations}
                    label={`Toggle ${channel.name} connection`}
                  />
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {channel.subtitle}
                </p>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    <span>{channel.status}</span>
                  </span>

                  <span className="text-[11px] text-slate-400">
                    {channel.ordersSynced24h} orders / 24h
                  </span>
                </div>

                {channel.errorMessage && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200/60 rounded-md p-2">
                    {channel.errorMessage}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!isConnected || isSyncingCard}
                  onClick={() => handleTriggerChannelSync(channel)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isSyncingCard ? "animate-spin" : ""}`}
                  />
                  <span>{isSyncingCard ? "Syncing..." : "Sync Now"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenConfigureModal(channel)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {activeChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setActiveChannelId(null)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="channel-modal-title"
            className="relative z-10 w-full max-w-lg rounded-xl bg-white border border-slate-200/80 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2
                  id="channel-modal-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Configure {activeChannel.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Storefront endpoint and authentication credentials
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveChannelId(null)}
                aria-label="Close modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="store-url-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Storefront URL / API Host
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="api-key-input"
                    className="block text-xs font-medium text-slate-700"
                  >
                    API Access Token
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecrets((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    {showSecrets ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    placeholder="Enter access token"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="webhook-secret-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Webhook Signing Secret
                </label>
                <div className="relative">
                  <Webhook className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="sync-interval-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Auto-Sync Interval
                </label>
                <select
                  id="sync-interval-select"
                  value={formState.autoSyncInterval}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      autoSyncInterval: e.target.value as SyncInterval,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                >
                  {SYNC_INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveChannelId(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSavingModal ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {isSavingModal ? "Saving..." : "Save Credentials"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
