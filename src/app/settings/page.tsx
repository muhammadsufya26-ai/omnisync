"use client";

import React, { useState } from "react";
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react";
import { useOmniSync } from "@/context/OmniSyncContext";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "PKR";
export type ThemePreference = "dark-obsidian" | "midnight-contrast" | "system";
export type DensityPreference = "comfortable" | "compact";

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
  storeName: "OmniSync Pakistan Flagship",
  supportEmail: "support@omnisync.com",
  warehouseRegion: "Pakistan (Lahore Hub)",
  currency: "PKR",
  timeZone: "Asia/Karachi (PKT - UTC+5)",
  themePreference: "system",
  densityPreference: "comfortable",
  enableGlassEffects: false,

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
}> = [
  { code: "USD", symbol: "$", label: "US Dollar (USD - $)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR - €)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP - £)" },
  { code: "PKR", symbol: "₨", label: "Pakistani Rupee (PKR - ₨)" },
];

const TIMEZONE_OPTIONS: string[] = [
  "UTC (Coordinated Universal Time)",
  "America/New_York (EST/EDT)",
  "America/Los_Angeles (PST/PDT)",
  "Europe/London (GMT/BST)",
  "Europe/Berlin (CET/CEST)",
  "Asia/Karachi (PKT - UTC+5)",
  "Asia/Dubai (GST - UTC+4)",
  "Asia/Tokyo (JST - UTC+9)",
];

function Toggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
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

