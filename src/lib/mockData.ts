// Shared TypeScript interfaces and localized Pakistani D2C seed data for Server Route Handlers and Client Context

export type Channel = "Shopify" | "Amazon" | "Etsy";
export type LocalizedChannelLabel =
  | "WhatsApp"
  | "Instagram DM"
  | "Daraz Store"
  | "Online Store";
export type OrderStatus = "Pending" | "Shipped" | "Delivered" | "Cancelled";
export type CourierPartner =
  | "Trax Logistics"
  | "TCS Express"
  | "Leopards Courier"
  | "TCS"
  | "Leopards"
  | "DHL"
  | "FedEx"
  | "BlueEx";

export type UserRole = "OWNER" | "WAREHOUSE" | "SUPPORT" | "VIEWER";

export interface RolePermissions {
  role: UserRole;
  label: string;
  badgeColor: string;
  description: string;
  canViewFinancials: boolean;
  canManageIntegrations: boolean;
  canManageTeam: boolean;
  canUpdateOrderStatus: boolean;
  canReassignStock: boolean;
  canAccessDashboard: boolean;
  canAccessCustomers: boolean;
  canAccessSettings: boolean;
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, RolePermissions> = {
  OWNER: {
    role: "OWNER",
    label: "Owner (Full Access)",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    description:
      "Unrestricted access to Revenue KPIs, GMV, Integrations, API secret keys, CRM, and Team RBAC settings.",
    canViewFinancials: true,
    canManageIntegrations: true,
    canManageTeam: true,
    canUpdateOrderStatus: true,
    canReassignStock: true,
    canAccessDashboard: true,
    canAccessCustomers: true,
    canAccessSettings: true,
  },
  WAREHOUSE: {
    role: "WAREHOUSE",
    label: "Warehouse Ops",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    description:
      "Restricted exclusively to /orders and /inventory. Financial revenue stats, GMV, and API secret keys are hidden.",
    canViewFinancials: false,
    canManageIntegrations: false,
    canManageTeam: false,
    canUpdateOrderStatus: true,
    canReassignStock: true,
    canAccessDashboard: false,
    canAccessCustomers: false,
    canAccessSettings: false,
  },
  SUPPORT: {
    role: "SUPPORT",
    label: "Customer Support",
    badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    description:
      "Access to customer CRM profiles and order statuses with status update permissions; stock reassignment is blocked.",
    canViewFinancials: false,
    canManageIntegrations: false,
    canManageTeam: false,
    canUpdateOrderStatus: true,
    canReassignStock: false,
    canAccessDashboard: true,
    canAccessCustomers: true,
    canAccessSettings: false,
  },
  VIEWER: {
    role: "VIEWER",
    label: "Read-Only Viewer",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    description:
      "Read-only observer access across non-sensitive views. Cannot modify orders, stock, integrations, or team roles.",
    canViewFinancials: false,
    canManageIntegrations: false,
    canManageTeam: false,
    canUpdateOrderStatus: false,
    canReassignStock: false,
    canAccessDashboard: true,
    canAccessCustomers: true,
    canAccessSettings: false,
  },
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: "Active" | "Invited";
  joinedAt: string;
  lastActive: string;
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "usr-1",
    name: "Zainab Tariq",
    email: "owner@omnisync.com",
    role: "OWNER",
    department: "Executive Operations (Lahore Hub)",
    status: "Active",
    joinedAt: "2025-01-12",
    lastActive: "Online now",
  },
  {
    id: "usr-2",
    name: "Hamza Siddiqui",
    email: "hamza.warehouse@omnisync.io",
    role: "WAREHOUSE",
    department: "Dispatch & COD Fulfillment",
    status: "Active",
    joinedAt: "2025-04-08",
    lastActive: "6m ago",
  },
  {
    id: "usr-3",
    name: "Ayesha Malik",
    email: "ayesha.support@omnisync.io",
    role: "SUPPORT",
    department: "WhatsApp Verification & CX",
    status: "Active",
    joinedAt: "2025-06-19",
    lastActive: "18m ago",
  },
  {
    id: "usr-4",
    name: "Bilal Qureshi",
    email: "b.qureshi@omnisync.io",
    role: "VIEWER",
    department: "COD Reconciliation Audit",
    status: "Active",
    joinedAt: "2025-09-01",
    lastActive: "2h ago",
  },
];

