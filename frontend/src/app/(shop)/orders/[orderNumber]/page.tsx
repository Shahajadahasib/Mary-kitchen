"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Package, MapPin, CreditCard, CheckCircle, Clock, Truck, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const STATUS_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined" || !orderNumber) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("payment_intent")) return;
    const num = Array.isArray(orderNumber) ? orderNumber[0] : orderNumber;
    queryClient.invalidateQueries({ queryKey: ["order", num] });
    toast.success("Payment complete");
    void useCartStore.getState().fetchCart();
    window.history.replaceState({}, "", `/orders/${num}`);
  }, [orderNumber, queryClient]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => api.get(`/orders/${orderNumber}/`).then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="container-xl py-8 space-y-4">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (!order) return <div className="container-xl py-20 text-center text-gray-400">Order not found</div>;

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="container-xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/orders" className="text-sm text-primary-700 hover:underline mb-1 block">← Back to Orders</Link>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
          <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
        </div>
        <div className="text-right">
          <span className={`badge text-sm px-3 py-1 ${getStatusColor(order.status)}`}>
            {order.status.replace(/_/g, " ")}
          </span>
          <p className="text-xl font-bold text-primary-700 mt-1">{formatCurrency(order.total_amount)}</p>
        </div>
      </div>

      {/* Tracking */}
      {!isCancelled && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-5">Order Tracking</h2>
          <div className="relative flex justify-between">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0">
              <div
                className="h-full bg-primary-600 transition-all duration-500"
                style={{ width: `${currentStepIdx >= 0 ? (currentStepIdx / (STATUS_STEPS.length - 1)) * 100 : 0}%` }}
              />
            </div>
            {STATUS_STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i <= currentStepIdx;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-1 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    done ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-400"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-medium text-center ${done ? "text-primary-700" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Items Ordered</h2>
            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    {item.variant_name && <p className="text-gray-500 text-xs">{item.variant_name}</p>}
                    {item.was_out_of_stock && (
                      <span className="text-xs text-orange-500 font-medium">⚠ Was out of stock at order time</span>
                    )}
                  </div>
                  <span className="text-gray-500">×{item.quantity}</span>
                  <span className="font-semibold">{formatCurrency(item.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.delivery_fee) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery ({order.delivery_zone_name})</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span><span className="text-primary-700">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Payment */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-600" /> Payment
            </h2>
            <span className={`badge ${getStatusColor(order.payment_status)}`}>{order.payment_status}</span>
          </div>

          {/* Delivery Address */}
          {order.delivery_address && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" /> Delivery Address
              </h2>
              <address className="text-sm text-gray-600 not-italic leading-relaxed">
                <p className="font-medium text-gray-900">{order.delivery_address.full_name}</p>
                <p>{order.delivery_address.address_line1}</p>
                {order.delivery_address.address_line2 && <p>{order.delivery_address.address_line2}</p>}
                <p>{order.delivery_address.suburb} {order.delivery_address.state} {order.delivery_address.postcode}</p>
                <p className="mt-1 text-gray-500">{order.delivery_address.phone}</p>
              </address>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
