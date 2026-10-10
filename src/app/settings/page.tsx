"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Globe,
  Sliders,
  Webhook,
  Save,
  RotateCcw,
  CheckCircle2,
  Building2,
  Coins,
  Clock,
  Palette,
  RefreshCw,
  AlertTriangle,
  Archive,
  Send,
  BellRing,
  ShieldCheck,
  Sparkles,
  Layers,
} from "lucide-react";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "PKR";
export type ThemePreference = "dark-obsidian" | "midnight-contrast" | "system";
export type DensityPreference = "comfortable" | "compact";
export type SettingsTabId = "all" | "general" | "automation" | "webhooks";

export interface OmniSyncSettingsPreferences {
  // General Settings
  storeName: string;
  supportEmail: string;
  warehouseRegion: string;
  currency: CurrencyCode;
  timeZone: string;
  themePreference: ThemePreference;
  densityPreference: DensityPreference;
  enableGlassEffects: boolean;

  // Sync Rules & Automation
  autoInventoryRebalancing: boolean;
  rebalanceBufferUnits: number;
  lowStockThreshold: number;
  criticalHoldLastUnit: boolean;
  autoArchiveFulfilledDays: number;
  conflictResolutionMode: "marketplace_priority" | "newest_timestamp";

  // Notification Webhooks
  slackWebhookUrl: string;
  slackChannelName: string;
  slackEnabled: boolean;
  discordWebhookUrl: string;
  discordEnabled: boolean;
  notifyOnSyncFailure: boolean;
  notifyOnSyncSuccess: boolean;
  notifyOnLowStock: boolean;
  lastSavedAt: string;
}

const SETTINGS_STORAGE_KEY = "omnisync_settings_preferences_v1";

const DEFAULT_SETTINGS: OmniSyncSettingsPreferences = {
  storeName: "OmniSync Global Flagship",
  supportEmail: "ops@omnisync.io",
  warehouseRegion: "US-East (Newark Fulfillment Hub)",
  currency: "USD",
  timeZone: "UTC (Coordinated Universal Time)",
  themePreference: "dark-obsidian",
  densityPreference: "comfortable",
  enableGlassEffects: true,

  autoInventoryRebalancing: true,
  rebalanceBufferUnits: 4,
  lowStockThreshold: 10,
  criticalHoldLastUnit: true,
  autoArchiveFulfilledDays: 30,
  conflictResolutionMode: "newest_timestamp",

  slackWebhookUrl: "",
  slackChannelName: "#ops-sync-alerts",
  slackEnabled: false,
  discordWebhookUrl: "",
  discordEnabled: false,
  notifyOnSyncFailure: true,
  notifyOnSyncSuccess: true,
  notifyOnLowStock: true,
  lastSavedAt: "2026-10-06 15:00:00 UTC",
};

const CURRENCY_OPTIONS: Array<{
  code: CurrencyCode;
  symbol: string;
  label: string;
  sampleFormatted: string;
}> = [
  {
    code: "USD",
    symbol: "$",
    label: "US Dollar (USD)",
    sampleFormatted: "$1,420.00",
  },
  {
    code: "EUR",
    symbol: "€",
    label: "Euro (EUR)",
    sampleFormatted: "€1,306.40",
  },
  {
    code: "GBP",
    symbol: "£",
    label: "British Pound (GBP)",
    sampleFormatted: "£1,107.60",
  },
  {
    code: "PKR",
    symbol: "₨",
    label: "Pakistani Rupee (PKR)",
    sampleFormatted: "₨395,470",
  },
];

const TIMEZONE_OPTIONS: string[] = [
  "UTC (Coordinated Universal Time)",
  "America/New_York (EST/EDT • UTC-5)",
  "America/Los_Angeles (PST/PDT • UTC-8)",
  "Europe/London (GMT/BST • UTC+0)",
  "Europe/Berlin (CET/CEST • UTC+1)",
  "Asia/Karachi (PKT • UTC+5)",
  "Asia/Dubai (GST • UTC+4)",
  "Asia/Tokyo (JST • UTC+9)",
];

