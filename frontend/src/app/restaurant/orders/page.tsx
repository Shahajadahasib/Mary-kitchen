"use client";

import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import {
    formatCurrency,
    formatDate,
    getStatusColor,
    orderStatusLabel,
} from "@/lib/utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";

/**
 * Restaurant order history.
 *
 * Asks the shared orders endpoint for this channel only — the customer's
 * account spans both storefronts, so without `?channel=restaurant` this would
 * also list their grocery orders.
 */
export default function RestaurantOrdersPage() {
    const { ready } = useRequireAuth();

    const { data, isLoading } = useQuery({
        queryKey: ["orders", "restaurant"],
        queryFn: () =>
            api
                .get("/orders/", { params: { channel: "restaurant" } })
                .then((r) => r.data),
        enabled: ready,
    });

    if (!ready || isLoading) {
        return (
            <div className="container-xl px-4 py-6 md:py-8 space-y-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
        );
    }

    const orders = data?.results ?? [];

    if (orders.length === 0) {
        return (
            <div className="container-xl px-4 py-16 md:py-20 text-center">
                <UtensilsCrossed
                    className="w-16 h-16 mx-auto text-gray-300 mb-4"
                    strokeWidth={1.25}
                />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    No restaurant orders yet
                </h2>
                <Link
                    href="/restaurant"
                    className="mt-4 inline-flex rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
                >
                    Browse the menu
                </Link>
            </div>
        );
    }

    return (
        <div className="container-xl px-4 py-6 md:py-8">
            <h1 className="section-title mb-6">Your restaurant orders</h1>
            <div className="space-y-4">
                {orders.map((order: any) => (
                    <Link
                        key={order.id}
                        href={`/restaurant/orders/${order.order_number}`}
                        className="card block p-4 transition-shadow hover:shadow-md sm:p-5"
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900 sm:text-base">
                                    Order #{order.order_number}
                                </p>
                                <p className="text-xs text-gray-500 sm:text-sm">
                                    {formatDate(order.created_at)}
                                </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                                <span className={`badge ${getStatusColor(order.status)}`}>
                                    {orderStatusLabel(order.status, order.order_type)}
                                </span>
                                <p className="mt-1 text-sm font-bold text-brand-700 sm:text-base">
                                    {formatCurrency(order.total_amount)}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:text-sm">
                            <span>
                                {order.items?.length} item
                                {order.items?.length !== 1 ? "s" : ""}
                            </span>
                            <span>•</span>
                            <span>
                                {order.order_type === "pickup" ? "Takeaway" : "Delivery"}
                            </span>
                            <span>•</span>
                            <span className={`badge ${getStatusColor(order.payment_status)}`}>
                                {orderStatusLabel(order.payment_status)}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
