"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertTriangle,
    Loader2,
    MapPin,
    Package,
    Plus,
    Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddressFormModal from "@/components/ui/AddressFormModal";
import { useDeliveryFee, type DeliveryAddress } from "@/hooks/useDeliveryFee";
import api from "@/lib/api";
import { authHref } from "@/lib/authRedirect";
import { getOrCreateSessionId } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantCart } from "@/store/cartStore";

/**
 * Restaurant checkout.
 *
 * Same Order/Payment pipeline as the grocery shop — the only differences are
 * `channel: "restaurant"` in the checkout payload and restaurant branding.
 * v1 is takeaway (pickup) + delivery only; there is deliberately no dine-in
 * order type.
 */
export default function RestaurantCheckoutPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { cart, fetchCart } = useRestaurantCart();
    const { isAuthenticated, hasHydrated } = useAuthStore();

    const [orderType, setOrderType] = useState<"delivery" | "pickup">("pickup");
    const [selectedAddress, setSelectedAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [addrModalOpen, setAddrModalOpen] = useState(false);

    const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
    const [canCheckout, setCanCheckout] = useState(true);

    useEffect(() => {
        if (!hasHydrated) return;
        if (!isAuthenticated) {
            router.push(authHref("/login", "/restaurant/checkout"));
            return;
        }
        fetchCart();
        api.get("/cart/validate/", { params: { channel: "restaurant" } })
            .then(({ data }) => {
                setInvalidIds(
                    new Set<string>(
                        (data.invalid_items ?? []).map((i: { id: string }) => i.id)
                    )
                );
                setCanCheckout(data.can_checkout ?? true);
            })
            .catch(() => {});
    }, [hasHydrated, isAuthenticated, fetchCart, router]);

    // Stripe sends the customer back here with ?canceled=1 if they bail.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("canceled") !== "1") return;
        toast.error("Payment was canceled. Your order is unchanged.");
        window.history.replaceState({}, "", "/restaurant/checkout");
    }, []);

    const { data: addresses } = useQuery({
        queryKey: ["addresses"],
        queryFn: () => api.get("/users/addresses/").then((r) => r.data),
        enabled: isAuthenticated,
    });
    // Memoised so the identity is stable — the default-address effect and
    // useDeliveryFee both depend on it.
    const addrList: DeliveryAddress[] = useMemo(
        () => addresses?.results ?? addresses ?? [],
        [addresses]
    );

    // Preselect the default address once the list arrives.
    useEffect(() => {
        if (selectedAddress || addrList.length === 0) return;
        const def = addrList.find((a) => a.is_default);
        if (def) setSelectedAddress(def.id);
    }, [addrList, selectedAddress]);

    const validItems = (cart?.items ?? []).filter((i) => !invalidIds.has(i.id));
    const subtotal = validItems.reduce(
        (sum, i) => sum + Number(i.line_total ?? 0),
        0
    );

    const {
        state: feeState,
        resolvedFee,
        ready: deliveryReady,
    } = useDeliveryFee({
        orderType,
        addressId: selectedAddress,
        addresses: addrList,
        subtotal,
    });

    const total = subtotal + (resolvedFee ?? 0);

    const handlePlaceOrder = async () => {
        if (orderType === "delivery" && !selectedAddress) {
            toast.error("Please choose a delivery address");
            return;
        }
        if (orderType === "delivery" && !deliveryReady) {
            toast.error(
                feeState.status === "denied" || feeState.status === "error"
                    ? feeState.message
                    : "Please wait — calculating the delivery fee."
            );
            return;
        }
        if (!canCheckout) {
            toast.error(
                "Nothing in your order is available right now. Please remove those dishes first."
            );
            return;
        }

        setLoading(true);
        try {
            const { data: orderResp } = await api.post("/orders/checkout/", {
                channel: "restaurant",
                order_type: orderType,
                address_id: orderType === "delivery" ? selectedAddress : null,
                notes,
                session_id: getOrCreateSessionId(),
            });

            const checkoutUrl = orderResp.data?.payment?.checkout_url as
                | string
                | undefined;
            if (!checkoutUrl) {
                toast.error(
                    "Order created but the Stripe payment link is missing. Please try again."
                );
                await fetchCart();
                return;
            }

            await fetchCart();
            toast.success("Redirecting to secure Stripe Checkout…");
            window.location.href = checkoutUrl;
        } catch (e: unknown) {
            const message =
                (e as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? "Could not place your order";
            toast.error(message);
            await fetchCart();
        } finally {
            setLoading(false);
        }
    };

    if (!hasHydrated) {
        return (
            <div className="container-xl py-20 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            </div>
        );
    }

    if (validItems.length === 0) {
        return (
            <div className="container-xl py-20 text-center">
                <Package className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                    There is nothing to check out
                </h2>
                <button
                    onClick={() => router.push("/restaurant")}
                    className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
                >
                    Browse the menu
                </button>
            </div>
        );
    }

    return (
        <div className="container-xl py-8">
            <h1 className="section-title mb-6">Checkout</h1>

            {invalidIds.size > 0 && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        {invalidIds.size} dish
                        {invalidIds.size > 1 ? "es are" : " is"} no longer available
                        and {invalidIds.size > 1 ? "have" : "has"} been left out of
                        this order.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Order type */}
                    <section className="card p-5">
                        <h2 className="font-bold text-gray-900 mb-4">
                            How would you like it?
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setOrderType("pickup")}
                                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                                    orderType === "pickup"
                                        ? "border-brand-600 bg-brand-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <Package className="w-6 h-6 text-brand-700" />
                                <span className="text-sm font-semibold text-gray-900">
                                    Takeaway
                                </span>
                                <span className="text-xs text-gray-500">
                                    Collect from the kitchen
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrderType("delivery")}
                                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                                    orderType === "delivery"
                                        ? "border-brand-600 bg-brand-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <Truck className="w-6 h-6 text-brand-700" />
                                <span className="text-sm font-semibold text-gray-900">
                                    Delivery
                                </span>
                                <span className="text-xs text-gray-500">
                                    Across Darwin NT
                                </span>
                            </button>
                        </div>
                    </section>

                    {/* Address */}
                    {orderType === "delivery" && (
                        <section className="card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-gray-900">
                                    Delivery address
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setAddrModalOpen(true)}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                                >
                                    <Plus className="w-4 h-4" /> Add address
                                </button>
                            </div>

                            {addrList.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No saved addresses yet — add one to see the
                                    delivery fee.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {addrList.map((addr) => {
                                        const selected = addr.id === selectedAddress;
                                        return (
                                            <button
                                                type="button"
                                                key={addr.id}
                                                onClick={() => setSelectedAddress(addr.id)}
                                                className={`flex w-full gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                                    selected
                                                        ? "border-brand-600 bg-brand-50"
                                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-700" />
                                                <span className="min-w-0 flex-1 text-sm">
                                                    <span className="block font-medium text-gray-900">
                                                        {String(addr.label ?? "Address")}
                                                    </span>
                                                    <span className="block text-gray-600">
                                                        {String(addr.address_line1 ?? "")}
                                                        {addr.suburb ? `, ${addr.suburb}` : ""}
                                                        {addr.state ? ` ${addr.state}` : ""}
                                                        {addr.postcode ? ` ${addr.postcode}` : ""}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Fee feedback */}
                            {feeState.status === "loading" && (
                                <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Calculating delivery fee…
                                </p>
                            )}
                            {(feeState.status === "denied" ||
                                feeState.status === "error") && (
                                <p className="mt-3 text-sm text-red-600">
                                    {feeState.message}
                                </p>
                            )}
                            {feeState.status === "ok" && (
                                <p className="mt-3 text-sm text-gray-600">
                                    {feeState.zoneName && `${feeState.zoneName} — `}
                                    {feeState.isFree
                                        ? "free delivery"
                                        : formatCurrency(feeState.fee)}
                                    {feeState.distanceKm
                                        ? ` (${feeState.distanceKm} km)`
                                        : ""}
                                </p>
                            )}
                        </section>
                    )}

                    {/* Notes */}
                    <section className="card p-5">
                        <h2 className="font-bold text-gray-900 mb-3">
                            Notes for the kitchen
                        </h2>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Allergies, spice level, collection time…"
                            className="input-field w-full resize-none focus:ring-brand-500"
                        />
                    </section>
                </div>

                {/* Summary */}
                <div>
                    <div className="card p-5 lg:sticky lg:top-20">
                        <h2 className="mb-4 text-lg font-bold text-gray-900">
                            Your order
                        </h2>

                        <ul className="mb-4 space-y-3">
                            {validItems.map((item) => (
                                <li key={item.id} className="flex justify-between gap-3 text-sm">
                                    <span className="min-w-0">
                                        <span className="block text-gray-900">
                                            {item.quantity} × {item.menu_item_detail?.name}
                                        </span>
                                        {item.selected_modifiers?.length > 0 && (
                                            <span className="block text-xs text-gray-500">
                                                {item.selected_modifiers
                                                    .map((m) => m.name)
                                                    .join(", ")}
                                            </span>
                                        )}
                                    </span>
                                    <span className="whitespace-nowrap text-gray-700">
                                        {formatCurrency(item.line_total)}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="space-y-2 border-t pt-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>
                                    {orderType === "pickup" ? "Takeaway" : "Delivery"}
                                </span>
                                <span>
                                    {orderType === "pickup"
                                        ? "Free"
                                        : resolvedFee == null
                                          ? "—"
                                          : resolvedFee === 0
                                            ? "Free"
                                            : formatCurrency(resolvedFee)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 flex justify-between border-t pt-3 text-base font-bold">
                            <span>Total</span>
                            <span className="text-brand-700">
                                {formatCurrency(total)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handlePlaceOrder}
                            disabled={loading || (orderType === "delivery" && !deliveryReady)}
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? "Placing order…" : "Pay with Stripe"}
                        </button>

                        <p className="mt-3 text-center text-xs text-gray-400">
                            You&apos;ll be taken to Stripe to pay securely.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stays mounted and self-hides — it resets its form on re-open. */}
            <AddressFormModal
                open={addrModalOpen}
                onClose={() => setAddrModalOpen(false)}
                onSaved={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
                    await queryClient.refetchQueries({ queryKey: ["addresses"] });
                    setAddrModalOpen(false);
                }}
            />
        </div>
    );
}
