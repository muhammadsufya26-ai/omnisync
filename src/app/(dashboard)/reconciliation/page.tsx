"use client";

import React, { useEffect, useState } from "react";
import { Truck, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  city: string;
  totalAmount: number;
  status: string;
  courierName: string | null;
  trackingNumber: string | null;
}

export default function ReconciliationPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { orders?: Order[] }) => {
        setOrders(
          (data.orders ?? []).filter(
            (o) =>
              o.status === "DISPATCHED" ||
              o.status === "DELIVERED" ||
              o.status === "RTO_RETURNED"
          )
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Courier COD &amp; RTO Reconciliation
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Track dispatched parcels, COD settlements, and RTO return restocking
          across TCS, Leopards, BlueEx, and M&amp;P.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th scope="col" className="py-3 pl-5 pr-3">
                  Order ID
                </th>
                <th scope="col" className="py-3 px-3">
                  Courier &amp; Tracking
                </th>
                <th scope="col" className="py-3 px-3">
                  Customer &amp; City
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  COD Amount
                </th>
                <th scope="col" className="py-3 pl-3 pr-5 text-right">
                  Settlement Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading courier ledger...
                    </span>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/80">
                    <th
                      scope="row"
                      className="py-3.5 pl-5 pr-3 font-mono font-semibold text-neutral-900"
                    >
                      {order.orderNumber}
                    </th>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-neutral-900 inline-flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-neutral-400" />
                        {order.courierName || "TCS Express"}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        {order.trackingNumber || "Pending AWB"}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-neutral-900">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {order.city}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-neutral-900">
                      PKR {order.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 pl-3 pr-5 text-right">
                      {order.status === "DELIVERED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          COD Collected
                        </span>
                      ) : order.status === "RTO_RETURNED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                          <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                          RTO Loss / Returned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
                          <Truck className="w-3.5 h-3.5 text-indigo-600" />
                          In Transit
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
