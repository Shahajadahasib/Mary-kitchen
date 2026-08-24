import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";

export const metadata: Metadata = {
    title: "Restaurant — Takeaway & Delivery",
    description:
        "Mary Ben's Kitchen Restaurant in Darwin NT — home-style cooked meals for takeaway or delivery.",
    alternates: {
        canonical: "https://marybenskitchen.com/restaurant",
    },
};

/**
 * Placeholder restaurant landing page.
 *
 * Phase 4 replaces this with the real menu browse (category + dietary-tag
 * filters over `GET /api/v1/menu/`), with item detail and the modifier picker
 * at `restaurant/[slug]/page.tsx`.
 */
export default function RestaurantHomePage() {
    return (
        <div className="container-xl py-16 sm:py-24">
            <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
                    <UtensilsCrossed
                        className="h-8 w-8 text-brand-700"
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </div>

                <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900">
                    Our menu is on its way
                </h1>
                <p className="mt-3 text-gray-600 leading-relaxed">
                    Mary Ben&apos;s Kitchen Restaurant is opening for online
                    takeaway and delivery orders shortly. In the meantime, our
                    grocery shop is open and delivering across Darwin.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/shop" className="btn-primary inline-flex justify-center">
                        Browse the grocery shop
                    </Link>
                    <Link
                        href="/"
                        className="btn-secondary inline-flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
