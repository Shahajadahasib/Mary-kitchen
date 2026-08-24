"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, ShoppingBag, ShoppingBasket } from "lucide-react";
import { useEffect } from "react";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { authHref } from "@/lib/authRedirect";
import { useStoreProfile } from "@/hooks/useStoreProfile";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantCart } from "@/store/cartStore";

/**
 * Chrome for the restaurant storefront.
 *
 * The restaurant shares the grocery shop's `StoreProfile` (same physical
 * location, same delivery zones), so contact details come from the same hook
 * the grocery nav uses. The cart badge reads the *restaurant* cart only —
 * `useRestaurantCart` is a separate store instance from the grocery one, so the
 * two counts can never cross over.
 */
export default function RestaurantShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: store } = useStoreProfile();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hasHydrated = useAuthStore((s) => s.hasHydrated);
    const pathname = usePathname();
    const { cart, fetchCart } = useRestaurantCart();

    const signedIn = hasHydrated && isAuthenticated;
    const cartCount = cart?.items?.length ?? 0;

    useEffect(() => {
        if (isAuthenticated) fetchCart();
    }, [isAuthenticated, fetchCart]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <ScrollToTop />

            <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-lg">
                <div className="container-xl">
                    <div className="flex items-center gap-3 sm:gap-4 py-3">
                        <Link
                            href="/restaurant"
                            className="flex items-center gap-2 font-bold text-base sm:text-xl flex-shrink-0"
                        >
                            <ChefHat
                                className="w-7 h-7 flex-shrink-0"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <span className="leading-tight">
                                Mary Ben&apos;s Kitchen
                                <span className="hidden sm:inline"> Restaurant</span>
                            </span>
                        </Link>

                        <nav className="ml-auto flex items-center gap-3 sm:gap-5 text-sm">
                            <Link
                                href="/shop"
                                className="hidden md:inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                            >
                                <ShoppingBasket className="w-4 h-4" aria-hidden="true" />
                                Grocery shop
                            </Link>

                            {signedIn && (
                                <Link
                                    href="/restaurant/orders"
                                    className="hidden sm:inline text-white/90 hover:text-white transition-colors"
                                >
                                    My orders
                                </Link>
                            )}

                            <Link
                                href="/restaurant/cart"
                                className="relative inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                                aria-label={`Your order (${cartCount} item${cartCount === 1 ? "" : "s"})`}
                            >
                                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                                <span className="hidden sm:inline">Order</span>
                                {cartCount > 0 && (
                                    <span className="absolute -top-1.5 -left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-700">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>

                            {!signedIn && (
                                <Link
                                    href={authHref("/login", pathname)}
                                    className="font-medium text-white/90 hover:text-white transition-colors"
                                >
                                    Sign in
                                </Link>
                            )}
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
                        <Link href="/shop" className="hover:text-white transition-colors">
                            Grocery shop
                        </Link>
                        <Link
                            href="/shop/delivery"
                            className="hover:text-white transition-colors"
                        >
                            Delivery info
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