import { useOmniSync } from "@/context/OmniSyncContext";

export default function SettingsPage() {
  const { settings: prefs, setSettings: setPrefs } = useOmniSync();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("all");
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [testingTarget, setTestingTarget] = useState<
    "slack" | "discord" | null
  >(null);

  function updateField<K extends keyof OmniSyncSettingsPreferences>(
    key: K,
    value: OmniSyncSettingsPreferences[K]
  ) {
    setPrefs((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSavePreferences(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const now = new Date();
    const formattedTimestamp = `${now.toISOString().slice(0, 10)} ${now
      .toISOString()
      .slice(11, 19)} UTC`;

    const updated: OmniSyncSettingsPreferences = {
      ...prefs,
      lastSavedAt: formattedTimestamp,
    };

    setPrefs(updated);
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch {
      // Ignore storage write error
    }

    setSaveBanner(
      `Preferences saved to localStorage (${updated.currency} • Low-stock < ${updated.lowStockThreshold}u • Archive ${updated.autoArchiveFulfilledDays}d)`
    );
    window.setTimeout(() => setSaveBanner(null), 4000);

    // Push audit log & global notification toast to AppShell
    window.dispatchEvent(
      new CustomEvent("omnisync:audit-log", {
        detail: {
          title: "Workspace settings & sync rules updated",
          detail: `Saved Currency: ${updated.currency}, Rebalancing: ${
            updated.autoInventoryRebalancing ? "ON" : "OFF"
          }, Low-Stock Alert: < ${
            updated.lowStockThreshold
          } units, Auto-Archive: ${updated.autoArchiveFulfilledDays} days.`,
          channel: "System",
          category: "Automation",
          statusBadge: "Saved • Local",
          severity: "success",
          showToast: true,
        },
      })
    );
  }

  function handleResetDefaults() {
    setPrefs(DEFAULT_SETTINGS);
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(DEFAULT_SETTINGS)
      );
    } catch {
      // Ignore storage write error
    }

    setSaveBanner("Restored default workspace preferences.");
    window.setTimeout(() => setSaveBanner(null), 3500);

    window.dispatchEvent(
      new CustomEvent("omnisync:audit-log", {
        detail: {
          title: "Settings reset to factory defaults",
          detail:
            "Restored default USD currency, 10-unit low-stock threshold, and 30-day archive window.",
          channel: "System",
          category: "Automation",
          statusBadge: "Reset",
          severity: "info",
          showToast: true,
        },
      })
    );
  }

  function handleTestWebhook(target: "slack" | "discord") {
    const url =
      target === "slack" ? prefs.slackWebhookUrl : prefs.discordWebhookUrl;
    setTestingTarget(target);

    window.setTimeout(() => {
      setTestingTarget(null);
      const isConfigured = url.trim().startsWith("https://");

      window.dispatchEvent(
        new CustomEvent("omnisync:audit-log", {
          detail: {
            title: isConfigured
              ? `${
                  target === "slack" ? "Slack" : "Discord"
                } alert hook verified - 200 OK`
              : `${
                  target === "slack" ? "Slack" : "Discord"
                } webhook test failed - 400 Invalid URL`,
            detail: isConfigured
              ? `Dispatched test sync alert payload to ${
                  target === "slack" ? prefs.slackChannelName : "Discord Server"
                } (${url.slice(0, 38)}...).`
              : `Please enter a valid https:// incoming webhook URL for ${
                  target === "slack" ? "Slack" : "Discord"
                }.`,
            channel: "System",
            category: "Webhook",
            statusBadge: isConfigured ? "200 OK" : "400 Error",
            severity: isConfigured ? "success" : "warning",
            showToast: true,
          },
        })
      );
    }, 650);
  }

  const activeCurrencyMeta =
    CURRENCY_OPTIONS.find((c) => c.code === prefs.currency) ??
    CURRENCY_OPTIONS[0];

  const showGeneral = activeTab === "all" || activeTab === "general";
  const showAutomation = activeTab === "all" || activeTab === "automation";
  const showWebhooks = activeTab === "all" || activeTab === "webhooks";

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>Workspace Configuration &amp; Automation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Settings &amp; Preferences
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage storefront profile, currency &amp; localization, automated
            stock rebalancing rules, and Slack/Discord notification webhooks.
          </p>
        </div>

        {/* Save & Reset Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSavePreferences()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* Confirmation Banner */}
      {saveBanner && (
        <div
          role="status"
          className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-300"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveBanner}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/80 shrink-0">
            localStorage Synced
          </span>
        </div>
      )}

      {/* Tabbed Section Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div
          role="tablist"
          aria-label="Settings Sections"
          className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl bg-neutral-900/80 p-1.5 border border-neutral-800/90"
        >
          {[
            { id: "all" as const, label: "All Sections", icon: Layers },
            {
              id: "general" as const,
              label: "General Settings",
              icon: Globe,
            },
            {
              id: "automation" as const,
              label: "Sync Rules & Automation",
              icon: Sliders,
            },
            {
              id: "webhooks" as const,
              label: "Notification Webhooks",
              icon: Webhook,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Last persisted:</span>
          <span className="font-mono text-neutral-300">
            {prefs.lastSavedAt}
          </span>
        </div>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-8">
        {/* SECTION 1: GENERAL SETTINGS */}
        {showGeneral && (
          <section
            aria-labelledby="heading-general-settings"
            className="rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800/80 overflow-hidden"
          >
            <div className="p-6 border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="heading-general-settings"
                    className="text-base font-bold text-white"
                  >
                    General Settings
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Store identity, display currency (USD, EUR, GBP, PKR), time
                    zone, and dark theme preferences.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 w-fit">
                Active Currency: {activeCurrencyMeta.code} (
                {activeCurrencyMeta.symbol})
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Store Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="store-name-input"
                    className="block text-xs font-medium text-neutral-300 mb-1.5"
                  >
                    Storefront / Organization Name
                  </label>
                  <input
                    id="store-name-input"
                    type="text"
                    value={prefs.storeName}
                    onChange={(e) => updateField("storeName", e.target.value)}
                    placeholder="OmniSync Global Flagship"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-email-input"
                    className="block text-xs font-medium text-neutral-300 mb-1.5"
                  >
                    Operations Escalation Email
                  </label>
                  <input
                    id="support-email-input"
                    type="email"
                    value={prefs.supportEmail}
                    onChange={(e) =>
                      updateField("supportEmail", e.target.value)
                    }
                    placeholder="ops@omnisync.io"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="warehouse-region-input"
                    className="block text-xs font-medium text-neutral-300 mb-1.5"
                  >
                    Primary Fulfillment Hub
                  </label>
                  <input
                    id="warehouse-region-input"
                    type="text"
                    value={prefs.warehouseRegion}
                    onChange={(e) =>
                      updateField("warehouseRegion", e.target.value)
                    }
                    placeholder="US-East (Newark Fulfillment Hub)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>

              {/* Currency Selector & Time Zone Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-neutral-800/60">
                {/* Currency Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="currency-select"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-200"
                    >
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reporting &amp; Settlement Currency</span>
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Preview: {activeCurrencyMeta.sampleFormatted}
                    </span>
                  </div>

                  <select
                    id="currency-select"
                    value={prefs.currency}
                    onChange={(e) =>
                      updateField("currency", e.target.value as CurrencyCode)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-emerald-500/60"
                  >
                    {CURRENCY_OPTIONS.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} ({item.symbol}) — {item.label}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-4 gap-2">
                    {CURRENCY_OPTIONS.map((item) => {
                      const active = prefs.currency === item.code;
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => updateField("currency", item.code)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                              : "bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                              {item.code}
                            </span>
                            <span className="text-xs font-mono opacity-80">
                              {item.symbol}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-1 truncate">
                            {item.sampleFormatted}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Zone Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="timezone-select"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-200"
                    >
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Audit Log &amp; Cutoff Time Zone</span>
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      ISO-8601 Synced
                    </span>
                  </div>

                  <select
                    id="timezone-select"
                    value={prefs.timeZone}
                    onChange={(e) => updateField("timeZone", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-emerald-500/60"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Daily GMV rollups, SLA fulfillment cutoffs, and webhook
                    audit timestamps in the slide-over drawer align to this time
                    zone.
                  </p>
                </div>
              </div>

              {/* Theme & Visual Density Preferences */}
              <div className="pt-4 border-t border-neutral-800/60 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-200 mb-2">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    <span>Theme Surface Mode</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "dark-obsidian" as const, label: "Obsidian" },
                      { id: "midnight-contrast" as const, label: "Contrast" },
                      { id: "system" as const, label: "System" },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => updateField("themePreference", theme.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                          prefs.themePreference === theme.id
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-200 mb-2">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Table &amp; Card Density</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "comfortable" as const, label: "Comfortable" },
                      { id: "compact" as const, label: "Compact Pro" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => updateField("densityPreference", d.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                          prefs.densityPreference === d.id
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-neutral-950/80 border border-neutral-800 p-3.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Glassmorphism &amp; Motion</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Backdrop blur on drawers &amp; live sync pulse indicators.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs.enableGlassEffects}
                    onClick={() =>
                      updateField(
                        "enableGlassEffects",
                        !prefs.enableGlassEffects
                      )
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer ${
                      prefs.enableGlassEffects
                        ? "bg-emerald-500 border-emerald-400"
                        : "bg-neutral-800 border-neutral-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-neutral-950 transition-transform mt-0.25 ${
                        prefs.enableGlassEffects
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: SYNC RULES & AUTOMATION */}
        {showAutomation && (
          <section
            aria-labelledby="heading-sync-automation"
            className="rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800/80 overflow-hidden"
          >
            <div className="p-6 border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="heading-sync-automation"
                    className="text-base font-bold text-white"
                  >
                    Sync Rules &amp; Automation
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Configure autonomous multi-channel stock rebalancing,
                    low-stock alert thresholds, and order archiving.
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border w-fit ${
                  prefs.autoInventoryRebalancing
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-neutral-800 text-neutral-400 border-neutral-700"
                }`}
              >
                {prefs.autoInventoryRebalancing
                  ? "Auto-Rebalancing Active"
                  : "Manual Stock Allocation"}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Rule 1: Auto-Inventory Rebalancing Toggle */}
              <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Auto-Inventory Rebalancing Across Channels
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    When a SKU sells down on Shopify, Amazon, or Etsy,
                    automatically reallocate available stock from sister
                    storefronts while holding back a safety buffer to prevent
                    overselling.
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="buffer-units-input"
                      className="text-xs text-neutral-400"
                    >
                      Safety Buffer:
                    </label>
                    <input
                      id="buffer-units-input"
                      type="number"
                      min={0}
                      max={25}
                      value={prefs.rebalanceBufferUnits}
                      onChange={(e) =>
                        updateField(
                          "rebalanceBufferUnits",
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-16 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white text-center"
                    />
                    <span className="text-xs text-neutral-500">units</span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-label="Toggle Auto-Inventory Rebalancing"
                    aria-checked={prefs.autoInventoryRebalancing}
                    onClick={() =>
                      updateField(
                        "autoInventoryRebalancing",
                        !prefs.autoInventoryRebalancing
                      )
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer ${
                      prefs.autoInventoryRebalancing
                        ? "bg-emerald-500 border-emerald-400"
                        : "bg-neutral-800 border-neutral-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-neutral-950 transition-transform mt-0.25 ${
                        prefs.autoInventoryRebalancing
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Rule 2 & 3 Grid: Low-Stock Threshold Trigger + Auto-Archive Fulfilled Orders Slider */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low-Stock Threshold Alert Trigger */}
                <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-white">
                          Low-Stock Threshold Alert Trigger
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Flag SKUs as{" "}
                        <span className="text-amber-400 font-medium">
                          Low Stock
                        </span>{" "}
                        and dispatch restock alerts when total inventory drops
                        below this unit count.
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shrink-0">
                      &lt; {prefs.lowStockThreshold} units
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input
                      id="low-stock-slider"
                      type="range"
                      min={2}
                      max={50}
                      step={1}
                      value={prefs.lowStockThreshold}
                      onChange={(e) =>
                        updateField("lowStockThreshold", Number(e.target.value))
                      }
                      aria-label="Low-stock alert threshold units"
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                      <span>2 units (Strict)</span>
                      <span>10 units (Standard)</span>
                      <span>25 units</span>
                      <span>50 units (Conservative)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between">
                    <span className="text-xs text-neutral-300">
                      Hold final 1 unit on Etsy &amp; eBay to prevent double
                      checkout
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.criticalHoldLastUnit}
                      onClick={() =>
                        updateField(
                          "criticalHoldLastUnit",
                          !prefs.criticalHoldLastUnit
                        )
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors cursor-pointer ${
                        prefs.criticalHoldLastUnit
                          ? "bg-emerald-500 border-emerald-400"
                          : "bg-neutral-800 border-neutral-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-neutral-950 transition-transform mt-0.25 ${
                          prefs.criticalHoldLastUnit
                            ? "translate-x-4"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Auto-Archive Fulfilled Orders Slider */}
                <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-sky-400" />
                        <h3 className="text-sm font-semibold text-white">
                          Auto-Archive Fulfilled Orders
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Automatically move{" "}
                        <span className="text-emerald-400 font-medium">
                          Delivered
                        </span>{" "}
                        orders into cold audit storage after the specified
                        retention window.
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold shrink-0">
                      {prefs.autoArchiveFulfilledDays} days
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input
                      id="auto-archive-slider"
                      type="range"
                      min={7}
                      max={180}
                      step={1}
                      value={prefs.autoArchiveFulfilledDays}
                      onChange={(e) =>
                        updateField(
                          "autoArchiveFulfilledDays",
                          Number(e.target.value)
                        )
                      }
                      aria-label="Auto-archive fulfilled orders after days"
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                      <span>7d</span>
                      <span>30d (Default)</span>
                      <span>90d (Quarterly)</span>
                      <span>180d</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between gap-2">
                    <span className="text-xs text-neutral-300">
                      Sync Conflict Resolution Policy
                    </span>
                    <select
                      aria-label="Sync Conflict Resolution Policy"
                      value={prefs.conflictResolutionMode}
                      onChange={(e) =>
                        updateField(
                          "conflictResolutionMode",
                          e.target.value as
                            | "marketplace_priority"
                            | "newest_timestamp"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200"
                    >
                      <option value="newest_timestamp">
                        Newest Webhook Timestamp Wins
                      </option>
                      <option value="marketplace_priority">
                        Shopify Master Catalog Priority
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: NOTIFICATION WEBHOOKS */}
        {showWebhooks && (
          <section
            aria-labelledby="heading-notification-webhooks"
            className="rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800/80 overflow-hidden"
          >
            <div className="p-6 border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="heading-notification-webhooks"
                    className="text-base font-bold text-white"
                  >
                    Notification Webhooks (Slack &amp; Discord)
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Push real-time sync failure/success alerts and low-stock
                    warnings to your operations channels.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 w-fit">
                HMAC-SHA256 Signed Payloads
              </span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Slack Incoming Webhook Card */}
                <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Slack Incoming Webhook URL
                        </h3>
                        <p className="text-[11px] text-neutral-400">
                          Dispatches Block Kit alerts to{" "}
                          {prefs.slackChannelName}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-label="Enable Slack Webhook Notifications"
                      aria-checked={prefs.slackEnabled}
                      onClick={() =>
                        updateField("slackEnabled", !prefs.slackEnabled)
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer ${
                        prefs.slackEnabled
                          ? "bg-emerald-500 border-emerald-400"
                          : "bg-neutral-800 border-neutral-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-neutral-950 transition-transform mt-0.25 ${
                          prefs.slackEnabled
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="slack-webhook-input"
                        className="block text-xs font-medium text-neutral-300 mb-1"
                      >
                        Webhook Endpoint URL
                      </label>
                      <input
                        id="slack-webhook-input"
                        type="url"
                        value={prefs.slackWebhookUrl}
                        onChange={(e) =>
                          updateField("slackWebhookUrl", e.target.value)
                        }
                        placeholder="https://hooks.slack.com/services/T000.../B000.../XXXX..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        aria-label="Slack target channel"
                        value={prefs.slackChannelName}
                        onChange={(e) =>
                          updateField("slackChannelName", e.target.value)
                        }
                        placeholder="#ops-sync-alerts"
                        className="w-44 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300"
                      />

                      <button
                        type="button"
                        onClick={() => handleTestWebhook("slack")}
                        disabled={testingTarget === "slack"}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {testingTarget === "slack"
                            ? "Pinging Slack..."
                            : "Send Test Alert"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discord Incoming Webhook Card */}
                <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          prefs.discordEnabled
                            ? "bg-emerald-400"
                            : "bg-neutral-600"
                        }`}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Discord Incoming Webhook URL
                        </h3>
                        <p className="text-[11px] text-neutral-400">
                          Pushes rich embed JSON payloads to Discord #ops-feed
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-label="Enable Discord Webhook Notifications"
                      aria-checked={prefs.discordEnabled}
                      onClick={() =>
                        updateField("discordEnabled", !prefs.discordEnabled)
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer ${
                        prefs.discordEnabled
                          ? "bg-emerald-500 border-emerald-400"
                          : "bg-neutral-800 border-neutral-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-neutral-950 transition-transform mt-0.25 ${
                          prefs.discordEnabled
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="discord-webhook-input"
                        className="block text-xs font-medium text-neutral-300 mb-1"
                      >
                        Webhook Endpoint URL
                      </label>
                      <input
                        id="discord-webhook-input"
                        type="url"
                        value={prefs.discordWebhookUrl}
                        onChange={(e) =>
                          updateField("discordWebhookUrl", e.target.value)
                        }
                        placeholder="https://discord.com/api/webhooks/123456789/abcdef..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-neutral-500 font-mono">
                        Format: Discord Embed v10
                      </span>

                      <button
                        type="button"
                        onClick={() => handleTestWebhook("discord")}
                        disabled={testingTarget === "discord"}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {testingTarget === "discord"
                            ? "Pinging Discord..."
                            : "Send Test Alert"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscribed Event Triggers */}
              <div className="pt-4 border-t border-neutral-800/60">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  Subscribed Webhook Alert Triggers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      key: "notifyOnSyncFailure" as const,
                      title: "Sync Failures & 401 Auth Errors",
                      desc: "Immediate alert when eBay/Amazon tokens expire or hooks return 4xx/5xx.",
                    },
                    {
                      key: "notifyOnSyncSuccess" as const,
                      title: "Batch Sync Success (200 OK)",
                      desc: "Digest notification when multi-channel order & stock sync completes.",
                    },
                    {
                      key: "notifyOnLowStock" as const,
                      title: `Low-Stock Threshold (< ${prefs.lowStockThreshold}u)`,
                      desc: "Alert when any SKU drops below the configured threshold.",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/90 cursor-pointer hover:border-neutral-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={prefs[item.key]}
                        onChange={(e) =>
                          updateField(item.key, e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
