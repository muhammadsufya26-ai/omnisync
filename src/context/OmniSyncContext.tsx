"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  INITIAL_MOCK_ORDERS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INTEGRATIONS_LIST,
  DEFAULT_SETTINGS_PREFERENCES,
  INITIAL_DASHBOARD_ACTIVITIES,
  INITIAL_TEAM_MEMBERS,
  ROLE_PERMISSIONS_MAP,
  type Channel,
  type LocalizedChannelLabel,
  type OrderStatus,
  type CourierPartner,
  type OrderedItem,
  type OrderRecord,
  type InventoryCategory,
  type StockHealthStatus,
  type ChannelAllocations,
  type InventoryItem,
  type MarketplaceId,
  type ConnectionStatus,
  type SyncInterval,
  type ChannelCredentials,
  type MarketplaceIntegration,
  type CurrencyCode,
  type ThemePreference,
  type DensityPreference,
  type OmniSyncSettingsPreferences,
  type DashboardChannelName,
  type ActivityCategory,
  type DashboardActivityEvent,
  type UserRole,
  type RolePermissions,
  type TeamMember,
} from "@/lib/mockData";

export {
  INITIAL_MOCK_ORDERS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INTEGRATIONS_LIST,
  DEFAULT_SETTINGS_PREFERENCES,
  INITIAL_DASHBOARD_ACTIVITIES,
  INITIAL_TEAM_MEMBERS,
  ROLE_PERMISSIONS_MAP,
  type Channel,
  type LocalizedChannelLabel,
  type OrderStatus,
  type CourierPartner,
  type OrderedItem,
  type OrderRecord,
  type InventoryCategory,
  type StockHealthStatus,
  type ChannelAllocations,
  type InventoryItem,
  type MarketplaceId,
  type ConnectionStatus,
  type SyncInterval,
  type ChannelCredentials,
  type MarketplaceIntegration,
  type CurrencyCode,
  type ThemePreference,
  type DensityPreference,
  type OmniSyncSettingsPreferences,
  type DashboardChannelName,
  type ActivityCategory,
  type DashboardActivityEvent,
  type UserRole,
  type RolePermissions,
  type TeamMember,
};

export const STORAGE_KEYS = {
  orders: "omnisync_shared_orders_v2",
  inventory: "omnisync_shared_inventory_v2",
  integrations: "omnisync_channel_integrations_v2",
  settings: "omnisync_settings_preferences_v2",
  activities: "omnisync_dashboard_activities_v2",
  role: "omnisync_active_role_v2",
  team: "omnisync_team_members_v2",
} as const;

// Subtle Web Audio API notification chime for incoming real-time webhook orders
function playOrderWebhookChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // Ignore if browser autoplay policy blocks Web Audio before interaction
  }
}

