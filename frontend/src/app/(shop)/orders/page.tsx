"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor, orderStatusLabel } from "@/lib/utils";
import { Package } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders/").then((r) => r.data),
  });

  if (isLoading) return (
    <div className="container-xl py-8 space-y-4">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );

  const orders = data?.results || [];

  if (orders.length === 0) return (
    <div className="container-xl py-20 text-center">
      <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h2 className="text-xl font-semibold text-gray-700 mb-2">No orders yet</h2>
      <Link href="/products" className="btn-primary inline-flex mt-4">Start Shopping</Link>
    </div>
  );

  return (
    <div className="container-xl py-8">
      <h1 className="section-title mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order: any) => (
          <Link key={order.id} href={`/orders/${order.order_number}`} className="card p-5 block hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-gray-900">Order #{order.order_number}</p>
                <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
              </div>
              <div className="text-right">
                <span className={`badge ${getStatusColor(order.status)}`}>{orderStatusLabel(order.status, order.order_type)}</span>
                <p className="font-bold text-primary-700 mt-1">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</span>
              <span>•</span>
              <span className="capitalize">{order.order_type}</span>
              <span>•</span>
              <span className={`badge ${getStatusColor(order.payment_status)}`}>{orderStatusLabel(order.payment_status)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
