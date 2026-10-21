import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { OmniSyncProvider } from "@/context/OmniSyncContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "OmniSync — Multi-Channel Order & Storefront Sync Hub",
    template: "%s | OmniSync",
  },
  description:
    "Unified multi-channel order management, COD RTO risk radar, inventory rebalancing, and real-time webhook synchronization.",
  keywords: [
    "OmniSync",
    "Multi-Channel Ecommerce",
    "Order Fulfillment",
    "Inventory Sync",
    "WhatsApp",
    "Daraz",
    "Shopify",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-slate-50 text-slate-900 overflow-x-hidden">
      <body
        className="bg-slate-50 text-slate-900 antialiased min-h-screen overflow-x-hidden"
        suppressHydrationWarning
      >
        <OmniSyncProvider>
          <AppShell>{children}</AppShell>
        </OmniSyncProvider>
      </body>
    </html>
  );
}