export interface OrderedItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderRecord {
  id: string;
  customer: string;
  customerEmail: string;
  customerPhone?: string;
  city?: string;
  shippingAddress: string;
  channel: Channel;
  channelDisplay?: LocalizedChannelLabel;
  channelNote?: string;
  date: string;
  syncedAt: string;
  amount: number;
  status: OrderStatus;
  courierPartner?: CourierPartner;
  trackingNumber?: string;
  estimatedDelivery?: string;
  rtoRiskScore?: number;
  rtoRiskLevel?: "HIGH" | "MODERATE" | "LOW";
  rtoRiskReason?: string;
  previousOrdersCount?: number;
  items: OrderedItem[];
}

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

export type CurrencyCode = "USD" | "EUR" | "GBP" | "PKR";
export type ThemePreference = "dark-obsidian" | "midnight-contrast" | "system";
export type DensityPreference = "comfortable" | "compact";

export interface OmniSyncSettingsPreferences {
  storeName: string;
  supportEmail: string;
  warehouseRegion: string;
  currency: CurrencyCode;
  timeZone: string;
  themePreference: ThemePreference;
  densityPreference: DensityPreference;
  enableGlassEffects: boolean;
  autoInventoryRebalancing: boolean;
  rebalanceBufferUnits: number;
  lowStockThreshold: number;
  criticalHoldLastUnit: boolean;
  autoArchiveFulfilledDays: number;
  conflictResolutionMode: "marketplace_priority" | "newest_timestamp";
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

export type DashboardChannelName = "Shopify" | "Amazon" | "Etsy" | "eBay";
export type ActivityCategory = "order" | "inventory" | "webhook";

export interface DashboardActivityEvent {
  id: string;
  category: ActivityCategory;
  title: string;
  subtitle: string;
  channel: DashboardChannelName;
  timestamp: string;
}

export const INITIAL_MOCK_ORDERS: OrderRecord[] = [
  {
    id: "OMS-1049",
    customer: "Bilal Ahmed",
    customerEmail: "bilal.ahmed.grw@example.com",
    customerPhone: "+92 300 1234567",
    city: "Gujranwala",
    shippingAddress: "Near Gujranwala Bypass, Model Town, Gujranwala",
    channel: "Shopify",
    channelDisplay: "WhatsApp",
    channelNote: "Ordered via direct DM voice note confirmation",
    date: "2026-10-07",
    syncedAt: "Today • 14:18 PKT",
    amount: 3450,
    status: "Pending",
    courierPartner: "TCS Express",
    trackingNumber: "TCS-77291048",
    estimatedDelivery: "Oct 9, 2026",
    rtoRiskScore: 82,
    rtoRiskLevel: "HIGH",
    rtoRiskReason:
      "Previous parcel returned undelivered in Gujranwala • Incomplete house number detected.",
    previousOrdersCount: 4,
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
    id: "OMS-1048",
    customer: "Ayesha Malik",
    customerEmail: "ayesha.malik@example.com",
    customerPhone: "+92 333 5120987",
    city: "Karachi",
    shippingAddress: "Flat 4B, Gulshan-e-Iqbal Block 13D, Karachi",
    channel: "Etsy",
    channelDisplay: "Instagram DM",
    channelNote: "Sale campaign: Winter drop",
    date: "2026-10-07",
    syncedAt: "Today • 12:40 PKT",
    amount: 6850,
    status: "Shipped",
    courierPartner: "Trax Logistics",
    trackingNumber: "TRAX-PK-883921",
    estimatedDelivery: "Oct 9, 2026",
    rtoRiskScore: 12,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Verified Gulshan-e-Iqbal residence • 3 previous COD parcels delivered on first attempt.",
    previousOrdersCount: 4,
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
    id: "OMS-1047",
    customer: "Sana Farooq",
    customerEmail: "sana.farooq@example.com",
    customerPhone: "+92 301 7745210",
    city: "Islamabad",
    shippingAddress: "House #14, Street 3, Sector G-11/2, Islamabad",
    channel: "Amazon",
    channelDisplay: "Daraz Store",
    channelNote: "Daraz Mall order sync",
    date: "2026-10-06",
    syncedAt: "Yesterday • 19:05 PKT",
    amount: 6400,
    status: "Delivered",
    courierPartner: "Leopards Courier",
    trackingNumber: "LCS-9948210",
    estimatedDelivery: "Oct 7, 2026",
    rtoRiskScore: 9,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Complete Sector G-11/2 street & house number • Zero return history across 5 orders.",
    previousOrdersCount: 5,
    items: [
      {
        sku: "OS-AUD-101",
        name: "AeroPods Pro ANC Wireless Earbuds",
        quantity: 1,
        price: 3450,
      },
      {
        sku: "OS-HUB-510",
        name: "HyperPort 8-in-1 Dual 4K USB-C Hub",
        quantity: 1,
        price: 2950,
      },
    ],
  },
  {
    id: "OMS-1046",
    customer: "Hamza Siddiqui",
    customerEmail: "hamza.siddiqui.fsd@example.com",
    customerPhone: "0321-9981120",
    city: "Faisalabad",
    shippingAddress: "D-Ground Peoples Colony, Faisalabad",
    channel: "Shopify",
    channelDisplay: "WhatsApp",
    channelNote: "Ordered via direct DM voice note confirmation",
    date: "2026-10-06",
    syncedAt: "Yesterday • 16:50 PKT",
    amount: 11500,
    status: "Pending",
    courierPartner: "Leopards Courier",
    trackingNumber: "LCS-8821034",
    estimatedDelivery: "Oct 10, 2026",
    rtoRiskScore: 79,
    rtoRiskLevel: "HIGH",
    rtoRiskReason:
      "Previous parcel returned undelivered in Faisalabad • Missing house/plot number in D-Ground Peoples Colony.",
    previousOrdersCount: 3,
    items: [
      {
        sku: "OS-KBD-400",
        name: "KeyChronos 75% Hot-Swap Aluminum Keyboard",
        quantity: 1,
        price: 11500,
      },
    ],
  },
  {
    id: "OMS-1045",
    customer: "Usman Ghani",
    customerEmail: "usman.ghani.lhr@example.com",
    customerPhone: "0312-6654309",
    city: "Lahore",
    shippingAddress: "Main Boulevard, Johar Town Block G-3, Lahore",
    channel: "Etsy",
    channelDisplay: "Instagram DM",
    channelNote: "Sale campaign: Winter drop",
    date: "2026-10-06",
    syncedAt: "Yesterday • 14:22 PKT",
    amount: 4200,
    status: "Pending",
    courierPartner: "Trax Logistics",
    trackingNumber: "TRAX-PK-884102",
    estimatedDelivery: "Oct 10, 2026",
    rtoRiskScore: 64,
    rtoRiskLevel: "MODERATE",
    rtoRiskReason:
      "High-value COD order without exact plot number in Johar Town • Quick WhatsApp verification advised.",
    previousOrdersCount: 2,
    items: [
      {
        sku: "OS-PWR-302",
        name: "VoltMax 20000mAh 65W PD Power Bank",
        quantity: 1,
        price: 4200,
      },
    ],
  },
  {
    id: "OMS-1044",
    customer: "Zainab Tariq",
    customerEmail: "zainab.tariq@example.com",
    customerPhone: "+92 300 4119823",
    city: "Lahore",
    shippingAddress: "House 118, Phase 6, DHA, Street 9, Lahore",
    channel: "Shopify",
    channelDisplay: "Online Store",
    channelNote: "Direct Checkout",
    date: "2026-10-05",
    syncedAt: "Oct 5, 2026 • 21:10 PKT",
    amount: 8400,
    status: "Shipped",
    courierPartner: "TCS Express",
    trackingNumber: "TCS-77294410",
    estimatedDelivery: "Oct 8, 2026",
    rtoRiskScore: 8,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Verified DHA Phase 6 residence • Repeat VIP customer with 100% COD acceptance rate.",
    previousOrdersCount: 6,
    items: [
      {
        sku: "OS-PWR-302",
        name: "VoltMax 20000mAh 65W PD Power Bank",
        quantity: 2,
        price: 4200,
      },
    ],
  },
  {
    id: "OMS-1043",
    customer: "Fawad Qureshi",
    customerEmail: "fawad.q@example.com",
    customerPhone: "0345-8812094",
    city: "Rawalpindi",
    shippingAddress: "House #22-C, Satellite Town Block B, Rawalpindi",
    channel: "Amazon",
    channelDisplay: "Daraz Store",
    channelNote: "Daraz Mall order sync",
    date: "2026-10-05",
    syncedAt: "Oct 5, 2026 • 15:12 PKT",
    amount: 5900,
    status: "Delivered",
    courierPartner: "Leopards Courier",
    trackingNumber: "LCS-9942019",
    estimatedDelivery: "Oct 7, 2026",
    rtoRiskScore: 15,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Verified Satellite Town address • Delivered and signed on first courier attempt.",
    previousOrdersCount: 4,
    items: [
      {
        sku: "OS-HUB-510",
        name: "HyperPort 8-in-1 Dual 4K USB-C Hub",
        quantity: 2,
        price: 2950,
      },
    ],
  },
  {
    id: "OMS-1042",
    customer: "Kashif Raza",
    customerEmail: "kashif.raza.pew@example.com",
    customerPhone: "0315-0098211",
    city: "Gujranwala",
    shippingAddress: "Main GT Road Market near Flyover, Gujranwala",
    channel: "Etsy",
    channelDisplay: "Instagram DM",
    channelNote: "Sale campaign: Winter drop",
    date: "2026-10-04",
    syncedAt: "Oct 4, 2026 • 18:05 PKT",
    amount: 6850,
    status: "Cancelled",
    courierPartner: "TCS Express",
    trackingNumber: "TCS-77290014",
    estimatedDelivery: "Returned / RTO",
    rtoRiskScore: 86,
    rtoRiskLevel: "HIGH",
    rtoRiskReason:
      "Previous parcel returned undelivered in Gujranwala • Incomplete house number detected.",
    previousOrdersCount: 4,
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
    id: "OMS-1041",
    customer: "Ayesha Malik",
    customerEmail: "ayesha.malik@example.com",
    customerPhone: "+92 333 5120987",
    city: "Karachi",
    shippingAddress: "Flat 4B, Gulshan-e-Iqbal Block 13D, Karachi",
    channel: "Shopify",
    channelDisplay: "Online Store",
    channelNote: "Direct Checkout",
    date: "2026-10-03",
    syncedAt: "Oct 3, 2026 • 11:30 PKT",
    amount: 3450,
    status: "Delivered",
    courierPartner: "Trax Logistics",
    trackingNumber: "TRAX-PK-881044",
    estimatedDelivery: "Oct 5, 2026",
    rtoRiskScore: 10,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Repeat customer in Karachi • Complete apartment and block number verified.",
    previousOrdersCount: 4,
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
    id: "OMS-1040",
    customer: "Sana Farooq",
    customerEmail: "sana.farooq@example.com",
    customerPhone: "+92 301 7745210",
    city: "Islamabad",
    shippingAddress: "House #14, Street 3, Sector G-11/2, Islamabad",
    channel: "Shopify",
    channelDisplay: "WhatsApp",
    channelNote: "Ordered via direct DM voice note confirmation",
    date: "2026-10-02",
    syncedAt: "Oct 2, 2026 • 17:20 PKT",
    amount: 6300,
    status: "Delivered",
    courierPartner: "TCS Express",
    trackingNumber: "TCS-77289012",
    estimatedDelivery: "Oct 4, 2026",
    rtoRiskScore: 9,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Verified Islamabad residential address • Delivered on first attempt.",
    previousOrdersCount: 5,
    items: [
      {
        sku: "OS-DSK-118",
        name: "Walnut Mechanical Wrist Rest (75%)",
        quantity: 1,
        price: 2450,
      },
      {
        sku: "OS-CHG-115",
        name: "GaNPro 140W 4-Port Desktop Charger",
        quantity: 1,
        price: 3850,
      },
    ],
  },
];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: "inv-1",
    sku: "OS-AUD-101",
    name: "AeroPods Pro ANC Wireless Earbuds",
    category: "Audio & Wearables",
    unitPrice: 3450,
    allocations: { Shopify: 24, Amazon: 16, Etsy: 8 },
    lastPushedAt: "2 mins ago",
  },
  {
    id: "inv-2",
    sku: "OS-KBD-400",
    name: "KeyChronos 75% Hot-Swap Aluminum Keyboard",
    category: "Peripherals",
    unitPrice: 11500,
    allocations: { Shopify: 4, Amazon: 3, Etsy: 1 },
    lastPushedAt: "5 mins ago",
  },
  {
    id: "inv-3",
    sku: "OS-PWR-302",
    name: "VoltMax 20000mAh 65W PD Power Bank",
    category: "Charging & Power",
    unitPrice: 4200,
    allocations: { Shopify: 32, Amazon: 28, Etsy: 14 },
    lastPushedAt: "8 mins ago",
  },
  {
    id: "inv-4",
    sku: "OS-WTC-800",
    name: "Chronos Fit AMOLED Titanium Smartwatch",
    category: "Audio & Wearables",
    unitPrice: 6850,
    allocations: { Shopify: 3, Amazon: 2, Etsy: 1 },
    lastPushedAt: "11 mins ago",
  },
  {
    id: "inv-5",
    sku: "OS-DAC-901",
    name: "StudioReference Balanced USB-C DAC/Amp",
    category: "Audio & Wearables",
    unitPrice: 8900,
    allocations: { Shopify: 0, Amazon: 0, Etsy: 0 },
    lastPushedAt: "14 mins ago",
  },
  {
    id: "inv-6",
    sku: "OS-HUB-510",
    name: "HyperPort 8-in-1 Dual 4K USB-C Hub",
    category: "Peripherals",
    unitPrice: 2950,
    allocations: { Shopify: 19, Amazon: 14, Etsy: 7 },
    lastPushedAt: "19 mins ago",
  },
  {
    id: "inv-7",
    sku: "OS-DSK-118",
    name: "Walnut Mechanical Wrist Rest (75%)",
    category: "Desk Accessories",
    unitPrice: 2450,
    allocations: { Shopify: 2, Amazon: 1, Etsy: 4 },
    lastPushedAt: "23 mins ago",
  },
  {
    id: "inv-8",
    sku: "OS-CHG-115",
    name: "GaNPro 140W 4-Port Desktop Charger",
    category: "Charging & Power",
    unitPrice: 3850,
    allocations: { Shopify: 15, Amazon: 12, Etsy: 5 },
    lastPushedAt: "27 mins ago",
  },
  {
    id: "inv-9",
    sku: "OS-KCP-701",
    name: "Artisan Anodized Brass Esc Keycap",
    category: "Desk Accessories",
    unitPrice: 1850,
    allocations: { Shopify: 0, Amazon: 0, Etsy: 0 },
    lastPushedAt: "35 mins ago",
  },
];

