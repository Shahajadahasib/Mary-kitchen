"use client";

import MediaImage from "@/components/ui/MediaImage";
import {
    AlertTriangle,
    ArrowRight,
    Minus,
    Plus,
    RefreshCw,
    ShoppingBag,
    Trash2,
    UtensilsCrossed,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { authHref } from "@/lib/authRedirect";
import { absoluteMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantCart } from "@/store/cartStore";

interface InvalidItem {
    id: string;
    menu_item_id?: string;
    product_name: string;
    quantity: number;
    reason: string;
}

export default function RestaurantCartPage() {
    const { cart, fetchCart, updateItem, removeItem, isLoading } =
        useRestaurantCart();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
    const [invalidItems, setInvalidItems] = useState<InvalidItem[]>([]);
    const [validating, setValidating] = useState(false);

    const runValidation = useCallback(async () => {
        setValidating(true);
        try {
            // Channel matters here — the grocery cart has its own validation.
            const { data } = await api.get("/cart/validate/", {
                params: { channel: "restaurant" },
            });
            setInvalidIds(
                new Set<string>((data.invalid_items ?? []).map((i: InvalidItem) => i.id))
            );
            setInvalidItems(data.invalid_items ?? []);
        } catch {
            // non-fatal — the cart still renders
        } finally {
            setValidating(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCart();
            runValidation();
        }
    }, [isAuthenticated, fetchCart, runValidation]);

    if (!isAuthenticated) {
        return (
            <div className="container-xl py-20 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Sign in to view your order
                </h2>
                <Link
                    href={authHref("/login", "/restaurant/cart")}
                    className="mt-4 inline-flex rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
                >
                    Sign in
                </Link>
            </div>
        );
    }

    const items = cart?.items ?? [];

    if (!isLoading && items.length === 0) {
        return (
            <div className="container-xl py-20 text-center">
                <UtensilsCrossed
                    className="w-16 h-16 mx-auto text-gray-300 mb-4"
                    strokeWidth={1.25}
                />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Your order is empty
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

    const handleRemove = async (itemId: string) => {
        try {
            await removeItem(itemId);
            setInvalidIds((prev) => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
            setInvalidItems((prev) => prev.filter((i) => i.id !== itemId));
            toast.success("Removed");
        } catch {
            toast.error("Could not remove that item");
        }
    };

    const handleRemoveAllInvalid = async () => {
        const ids = Array.from(invalidIds);
        await Promise.all(ids.map((id) => removeItem(id)));
        setInvalidIds(new Set());
        setInvalidItems([]);
        toast.success(`${ids.length} unavailable dish${ids.length > 1 ? "es" : ""} removed`);
    };

    const validItems = items.filter((i) => !invalidIds.has(i.id));
    const hasInvalid = invalidIds.size > 0;
    const allInvalid = hasInvalid && validItems.length === 0;
    const subtotal = validItems.reduce(
        (sum, i) => sum + (Number(i.line_total) || 0),
        0
    );

    return (
        <div className="container-xl py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="section-title">Your order</h1>
                <button
                    onClick={runValidation}
                    disabled={validating}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    title="Re-check availability"
                >
                    <RefreshCw
                        className={`w-3.5 h-3.5 ${validating ? "animate-spin" : ""}`}
                    />
                    Check availability
                </button>
            </div>

            {hasInvalid && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">
                            {allInvalid
                                ? "Everything in your order is off the menu right now."
                                : `${invalidIds.size} dish${invalidIds.size > 1 ? "es are" : " is"} no longer available and will be left off your order.`}
                        </p>
                        {!allInvalid && (
                            <p className="mt-0.5 text-xs text-amber-700">
                                You can still order the remaining dishes.
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleRemoveAllInvalid}
                        className="flex-shrink-0 whitespace-nowrap text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    >
                        Remove unavailable
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => {
                        const unavailable = invalidIds.has(item.id);
                        const reason = invalidItems.find((i) => i.id === item.id)?.reason;
                        const dish = item.menu_item_detail;
                        const image = absoluteMediaUrl(dish?.primary_image);

                        return (
                            <div
                                key={item.id}
                                className={`card flex gap-3 p-3 sm:gap-4 sm:p-4 transition-all duration-300 ${
                                    unavailable ? "bg-gray-50 opacity-60" : ""
                                }`}
                            >
                                <div
                                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-20 sm:w-20 ${
                                        unavailable ? "grayscale" : ""
                                    }`}
                                >
                                    {image ? (
                                        <MediaImage
                                            src={image}
                                            alt={dish?.name ?? "Dish"}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                                            <UtensilsCrossed className="w-7 h-7" strokeWidth={1.25} />
                                        </div>
                                    )}
                                    {unavailable && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30">
                                            <XCircle className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={`/restaurant/${dish?.slug}`}
                                        className={`line-clamp-2 text-sm font-semibold ${
                                            unavailable
                                                ? "pointer-events-none text-gray-400"
                                                : "text-gray-900 hover:text-brand-700"
                                        }`}
                                    >
                                        {dish?.name}
                                    </Link>

                                    {/* Modifier snapshot taken when the dish was added. */}
                                    {item.selected_modifiers?.length > 0 && (
                                        <ul className="mt-1 space-y-0.5">
                                            {item.selected_modifiers.map((m) => (
                                                <li
                                                    key={m.modifier_id}
                                                    className="text-xs text-gray-500"
                                                >
                                                    {m.group}: {m.name}
                                                    {Number(m.price_delta) !== 0 && (
                                                        <span className="text-gray-400">
                                                            {" "}
                                                            ({Number(m.price_delta) > 0 ? "+" : "−"}
                                                            {formatCurrency(
                                                                Math.abs(Number(m.price_delta))
                                                            )}
                                                            )
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {unavailable ? (
                                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                                            <XCircle className="w-3 h-3" />
                                            {reason ?? "Currently unavailable"}
                                        </span>
                                    ) : (
                                        <p className="mt-1 text-sm font-bold text-brand-700">
                                            {formatCurrency(item.unit_price)}
                                        </p>
                                    )}

                                    <div className="mt-2 flex items-center justify-between">
                                        <div
                                            className={`flex items-center gap-1 rounded-lg border border-gray-200 ${
                                                unavailable ? "pointer-events-none opacity-40" : ""
                                            }`}
                                        >
                                            <button
                                                onClick={() =>
                                                    item.quantity > 1 &&
                                                    updateItem(item.id, item.quantity - 1)
                                                }
                                                disabled={unavailable}
                                                aria-label="Decrease quantity"
                                                className="rounded-l-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="px-2 text-sm font-medium">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    updateItem(item.id, item.quantity + 1)
                                                }
                                                disabled={unavailable}
                                                aria-label="Increase quantity"
                                                className="rounded-r-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {!unavailable && (
                                                <p className="text-sm font-bold text-gray-900 sm:text-base">
                                                    {formatCurrency(item.line_total)}
                                                </p>
                                            )}
                                            <button
                                                onClick={() => handleRemove(item.id)}
                                                aria-label="Remove from order"
                                                className="p-1 text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary */}
                <div>
                    <div className="card p-4 sm:p-6 lg:sticky lg:top-20">
                        <h2 className="mb-4 text-lg font-bold text-gray-900">
                            Order summary
                        </h2>
                        <div className="mb-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>
                                    {hasInvalid
                                        ? `Available dishes (${validItems.length})`
                                        : `Subtotal (${cart?.total_items} item${cart?.total_items === 1 ? "" : "s"})`}
                                </span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery</span>
                                <span className="text-brand-600">
                                    Calculated at checkout
                                </span>
                            </div>
                        </div>
                        <div className="mb-5 flex justify-between border-t pt-3 text-base font-bold">
                            <span>Subtotal</span>
                            <span className="text-brand-700">
                                {formatCurrency(subtotal)}
                            </span>
                        </div>

                        {allInvalid ? (
                            <div className="py-2 text-center">
                                <p className="mb-3 text-sm font-medium text-red-600">
                                    Nothing here is available right now.
                                </p>
                                <button
                                    onClick={handleRemoveAllInvalid}
                                    className="btn-secondary w-full text-sm"
                                >
                                    Clear order
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/restaurant/checkout"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-700"
                            >
                                {hasInvalid ? "Checkout available dishes" : "Checkout"}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                        <Link
                            href="/restaurant"
                            className="btn-secondary mt-3 flex w-full items-center justify-center text-sm"
                        >
                            Add more dishes
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