export default function SettingsPage() {
  const { settings: prefs, setSettings: setPrefs } = useOmniSync();
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [testingTarget, setTestingTarget] = useState<"slack" | "discord" | null>(
    null
  );

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
      // Ignore
    }

    setSaveBanner("Preferences saved successfully.");
    window.setTimeout(() => setSaveBanner(null), 3500);

    window.dispatchEvent(
      new CustomEvent("omnisync:audit-log", {
        detail: {
          title: "Workspace settings updated",
          detail: `Saved Currency: ${updated.currency}, Low Stock: < ${updated.lowStockThreshold} units, Rebalancing: ${
            updated.autoInventoryRebalancing ? "Enabled" : "Disabled"
          }.`,
          channel: "System",
          category: "Automation",
          statusBadge: "Saved",
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
      // Ignore
    }

    setSaveBanner("Restored default settings.");
    window.setTimeout(() => setSaveBanner(null), 3000);
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
              ? `${target === "slack" ? "Slack" : "Discord"} webhook test sent`
              : `${target === "slack" ? "Slack" : "Discord"} webhook URL missing`,
            detail: isConfigured
              ? `Delivered test notification payload to ${url}.`
              : "Please enter a valid webhook endpoint starting with https://.",
            channel: "System",
            category: "Webhook",
            statusBadge: isConfigured ? "200 OK" : "Missing URL",
            severity: isConfigured ? "success" : "warning",
            showToast: true,
          },
        })
      );
    }, 600);
  }

  return (
    <div className="space-y-8 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-entry">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Settings &amp; Preferences
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your store identity, currency, sync automation rules, and notifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => handleSavePreferences()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* Confirmation Banner */}
      {saveBanner && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-3 flex items-center justify-between gap-3 text-xs text-emerald-800 animate-entry"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveBanner}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-mono">
            {prefs.lastSavedAt}
          </span>
        </div>
      )}

      {/* 2-Column Clean Settings Sections */}
      <form onSubmit={handleSavePreferences} className="space-y-8">
        {/* SECTION 1: GENERAL INFORMATION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/80 first:border-0 first:pt-0">
          <div className="md:col-span-1 space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              General Information
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Store name, support contact, and primary fulfillment center details.
            </p>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
            <div>
              <label
                htmlFor="store-name-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Storefront Name
              </label>
              <input
                id="store-name-input"
                type="text"
                value={prefs.storeName}
                onChange={(e) => updateField("storeName", e.target.value)}
                placeholder="OmniSync Flagship"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="support-email-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Escalation Email
              </label>
              <input
                id="support-email-input"
                type="email"
                value={prefs.supportEmail}
                onChange={(e) => updateField("supportEmail", e.target.value)}
                placeholder="ops@omnisync.io"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="warehouse-region-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Primary Fulfillment Hub
              </label>
              <input
                id="warehouse-region-input"
                type="text"
                value={prefs.warehouseRegion}
                onChange={(e) => updateField("warehouseRegion", e.target.value)}
                placeholder="US-East (Newark Fulfillment Hub)"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: LOCALIZATION & CURRENCY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/80">
          <div className="md:col-span-1 space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Localization &amp; Currency
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select settlement currency and the timezone used for order timestamps.
            </p>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
            <div>
              <label
                htmlFor="currency-select"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Settlement &amp; Reporting Currency
              </label>
              <select
                id="currency-select"
                value={prefs.currency}
                onChange={(e) =>
                  updateField("currency", e.target.value as CurrencyCode)
                }
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all cursor-pointer"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="timezone-select"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                System Time Zone
              </label>
              <select
                id="timezone-select"
                value={prefs.timeZone}
                onChange={(e) => updateField("timeZone", e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all cursor-pointer"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: INVENTORY SYNC RULES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/80">
          <div className="md:col-span-1 space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Inventory Sync Rules
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rules governing automatic stock rebalancing across channels and threshold alerts.
            </p>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
            {/* Auto-rebalancing toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <label
                  htmlFor="auto-rebalancing-toggle"
                  className="text-xs sm:text-sm font-medium text-slate-900 cursor-pointer"
                >
                  Auto-Inventory Rebalancing
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically rebalance unit allocations when orders arrive on any connected channel.
                </p>
              </div>
              <Toggle
                id="auto-rebalancing-toggle"
                checked={prefs.autoInventoryRebalancing}
                onChange={(val) => updateField("autoInventoryRebalancing", val)}
              />
            </div>

            {/* Low stock threshold */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="low-stock-input"
                  className="text-xs sm:text-sm font-medium text-slate-900"
                >
                  Low-Stock Alert Threshold
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Highlight SKUs with total stock below this number of units.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="low-stock-input"
                  type="number"
                  min="1"
                  max="500"
                  value={prefs.lowStockThreshold}
                  onChange={(e) =>
                    updateField(
                      "lowStockThreshold",
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                  className="w-20 px-3 py-1.5 text-xs text-right bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                />
                <span className="text-xs text-slate-500">units</span>
              </div>
            </div>

            {/* Buffer units */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="buffer-units-input"
                  className="text-xs sm:text-sm font-medium text-slate-900"
                >
                  Safety Stock Buffer
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reserved unallocated inventory buffer to prevent overselling.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="buffer-units-input"
                  type="number"
                  min="0"
                  max="100"
                  value={prefs.rebalanceBufferUnits}
                  onChange={(e) =>
                    updateField(
                      "rebalanceBufferUnits",
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                  }
                  className="w-20 px-3 py-1.5 text-xs text-right bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                />
                <span className="text-xs text-slate-500">units</span>
              </div>
            </div>

            {/* Auto archive days */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="archive-days-input"
                  className="text-xs sm:text-sm font-medium text-slate-900"
                >
                  Auto-Archive Window
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Days after delivery before completed orders move to archive.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="archive-days-input"
                  type="number"
                  min="7"
                  max="365"
                  value={prefs.autoArchiveFulfilledDays}
                  onChange={(e) =>
                    updateField(
                      "autoArchiveFulfilledDays",
                      Math.max(7, parseInt(e.target.value) || 30)
                    )
                  }
                  className="w-20 px-3 py-1.5 text-xs text-right bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                />
                <span className="text-xs text-slate-500">days</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: NOTIFICATION WEBHOOKS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/80">
          <div className="md:col-span-1 space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Notification Webhooks
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Send automated operational alerts and low stock warnings to your team's Slack or Discord.
            </p>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
            {/* Slack webhook */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="slack-url-input"
                  className="text-xs sm:text-sm font-medium text-slate-900"
                >
                  Slack Incoming Webhook
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestWebhook("slack")}
                    disabled={testingTarget === "slack"}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>Test</span>
                  </button>
                  <Toggle
                    checked={prefs.slackEnabled}
                    onChange={(val) => updateField("slackEnabled", val)}
                  />
                </div>
              </div>
              <input
                id="slack-url-input"
                type="url"
                value={prefs.slackWebhookUrl}
                onChange={(e) => updateField("slackWebhookUrl", e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
              />
            </div>

            {/* Discord webhook */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="discord-url-input"
                  className="text-xs sm:text-sm font-medium text-slate-900"
                >
                  Discord Webhook
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestWebhook("discord")}
                    disabled={testingTarget === "discord"}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>Test</span>
                  </button>
                  <Toggle
                    checked={prefs.discordEnabled}
                    onChange={(val) => updateField("discordEnabled", val)}
                  />
                </div>
              </div>
              <input
                id="discord-url-input"
                type="url"
                value={prefs.discordWebhookUrl}
                onChange={(e) => updateField("discordWebhookUrl", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
              />
            </div>

            {/* Event trigger toggles */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-700">Alert Triggers</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.notifyOnSyncFailure}
                    onChange={(e) =>
                      updateField("notifyOnSyncFailure", e.target.checked)
                    }
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 cursor-pointer"
                  />
                  <span>Dispatch alert on channel sync failure or webhook timeout</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.notifyOnLowStock}
                    onChange={(e) =>
                      updateField("notifyOnLowStock", e.target.checked)
                    }
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 cursor-pointer"
                  />
                  <span>Dispatch alert when any SKU crosses the low-stock threshold</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Last saved: {prefs.lastSavedAt}</span>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