export const INITIAL_INTEGRATIONS_LIST: MarketplaceIntegration[] = [
  {
    id: "shopify",
    name: "WhatsApp & Online Store",
    subtitle: "Direct D2C storefront checkout & WhatsApp DM order sync",
    status: "Connected",
    lastSynced: "Synced 5 mins ago",
    ordersSynced24h: 148,
    credentials: {
      storeUrl: "https://omnisync-pk.myshopify.com",
      apiKey: "shpat_9f84b2c10e774a9183d2e110",
      webhookSecret: "whsec_shp_77a19c04f8b221",
      autoSyncInterval: "5m",
    },
  },
  {
    id: "amazon",
    name: "Daraz Seller Center",
    subtitle: "Daraz Mall order polling, stock reserve & COD reconciliation",
    status: "Connected",
    lastSynced: "Synced 12 mins ago",
    ordersSynced24h: 94,
    credentials: {
      storeUrl: "https://sellercenter.daraz.pk/mws/PK29X01",
      apiKey: "drz.sp.solution.8831-904a-bc12",
      webhookSecret: "whsec_drz_4490d81e30c2",
      autoSyncInterval: "15m",
    },
  },
  {
    id: "etsy",
    name: "Instagram DM & Social Shop",
    subtitle: "Campaign drops, DM orders & automated WhatsApp verification",
    status: "Connected",
    lastSynced: "Synced 22 mins ago",
    ordersSynced24h: 41,
    credentials: {
      storeUrl: "https://instagram.com/omnisync.pk",
      apiKey: "meta_v3_k91820471a8c44",
      webhookSecret: "whsec_ig_1904b882a1",
      autoSyncInterval: "15m",
    },
  },
  {
    id: "ebay",
    name: "Trax & TCS Courier Bridge",
    subtitle: "Automated COD airway bill booking & RTO return radar",
    status: "Connected",
    lastSynced: "Synced 18 mins ago",
    ordersSynced24h: 36,
    credentials: {
      storeUrl: "https://sonic.trax.pk/api/omnisync",
      apiKey: "trax_prd_44109a8b7c6d5e",
      webhookSecret: "whsec_trx_0091283746",
      autoSyncInterval: "30m",
    },
  },
  {
    id: "woocommerce",
    name: "WooCommerce Pakistan",
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

export const DEFAULT_SETTINGS_PREFERENCES: OmniSyncSettingsPreferences = {
  storeName: "OmniSync Pakistan D2C Flagship",
  supportEmail: "ops@omnisync.pk",
  warehouseRegion: "Lahore & Karachi Central Dispatch Hubs",
  currency: "PKR",
  timeZone: "PKT (UTC+05:00 — Islamabad / Karachi)",
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
  slackChannelName: "#cod-dispatch-alerts",
  slackEnabled: false,
  discordWebhookUrl: "",
  discordEnabled: false,
  notifyOnSyncFailure: true,
  notifyOnSyncSuccess: true,
  notifyOnLowStock: true,
  lastSavedAt: "2026-10-07 15:00:00 PKT",
};

export const INITIAL_DASHBOARD_ACTIVITIES: DashboardActivityEvent[] = [
  {
    id: "evt-1",
    category: "order",
    title: "Order #OMS-1049 received via WhatsApp DM",
    subtitle: "Bilal Ahmed (Gujranwala) • Rs. 3,450 • Flagged High RTO Risk (82%)",
    channel: "Shopify",
    timestamp: "2m ago",
  },
  {
    id: "evt-2",
    category: "webhook",
    title: "Trax Logistics AWB generated for #OMS-1048",
    subtitle: "Tracking TRAX-PK-883921 assigned • Ayesha Malik (Karachi)",
    channel: "Etsy",
    timestamp: "8m ago",
  },
  {
    id: "evt-3",
    category: "order",
    title: "Order #OMS-1047 delivered via Leopards Courier",
    subtitle: "Sana Farooq (Sector G-11/2, Islamabad) • Rs. 6,400 COD collected",
    channel: "Amazon",
    timestamp: "14m ago",
  },
  {
    id: "evt-4",
    category: "inventory",
    title: "Stock rebalanced for SKU OS-AUD-101 across channels",
    subtitle: "Reserved 24 units for WhatsApp/Online Store & 16 for Daraz Mall",
    channel: "Shopify",
    timestamp: "21m ago",
  },
  {
    id: "evt-5",
    category: "inventory",
    title: "Low-stock alert on KeyChronos 75% Keyboard (OS-KBD-400)",
    subtitle: "Only 8 units remaining in Lahore Gulberg warehouse",
    channel: "eBay",
    timestamp: "34m ago",
  },
  {
    id: "evt-6",
    category: "webhook",
    title: "Daraz Mall COD settlement batch synced",
    subtitle: "Verified 94 active listings • 0 stock or price discrepancies",
    channel: "Amazon",
    timestamp: "49m ago",
  },
];