export interface OrderFulfillmentUpdate {
  courierPartner?: CourierPartner;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

interface OmniSyncContextValue {
  orders: OrderRecord[];
  setOrders: React.Dispatch<React.SetStateAction<OrderRecord[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  integrations: MarketplaceIntegration[];
  setIntegrations: React.Dispatch<
    React.SetStateAction<MarketplaceIntegration[]>
  >;
  settings: OmniSyncSettingsPreferences;
  setSettings: React.Dispatch<
    React.SetStateAction<OmniSyncSettingsPreferences>
  >;
  activities: DashboardActivityEvent[];
  setActivities: React.Dispatch<React.SetStateAction<DashboardActivityEvent[]>>;

  // RBAC & Team Management
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  permissions: RolePermissions;
  teamMembers: TeamMember[];
  inviteTeamMember: (input: {
    name: string;
    email: string;
    role: UserRole;
    department: string;
  }) => TeamMember;
  updateTeamMemberRole: (memberId: string, role: UserRole) => void;
  removeTeamMember: (memberId: string) => void;

  // SSE Connection Status
  sseConnected: boolean;
  hasHydrated: boolean;

  // High-level synchronized actions
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    fulfillment?: OrderFulfillmentUpdate
  ) => Promise<void>;
  bulkUpdateOrderStatus: (
    orderIds: string[],
    status: OrderStatus
  ) => Promise<void>;
  triggerChannelOrdersSync: () => Promise<OrderRecord[]>;
  triggerSignedWebhookOrder: (preferredChannel?: Channel) => Promise<OrderRecord | null>;
  adjustInventoryStock: (itemId: string, delta: number) => Promise<void>;
  updateInventoryAllocations: (
    itemId: string,
    allocations: ChannelAllocations
  ) => Promise<void>;
  pushAllInventoryStock: () => Promise<void>;
  recordActivity: (
    event: Omit<DashboardActivityEvent, "id" | "timestamp">
  ) => void;
}

const OmniSyncContext = createContext<OmniSyncContextValue | undefined>(
  undefined
);

export function OmniSyncProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_MOCK_ORDERS);
  const [inventory, setInventory] = useState<InventoryItem[]>(
    INITIAL_INVENTORY_ITEMS
  );
  const [integrations, setIntegrations] = useState<MarketplaceIntegration[]>(
    INITIAL_INTEGRATIONS_LIST
  );
  const [settings, setSettings] = useState<OmniSyncSettingsPreferences>(
    DEFAULT_SETTINGS_PREFERENCES
  );
  const [activities, setActivities] = useState<DashboardActivityEvent[]>(
    INITIAL_DASHBOARD_ACTIVITIES
  );
  const [currentRole, setCurrentRoleState] = useState<UserRole>("OWNER");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    INITIAL_TEAM_MEMBERS
  );
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  const permissions = ROLE_PERMISSIONS_MAP[currentRole];

  // Hydrate all shared state slices from localStorage on client mount
  useEffect(() => {
    try {
      const savedOrders = window.localStorage.getItem(STORAGE_KEYS.orders);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders) as OrderRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
        }
      }

      const savedInventory = window.localStorage.getItem(
        STORAGE_KEYS.inventory
      );
      if (savedInventory) {
        const parsed = JSON.parse(savedInventory) as InventoryItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInventory(parsed);
        }
      }

      const savedIntegrations = window.localStorage.getItem(
        STORAGE_KEYS.integrations
      );
      if (savedIntegrations) {
        const parsed = JSON.parse(
          savedIntegrations
        ) as MarketplaceIntegration[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIntegrations(parsed);
        }
      }

      const savedSettings = window.localStorage.getItem(STORAGE_KEYS.settings);
      if (savedSettings) {
        const parsed = JSON.parse(
          savedSettings
        ) as Partial<OmniSyncSettingsPreferences>;
        if (parsed && typeof parsed === "object") {
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      }

      const savedActivities = window.localStorage.getItem(
        STORAGE_KEYS.activities
      );
      if (savedActivities) {
        const parsed = JSON.parse(savedActivities) as DashboardActivityEvent[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActivities(parsed);
        }
      }

      const savedRole = window.localStorage.getItem(
        STORAGE_KEYS.role
      ) as UserRole | null;
      if (
        savedRole &&
        (savedRole === "OWNER" ||
          savedRole === "WAREHOUSE" ||
          savedRole === "SUPPORT" ||
          savedRole === "VIEWER")
      ) {
        setCurrentRoleState(savedRole);
      }

      const savedTeam = window.localStorage.getItem(STORAGE_KEYS.team);
      if (savedTeam) {
        const parsed = JSON.parse(savedTeam) as TeamMember[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeamMembers(parsed);
        }
      }
    } catch {
      // Ignore localStorage parse errors
    } finally {
      setHasHydrated(true);
    }
  }, []);

  // Persist slices to localStorage whenever they change after hydration
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
    } catch {
      // Ignore storage error
    }
  }, [orders, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.inventory,
        JSON.stringify(inventory)
      );
    } catch {
      // Ignore storage error
    }
  }, [inventory, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.integrations,
        JSON.stringify(integrations)
      );
    } catch {
      // Ignore storage error
    }
  }, [integrations, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(settings)
      );
    } catch {
      // Ignore storage error
    }
  }, [settings, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.activities,
        JSON.stringify(activities)
      );
    } catch {
      // Ignore storage error
    }
  }, [activities, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.role, currentRole);
    } catch {
      // Ignore storage error
    }
  }, [currentRole, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.team,
        JSON.stringify(teamMembers)
      );
    } catch {
      // Ignore storage error
    }
  }, [teamMembers, hasHydrated]);

  const recordActivity = useCallback(
    (event: Omit<DashboardActivityEvent, "id" | "timestamp">) => {
      const nextEvt: DashboardActivityEvent = {
        ...event,
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: "Just now",
      };
      setActivities((prev) => [nextEvt, ...prev.slice(0, 14)]);
    },
    []
  );

  // Connect to Server-Sent Events (/api/events) for live real-time webhook pushes
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const es = new EventSource("/api/events");

    es.addEventListener("connected", () => {
      setSseConnected(true);
    });

    es.addEventListener("webhook_order", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as {
          order?: OrderRecord;
          message?: string;
        };
        const incomingOrder = parsed.order;
        if (!incomingOrder) return;

        playOrderWebhookChime();

        setOrders((prev) => {
          if (prev.some((o) => o.id === incomingOrder.id)) {
            return prev;
          }
          return [incomingOrder, ...prev];
        });

        recordActivity({
          category: "order",
          title: `New order #${incomingOrder.id} received from ${incomingOrder.channelDisplay || incomingOrder.channel}`,
          subtitle: `${incomingOrder.customer} • Rs. ${incomingOrder.amount.toLocaleString("en-US")} (HMAC-SHA256 Verified)`,
          channel: incomingOrder.channel,
        });

        window.dispatchEvent(
          new CustomEvent("omnisync:audit-log", {
            detail: {
              title: `New order #${incomingOrder.id} received from ${incomingOrder.channelDisplay || incomingOrder.channel}`,
              detail: `HMAC-SHA256 signature verified (200 OK). Customer: ${
                incomingOrder.customer
              } (Rs. ${incomingOrder.amount.toLocaleString("en-US")}).`,
              channel: incomingOrder.channel,
              category: "Webhook",
              statusBadge: "200 OK • SSE",
              severity: "success",
              showToast: true,
            },
          })
        );
      } catch {
        // Ignore malformed event data
      }
    });

    es.addEventListener("cron_sync", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as {
          message?: string;
        };
        window.dispatchEvent(
          new CustomEvent("omnisync:audit-log", {
            detail: {
              title: "Automated background cron sync completed",
              detail:
                parsed.message ??
                "Reconciled multi-channel stock pools and pruned stale audit logs.",
              channel: "System",
              category: "Automation",
              statusBadge: "Cron • 200 OK",
              severity: "info",
              showToast: true,
            },
          })
        );
      } catch {
        // Ignore malformed event data
      }
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
    };
  }, [recordActivity]);

  const setCurrentRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("omnisync:audit-log", {
          detail: {
            title: `Active RBAC role switched to ${role}`,
            detail: ROLE_PERMISSIONS_MAP[role].description,
            channel: "System",
            category: "System",
            statusBadge: `RBAC: ${role}`,
            severity: "info",
            showToast: true,
          },
        })
      );
    }
  }, []);

  const inviteTeamMember = useCallback(
    (input: {
      name: string;
      email: string;
      role: UserRole;
      department: string;
    }): TeamMember => {
      const created: TeamMember = {
        id: `usr-${Date.now()}`,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        department: input.department.trim() || "Operations",
        status: "Invited",
        joinedAt: new Date().toISOString().slice(0, 10),
        lastActive: "Invitation sent",
      };
      setTeamMembers((prev) => [created, ...prev]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("omnisync:audit-log", {
            detail: {
              title: `Invited team member ${created.email} (${created.role})`,
              detail: `RBAC invitation dispatched for ${created.name} in ${created.department}.`,
              channel: "System",
              category: "System",
              statusBadge: `Role: ${created.role}`,
              severity: "success",
              showToast: true,
            },
          })
        );
      }

      return created;
    },
    []
  );

  const updateTeamMemberRole = useCallback(
    (memberId: string, role: UserRole) => {
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      );
    },
    []
  );

  const removeTeamMember = useCallback((memberId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  // Update a single order's status & optional courier/tracking details
  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: OrderStatus,
      fulfillment?: OrderFulfillmentUpdate
    ) => {
      if (!ROLE_PERMISSIONS_MAP[currentRole].canUpdateOrderStatus) {
        return;
      }

      let targetOrder: OrderRecord | undefined;

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            targetOrder = order;
            return {
              ...order,
              status,
              ...(fulfillment?.courierPartner
                ? { courierPartner: fulfillment.courierPartner }
                : {}),
              ...(fulfillment?.trackingNumber
                ? { trackingNumber: fulfillment.trackingNumber }
                : {}),
              ...(fulfillment?.estimatedDelivery
                ? { estimatedDelivery: fulfillment.estimatedDelivery }
                : {}),
            };
          }
          return order;
        })
      );

      if (targetOrder) {
        const courierNote = fulfillment?.courierPartner
          ? ` via ${fulfillment.courierPartner} (${
              fulfillment.trackingNumber ?? "AWB Assigned"
            })`
          : "";
        recordActivity({
          category: "order",
          title: `Order #${orderId} marked as ${status}${courierNote}`,
          subtitle: `${targetOrder.customer} • Rs. ${targetOrder.amount.toLocaleString("en-US")} (${targetOrder.channelDisplay || targetOrder.channel})`,
          channel: targetOrder.channel,
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("omnisync:audit-log", {
            detail: {
              title: `Order #${orderId} status updated -> ${status}`,
              detail: fulfillment?.courierPartner
                ? `TCS/Courier Airway bill generated for Order #${orderId} via ${fulfillment.courierPartner} (Tracking: ${fulfillment.trackingNumber}).`
                : `Synchronized fulfillment state (${status}) back to ${
                    targetOrder?.channelDisplay ?? targetOrder?.channel ?? "Storefront"
                  } webhook endpoint.`,
              channel: targetOrder?.channel ?? "Shopify",
              category: "Webhook",
              statusBadge: "200 OK",
              severity: status === "Cancelled" ? "warning" : "success",
              showToast: false,
            },
          })
        );
      }

      try {
        await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: orderId,
            status,
            ...fulfillment,
          }),
        });
      } catch {
        // Fallback to local state if offline
      }
    },
    [currentRole, recordActivity]
  );

  // Bulk update order statuses
  const bulkUpdateOrderStatus = useCallback(
    async (orderIds: string[], status: OrderStatus) => {
      if (
        orderIds.length === 0 ||
        !ROLE_PERMISSIONS_MAP[currentRole].canUpdateOrderStatus
      ) {
        return;
      }
      const targetSet = new Set(orderIds);

      setOrders((prev) =>
        prev.map((order) =>
          targetSet.has(order.id) ? { ...order, status } : order
        )
      );

      recordActivity({
        category: "order",
        title: `Batch updated ${orderIds.length} orders to ${status}`,
        subtitle: `IDs: ${orderIds.slice(0, 3).join(", ")}${
          orderIds.length > 3 ? "..." : ""
        }`,
        channel: "Shopify",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("omnisync:audit-log", {
            detail: {
              title: `Batch status update (${orderIds.length} orders -> ${status})`,
              detail: `Pushed fulfillment batch update for ${orderIds.join(
                ", "
              )} across connected channels.`,
              channel: "System",
              category: "Webhook",
              statusBadge: "200 OK",
              severity: status === "Cancelled" ? "warning" : "success",
              showToast: false,
            },
          })
        );
      }

      try {
        await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: orderIds, status }),
        });
      } catch {
        // Fallback to local state
      }
    },
    [currentRole, recordActivity]
  );

  // Trigger a signed HMAC-SHA256 webhook order to /api/webhooks/orders (broadcasts over SSE)
  const triggerSignedWebhookOrder = useCallback(
    async (preferredChannel?: Channel): Promise<OrderRecord | null> => {
      const sampleTemplates: Array<{
        customer: string;
        customerEmail: string;
        customerPhone: string;
        city: string;
        shippingAddress: string;
        channel: Channel;
        channelDisplay: LocalizedChannelLabel;
        channelNote: string;
        courierPartner: CourierPartner;
        rtoRiskScore: number;
        rtoRiskLevel: "HIGH" | "MODERATE" | "LOW";
        rtoRiskReason: string;
        items: OrderedItem[];
      }> = [
        {
          customer: "Saad Javed",
          customerEmail: "saad.javed.isb@example.com",
          customerPhone: "+92 300 8821904",
          city: "Islamabad",
          shippingAddress: "House #14, Street 3, Sector G-11/2, Islamabad",
          channel: preferredChannel ?? "Shopify",
          channelDisplay: "WhatsApp",
          channelNote: "Ordered via direct DM voice note confirmation",
          courierPartner: "TCS Express",
          rtoRiskScore: 14,
          rtoRiskLevel: "LOW",
          rtoRiskReason:
            "Verified Sector G-11/2 house address • Repeat WhatsApp buyer.",
          items: [
            {
              sku: "OS-AUD-101",
              name: "AeroPods Pro ANC Wireless Earbuds",
              quantity: 1,
              price: 3450,
            },
          ],
        },
        {
          customer: "Noman Butt",
          customerEmail: "noman.butt.grw@example.com",
          customerPhone: "0321-7740192",
          city: "Gujranwala",
          shippingAddress: "Main GT Road near Bus Stand, Gujranwala",
          channel: preferredChannel ?? "Etsy",
          channelDisplay: "Instagram DM",
          channelNote: "Sale campaign: Winter drop",
          courierPartner: "Trax Logistics",
          rtoRiskScore: 82,
          rtoRiskLevel: "HIGH",
          rtoRiskReason:
            "Previous parcel returned undelivered in Gujranwala • Incomplete house number detected.",
          items: [
            {
              sku: "OS-WTC-800",
              name: "Chronos Fit AMOLED Titanium Smartwatch",
              quantity: 1,
              price: 6850,
            },
          ],
        },
        {
          customer: "Hira Salman",
          customerEmail: "hira.salman.khi@example.com",
          customerPhone: "+92 334 5501928",
          city: "Karachi",
          shippingAddress: "Flat 4B, Gulshan-e-Iqbal Block 13D, Karachi",
          channel: preferredChannel ?? "Amazon",
          channelDisplay: "Daraz Store",
          channelNote: "Daraz Mall order sync",
          courierPartner: "Leopards Courier",
          rtoRiskScore: 11,
          rtoRiskLevel: "LOW",
          rtoRiskReason:
            "Daraz Mall verified buyer • Complete Block 13D apartment address.",
          items: [
            {
              sku: "OS-PWR-302",
              name: "VoltMax 20000mAh 65W PD Power Bank",
              quantity: 1,
              price: 4200,
            },
          ],
        },
      ];

      const chosen =
        sampleTemplates[Math.floor(Math.random() * sampleTemplates.length)];
      const nextIdNum = 1050 + orders.length + Math.floor(Math.random() * 40);

      try {
        const res = await fetch("/api/webhooks/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-omnisync-internal-sim": "omnisync-ui-sim",
          },
          body: JSON.stringify({
            orderId: `OMS-${nextIdNum}`,
            customer: chosen.customer,
            customerEmail: chosen.customerEmail,
            customerPhone: chosen.customerPhone,
            city: chosen.city,
            shippingAddress: chosen.shippingAddress,
            channel: chosen.channel,
            channelDisplay: chosen.channelDisplay,
            channelNote: chosen.channelNote,
            status: "Pending",
            courierPartner: chosen.courierPartner,
            rtoRiskScore: chosen.rtoRiskScore,
            rtoRiskLevel: chosen.rtoRiskLevel,
            rtoRiskReason: chosen.rtoRiskReason,
            items: chosen.items,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as { order?: OrderRecord };
          if (data.order) {
            const ord = data.order;
            setOrders((prev) =>
              prev.some((o) => o.id === ord.id) ? prev : [ord, ...prev]
            );
            return ord;
          }
        }
      } catch {
        // Fallback if offline
      }

      return null;
    },
    [orders.length]
  );

  // Trigger Webhook Order Sync via POST /api/orders
  const triggerChannelOrdersSync = useCallback(async (): Promise<
    OrderRecord[]
  > => {
    let syncedOrders: OrderRecord[] = [];

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "webhook_sync",
          existingCount: orders.length,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          syncedOrders?: OrderRecord[];
        };
        if (Array.isArray(data.syncedOrders) && data.syncedOrders.length > 0) {
          syncedOrders = data.syncedOrders;
        }
      }
    } catch {
      // Fallback if fetch fails
    }

    if (syncedOrders.length === 0) {
      const single = await triggerSignedWebhookOrder();
      if (single) {
        return [single];
      }
    }

    const enrichedOrders = syncedOrders.map((ord) => ({
      ...ord,
      courierPartner:
        ord.courierPartner ?? ("TCS Express" as CourierPartner),
      trackingNumber:
        ord.trackingNumber ??
        `TCS-77${ord.id.replace(/[^0-9]/g, "") || "1050"}48`,
      estimatedDelivery: ord.estimatedDelivery ?? "Oct 10, 2026",
    }));

    playOrderWebhookChime();

    setOrders((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      const uniqueNew = enrichedOrders.filter((o) => !existingIds.has(o.id));
      return [...uniqueNew, ...prev];
    });

    for (const ord of enrichedOrders) {
      recordActivity({
        category: "order",
        title: `New order #${ord.id} received from ${ord.channelDisplay || ord.channel}`,
        subtitle: `${ord.customer} • Rs. ${ord.amount.toLocaleString("en-US")} (${
          ord.items[0]?.name ?? "Multi-item"
        })`,
        channel: ord.channel,
      });
    }

    if (typeof window !== "undefined" && enrichedOrders.length > 0) {
      const first = enrichedOrders[0];
      window.dispatchEvent(
        new CustomEvent("omnisync:audit-log", {
          detail: {
            title: `New order #${first.id} received from ${first.channelDisplay || first.channel}`,
            detail: `Ingested ${enrichedOrders.length} new order(s): ${enrichedOrders
              .map((o) => `${o.id} (Rs. ${o.amount.toLocaleString("en-US")})`)
              .join(", ")}.`,
            channel: first.channel,
            category: "Webhook",
            statusBadge: "200 OK",
            severity: "success",
            showToast: true,
          },
        })
      );
    }

    return enrichedOrders;
  }, [orders.length, recordActivity, triggerSignedWebhookOrder]);

  // Inline Stock Adjustment backed by PATCH /api/inventory
  const adjustInventoryStock = useCallback(
    async (itemId: string, delta: number) => {
      if (!ROLE_PERMISSIONS_MAP[currentRole].canReassignStock) {
        return;
      }

      const target = inventory.find((i) => i.id === itemId);
      if (!target) return;

      const currentTotal =
        target.allocations.Shopify +
        target.allocations.Amazon +
        target.allocations.Etsy;
      if (currentTotal + delta < 0) return;

      const nextAllocations: ChannelAllocations = { ...target.allocations };
      if (delta > 0) {
        nextAllocations.Shopify += delta;
      } else {
        let remainingToRemove = Math.abs(delta);
        const channels: Array<keyof ChannelAllocations> = [
          "Shopify",
          "Amazon",
          "Etsy",
        ];
        for (const ch of channels) {
          if (remainingToRemove <= 0) break;
          const deduct = Math.min(nextAllocations[ch], remainingToRemove);
          nextAllocations[ch] -= deduct;
          remainingToRemove -= deduct;
        }
      }

      const newTotal =
        nextAllocations.Shopify +
        nextAllocations.Amazon +
        nextAllocations.Etsy;

      setInventory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                allocations: nextAllocations,
                lastPushedAt: "Just now",
              }
            : item
        )
      );

      recordActivity({
        category: "inventory",
        title: `Stock updated for ${target.sku} (${newTotal} units)`,
        subtitle: `Shopify: ${nextAllocations.Shopify}, Amazon: ${nextAllocations.Amazon}, Etsy: ${nextAllocations.Etsy}`,
        channel: "Shopify",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("omnisync:audit-log", {
            detail: {
              title: `Stock level adjustment pushed (${target.sku})`,
              detail: `Total stock adjusted to ${newTotal} units (Shopify: ${nextAllocations.Shopify}, Amazon: ${nextAllocations.Amazon}, Etsy: ${nextAllocations.Etsy}).`,
              channel: "Shopify",
              category: "Stock Push",
              statusBadge: "Pushed • 200 OK",
              severity:
                newTotal < settings.lowStockThreshold ? "warning" : "info",
              showToast: false,
            },
          })
        );
      }

      try {
        await fetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: itemId,
            sku: target.sku,
            allocations: nextAllocations,
          }),
        });
      } catch {
        // Fallback to local state
      }
    },
    [currentRole, inventory, recordActivity, settings.lowStockThreshold]
  );

  // Update Channel Allocations for an Inventory Item backed by PATCH /api/inventory
  const updateInventoryAllocations = useCallback(
    async (itemId: string, allocations: ChannelAllocations) => {
      if (!ROLE_PERMISSIONS_MAP[currentRole].canReassignStock) {
        return;
      }

      const target = inventory.find((i) => i.id === itemId);
      if (!target) return;

      const sanitized: ChannelAllocations = {
        Shopify: Math.max(0, Math.floor(Number(allocations.Shopify) || 0)),
        Amazon: Math.max(0, Math.floor(Number(allocations.Amazon) || 0)),
        Etsy: Math.max(0, Math.floor(Number(allocations.Etsy) || 0)),
      };
      const newTotal =
        sanitized.Shopify + sanitized.Amazon + sanitized.Etsy;

      setInventory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                allocations: sanitized,
                lastPushedAt: "Just now",
              }
            : item
        )
      );

      recordActivity({
        category: "inventory",
        title: `Reallocated ${target.sku} across channels (${newTotal} units)`,
        subtitle: `Shopify: ${sanitized.Shopify} • Amazon: ${sanitized.Amazon} • Etsy: ${sanitized.Etsy}`,
        channel: "Amazon",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("omnisync:audit-log", {
            detail: {
              title: `Channel allocation pushed (${target.sku})`,
              detail: `Synced ${newTotal} units -> Shopify: ${sanitized.Shopify}, Amazon: ${sanitized.Amazon}, Etsy: ${sanitized.Etsy}.`,
              channel: "Amazon",
              category: "Stock Push",
              statusBadge: "Pushed • 3 Channels",
              severity: "info",
              showToast: false,
            },
          })
        );
      }

      try {
        await fetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: itemId,
            sku: target.sku,
            allocations: sanitized,
          }),
        });
      } catch {
        // Fallback to local state
      }
    },
    [currentRole, inventory, recordActivity]
  );

  // Push all inventory items across channels
  const pushAllInventoryStock = useCallback(async () => {
    if (!ROLE_PERMISSIONS_MAP[currentRole].canReassignStock) {
      return;
    }

    setInventory((prev) =>
      prev.map((item) => ({
        ...item,
        lastPushedAt: "Just now",
      }))
    );

    recordActivity({
      category: "inventory",
      title: `Full catalog stock push (${inventory.length} SKUs)`,
      subtitle:
        "Synchronized inventory allocations across Shopify, Amazon & Etsy",
      channel: "Shopify",
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("omnisync:audit-log", {
          detail: {
            title: `Bulk stock level adjustment pushed (${inventory.length} SKUs)`,
            detail:
              "All SKU channel allocations verified and pushed to Shopify, Amazon Seller Central, and Etsy.",
            channel: "System",
            category: "Stock Push",
            statusBadge: "Synced • 100%",
            severity: "success",
            showToast: true,
          },
        })
      );
    }

    try {
      await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push_all" }),
      });
    } catch {
      // Ignore offline error
    }
  }, [currentRole, inventory.length, recordActivity]);

  return (
    <OmniSyncContext.Provider
      value={{
        orders,
        setOrders,
        inventory,
        setInventory,
        integrations,
        setIntegrations,
        settings,
        setSettings,
        activities,
        setActivities,
        currentRole,
        setCurrentRole,
        permissions,
        teamMembers,
        inviteTeamMember,
        updateTeamMemberRole,
        removeTeamMember,
        sseConnected,
        hasHydrated,
        updateOrderStatus,
        bulkUpdateOrderStatus,
        triggerChannelOrdersSync,
        triggerSignedWebhookOrder,
        adjustInventoryStock,
        updateInventoryAllocations,
        pushAllInventoryStock,
        recordActivity,
      }}
    >
      {children}
    </OmniSyncContext.Provider>
  );
}

export function useOmniSync(): OmniSyncContextValue {
  const ctx = useContext(OmniSyncContext);
  if (!ctx) {
    throw new Error("useOmniSync must be used within an OmniSyncProvider");
  }
  return ctx;
}
