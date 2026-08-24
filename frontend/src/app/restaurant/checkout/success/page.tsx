"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import { useRestaurantCart } from "@/store/cartStore";

/**
 * Stripe return page for restaurant orders.
 *
 * Stripe redirects here from `checkout_success_url` in core/frontend_urls.py.
 * Verification is retried a few times because the webhook that marks the order
 * paid can land fractionally after the customer is redirected back.
 */
export default function RestaurantCheckoutSuccessPage() {
    const router = useRouter();
    const fetchCart = useRestaurantCart((s) => s.fetchCart);
    const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        if (!sessionId) {
            setStatus("error");
            setMessage(
                "Missing checkout session. Please return to checkout and try again."
            );
            return;
        }

        let cancelled = false;

        const verifyCheckout = async () => {
            const maxAttempts = 4;
            let lastError: any = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                try {
                    const res = await api.get("/payments/checkout-session/", {
                        params: { session_id: sessionId },
                    });
                    const body = res.data;
                    if (!body.success) {
                        throw { response: { status: 400, data: body } };
                    }
                    if (cancelled) return;
                    setOrderNumber(body.data.order_number);
                    setStatus("ok");
                    void fetchCart();
                    return;
                } catch (err) {
                    lastError = err;
                    if (attempt < maxAttempts) {
                        await new Promise((resolve) =>
                            window.setTimeout(resolve, attempt * 1000)
                        );
                    }
                }
            }

            if (cancelled) return;
            const statusCode = lastError?.response?.status;
            const serverMessage = lastError?.response?.data?.message;
            setStatus("error");
            setMessage(
                serverMessage ||
                    (statusCode
                        ? `Payment succeeded, but verification returned ${statusCode}. Please check your orders.`
                        : "Payment succeeded, but we could not reach the verification API. Please check your orders.")
            );
            void fetchCart();
        };

        void verifyCheckout();
        return () => {
            cancelled = true;
        };
    }, [fetchCart]);

    if (status === "loading") {
        return (
            <div className="container-xl mx-auto max-w-lg space-y-4 py-16 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
                <p className="text-sm text-gray-600">Confirming your payment…</p>
                <Skeleton className="h-24 rounded-xl" />
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="container-xl mx-auto max-w-lg space-y-4 py-16 text-center">
                <h1 className="text-xl font-bold text-gray-900">
                    Could not confirm your order
                </h1>
                <p className="text-sm text-gray-600">{message}</p>
                <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
                    <Link
                        href="/restaurant/checkout"
                        className="inline-flex justify-center rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
                    >
                        Back to checkout
                    </Link>
                    <Link
                        href="/restaurant/orders"
                        className="btn-secondary inline-flex justify-center"
                    >
                        View orders
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container-xl mx-auto max-w-lg space-y-6 py-16 text-center">
            <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
            </div>
            <h1 className="section-title">Order confirmed</h1>
            <p className="text-gray-600">
                Thanks — the kitchen has your order. Order{" "}
                <span className="font-semibold text-gray-900">#{orderNumber}</span>{" "}
                is confirmed and we&apos;ll email you as it progresses.
            </p>
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
                <Link
                    href={
                        orderNumber
                            ? `/restaurant/orders/${encodeURIComponent(orderNumber)}`
                            : "/restaurant/orders"
                    }
                    className="inline-flex justify-center rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
                >
                    Track order
                </Link>
                <button
                    type="button"
                    onClick={() => router.push("/restaurant")}
                    className="btn-secondary"
                >
                    Order more
                </button>
            </div>
        </div>
    );
}
