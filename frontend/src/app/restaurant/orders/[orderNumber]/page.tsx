"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircle,
    ChefHat,
    Clock,
    CreditCard,
    Home,
    MapPin,
    RefreshCw,
    ShoppingBag,
    Truck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import {
    formatCurrency,
    formatDate,
    getStatusColor,
    orderStatusLabel,
} from "@/lib/utils";
import { useRestaurantCart } from "@/store/cartStore";

/**
 * Restaurant order tracking.
 *
 * The status flow is the shared `Order` one, so the step list matches the
 * grocery page's — only the labels are reworded for a kitchen ("Cooking"
 * rather than "Processing") and menu-item lines render their modifier snapshot
 * instead of a variant name.
 */
const DELIVERY_STEPS = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle },
    { key: "processing", label: "Cooking", icon: ChefHat },
    { key: "out_for_delivery", label: "On its way", icon: Truck },
    { key: "delivered", label: "Delivered", icon: Home },
];

const PICKUP_STEPS = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle },
    { key: "processing", label: "Cooking", icon: ChefHat },
    { key: "ready_for_pickup", label: "Ready", icon: ShoppingBag },
    { key: "delivered", label: "Collected", icon: Home },
];

export default function RestaurantOrderDetailPage() {
    const { orderNumber } = useParams();
    const queryClient = useQueryClient();
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || !orderNumber) return;
        const params = new URLSearchParams(window.location.search);
        if (!params.get("payment_intent")) return;
        const num = Array.isArray(orderNumber) ? orderNumber[0] : orderNumber;
        queryClient.invalidateQueries({ queryKey: ["order", num] });
        toast.success("Payment complete");
        void useRestaurantCart.getState().fetchCart();
        window.history.replaceState({}, "", `/restaurant/orders/${num}`);
    }, [orderNumber, queryClient]);

    const { data: order, isLoading } = useQuery({
        queryKey: ["order", orderNumber],
        queryFn: () => api.get(`/orders/${orderNumber}/`).then((r) => r.data),
        refetchInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="container-xl py-8 space-y-4">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container-xl py-20 text-center text-gray-400">
                Order not found
            </div>
        );
    }

    const isPickup = order.order_type === "pickup";
    const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
    const currentStepIdx = steps.findIndex((s) => s.key === order.status);
    const isCancelled = order.status === "cancelled";
    const canPay =
        ["unpaid", "failed"].includes(order.payment_status) && !isCancelled;

    const handleRetryPayment = async () => {
        setRetrying(true);
        try {
            const res = await api.post("/payments/create-intent/", {
                order_number: order.order_number,
            });
            window.location.href = res.data.data.checkout_url;
        } catch (e: any) {
            toast.error(
                e?.response?.data?.message ||
                    "Failed to start payment. Please try again."
            );
            setRetrying(false);
        }
    };

    return (
        <div className="container-xl px-4 py-6 md:py-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link
                        href="/restaurant/orders"
                        className="mb-1 block text-sm text-brand-700 hover:underline"
                    >
                        ← Back to orders
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Order #{order.order_number}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {formatDate(order.created_at)}
                    </p>
                </div>
                <div className="sm:text-right">
                    <span
                        className={`badge px-3 py-1 text-sm ${getStatusColor(order.status)}`}
                    >
                        {orderStatusLabel(order.status, order.order_type)}
                    </span>
                    <p className="mt-1 text-xl font-bold text-brand-700">
                        {formatCurrency(order.total_amount)}
                    </p>
                </div>
            </div>

            {!isCancelled && (
                <div className="card mb-6 p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">
                            Order progress
                        </h2>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                            {isPickup ? "Takeaway" : "Delivery"}
                        </span>
                    </div>
                    <div className="relative flex justify-between overflow-x-auto pb-2">
                        <div className="absolute left-0 right-0 top-5 z-0 h-1 bg-gray-200">
                            <div
                                className="h-full bg-brand-600 transition-all duration-500"
                                style={{
                                    width: `${currentStepIdx >= 0 ? (currentStepIdx / (steps.length - 1)) * 100 : 0}%`,
                                }}
                            />
                        </div>
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            const done = i <= currentStepIdx;
                            return (
                                <div
                                    key={step.key}
                                    className="relative z-10 flex flex-1 flex-col items-center gap-1"
                                >
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                                            done
                                                ? "bg-brand-600 text-white"
                                                : "bg-gray-200 text-gray-400"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span
                                        className={`hidden text-center text-xs font-medium sm:block ${
                                            done ? "text-brand-700" : "text-gray-400"
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <div className="card p-4 sm:p-5">
                        <h2 className="mb-4 font-semibold text-gray-900">
                            What you ordered
                        </h2>
                        <div className="space-y-3">
                            {order.items?.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 text-sm"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                            {item.product_name}
                                        </p>
                                        {/* For a menu-item line the backend stores the
                                            modifier summary in variant_name, and the full
                                            snapshot in selected_modifiers. */}
                                        {item.selected_modifiers?.length > 0 ? (
                                            <ul className="mt-0.5 space-y-0.5">
                                                {item.selected_modifiers.map((m: any) => (
                                                    <li
                                                        key={m.modifier_id}
                                                        className="text-xs text-gray-500"
                                                    >
                                                        {m.group}: {m.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            item.variant_name && (
                                                <p className="text-xs text-gray-500">
                                                    {item.variant_name}
                                                </p>
                                            )
                                        )}
                                    </div>
                                    <span className="text-gray-500">×{item.quantity}</span>
                                    <span className="font-semibold">
                                        {formatCurrency(item.line_total)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            {Number(order.delivery_fee) > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Delivery ({order.delivery_zone_name})</span>
                                    <span>{formatCurrency(order.delivery_fee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-1 text-base font-bold">
                                <span>Total</span>
                                <span className="text-brand-700">
                                    {formatCurrency(order.total_amount)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="card p-5">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                            <CreditCard className="h-4 w-4 text-brand-600" /> Payment
                        </h2>
                        <span className={`badge ${getStatusColor(order.payment_status)}`}>
                            {orderStatusLabel(order.payment_status)}
                        </span>
                        {canPay && (
                            <div className="mt-3">
                                {order.payment_status === "failed" && (
                                    <p className="mb-2 text-xs text-red-600">
                                        Your payment failed. Please try again.
                                    </p>
                                )}
                                <button
                                    onClick={handleRetryPayment}
                                    disabled={retrying}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                                >
                                    {retrying ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CreditCard className="h-4 w-4" />
                                    )}
                                    {retrying
                                        ? "Redirecting…"
                                        : order.payment_status === "failed"
                                          ? "Retry payment"
                                          : "Pay now"}
                                </button>
                            </div>
                        )}
                    </div>

                    {isPickup ? (
                        <div className="card p-5">
                            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                <ShoppingBag className="h-4 w-4 text-brand-600" /> Takeaway
                            </h2>
                            <p className="text-sm text-gray-600">
                                We&apos;ll let you know as soon as your order is
                                ready to collect from the kitchen.
                            </p>
                        </div>
                    ) : (
                        order.delivery_address && (
                            <div className="card p-5">
                                <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                    <MapPin className="h-4 w-4 text-brand-600" /> Delivering to
                                </h2>
                                <address className="text-sm not-italic leading-relaxed text-gray-600">
                                    <p className="font-medium text-gray-900">
                                        {order.delivery_address.full_name}
                                    </p>
                                    <p>{order.delivery_address.address_line1}</p>
                                    {order.delivery_address.address_line2 && (
                                        <p>{order.delivery_address.address_line2}</p>
                                    )}
                                    <p>
                                        {order.delivery_address.suburb}{" "}
                                        {order.delivery_address.state}{" "}
                                        {order.delivery_address.postcode}
                                    </p>
                                    <p className="mt-1 text-gray-500">
                                        {order.delivery_address.phone}
                                    </p>
                                </address>
                            </div>
                        )
                    )}

                    {order.notes && (
                        <div className="card p-5">
                            <h2 className="mb-2 font-semibold text-gray-900">
                                Notes for the kitchen
                            </h2>
                            <p className="text-sm text-gray-600">{order.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
