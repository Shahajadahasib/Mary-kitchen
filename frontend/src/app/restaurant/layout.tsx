"use client";

import Link from "next/link";
import { ChefHat, ShoppingBasket } from "lucide-react";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { useStoreProfile } from "@/hooks/useStoreProfile";
import { useAuthStore } from "@/store/authStore";

/**
 * Shell for the restaurant storefront.
 *
 * Deliberately minimal while Phase 3 only needs the segment to exist and route
 * correctly. Phase 4 fills in menu browse/detail/cart/checkout and will grow
 * this header into a real nav (cart badge, account menu, category links) —
 * likely by extracting a `RestaurantHeader` component the way the grocery shop
 * has `components/layout/Header.tsx`.
 *
 * The restaurant shares the grocery shop's `StoreProfile` (same physical
 * location, same delivery zones), so contact/hours data comes from the same
 * hook the grocery nav already uses.
 */
export default function RestaurantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: store } = useStoreProfile();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hasHydrated = useAuthStore((s) => s.hasHydrated);
    const signedIn = hasHydrated && isAuthenticated;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <ScrollToTop />

            <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-lg">
                <div className="container-xl">
                    <div className="flex items-center gap-4 py-3">
                        <Link
                            href="/restaurant"
                            className="flex items-center gap-2 font-bold text-lg sm:text-xl flex-shrink-0"
                        >
                            <ChefHat
                                className="w-7 h-7 flex-shrink-0"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <span className="leading-tight">
                                Mary Ben&apos;s Kitchen
                                <span className="hidden sm:inline">
                                    {" "}
                                    Restaurant
                                </span>
                            </span>
                        </Link>

                        <nav className="ml-auto flex items-center gap-2 sm:gap-4 text-sm">
                            <Link
                                href="/shop"
                                className="hidden sm:inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                            >
                                <ShoppingBasket
                                    className="w-4 h-4"
                                    aria-hidden="true"
                                />
                                Grocery shop
                            </Link>
                            <Link
                                href={signedIn ? "/shop/orders" : "/login"}
                                className="font-medium text-white/90 hover:text-white transition-colors"
                            >
                                {signedIn ? "My orders" : "Sign in"}
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="bg-gray-900 text-gray-400 text-sm">
                <div className="container-xl py-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <p>
                        {store?.name || "Mary Ben's Kitchen"}
                        {store?.address ? ` — ${store.address}` : ""}
                        {store?.suburb ? `, ${store.suburb}` : ""}
                        {store?.state ? ` ${store.state}` : ""}
                    </p>
                    <nav className="sm:ml-auto flex flex-wrap gap-4">
                        <Link href="/" className="hover:text-white transition-colors">
                            Home
                        </Link>
                        <Link
                            href="/shop"
                            className="hover:text-white transition-colors"
                        >
                            Grocery shop
                        </Link>
                        <Link
                            href="/shop/contact"
                            className="hover:text-white transition-colors"
                        >
                            Contact
                        </Link>
                    </nav>
                </div>
            </footer>
        </div>
    );
}
