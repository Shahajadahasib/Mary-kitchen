"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Package, ShoppingBag, ShoppingBasket, UserRound } from "lucide-react";
import { useEffect } from "react";
import VisitTracker from "@/components/analytics/VisitTracker";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { authHref } from "@/lib/authRedirect";
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
            {/* Both storefronts must record visits: the admin conversion metric
                divides paid orders from *both* channels by the visit count, so
                tracking only the grocery shop overstated the rate. */}
            <VisitTracker />

            {/* Solid rather than translucent on purpose: this bar sits over the
                hero photograph at the top of /restaurant and over white content
                once scrolled, and a blurred bar cannot be legible against both.
                The action icons share the `header-action` skin with the grocery
                header, so the two storefronts feel like one product. */}
            <header className="sticky top-0 z-50 bg-brand-600 text-white shadow-lg">
                <div className="container-xl">
                    <div className="flex items-center gap-2 py-2.5 sm:gap-4">
                        <Link
                            href="/restaurant"
                            className="flex min-w-0 items-center gap-2 rounded-lg text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-xl"
                        >
                            <ChefHat
                                className="h-7 w-7 flex-shrink-0"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <span className="truncate leading-tight">
                                Mary Ben&apos;s Kitchen
                                <span className="hidden sm:inline"> Restaurant</span>
                            </span>
                        </Link>

                        <nav className="ml-auto flex flex-shrink-0 items-center gap-1 text-sm sm:gap-2">
                            {signedIn && (
                                <Link
                                    href="/restaurant/orders"
                                    className="header-action hidden sm:inline-flex lg:w-auto lg:gap-2 lg:px-3.5"
                                    aria-label="My orders"
                                >
                                    <Package
                                        className="h-5 w-5 shrink-0"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    <span className="hidden font-medium lg:inline">
                                        My orders
                                    </span>
                                </Link>
                            )}

                            {!signedIn && (
                                <Link
                                    href={authHref("/login", pathname)}
                                    className="header-action lg:w-auto lg:gap-2 lg:px-3.5"
                                    aria-label="Sign in"
                                >
                                    <UserRound
                                        className="h-5 w-5 shrink-0"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    <span className="hidden font-medium lg:inline">
                                        Sign in
                                    </span>
                                </Link>
                            )}

                            <Link
                                href="/restaurant/cart"
                                className="header-action group lg:w-auto lg:gap-2 lg:px-3.5"
                                aria-label={`Your order (${cartCount} item${cartCount === 1 ? "" : "s"})`}
                            >
                                <ShoppingBag
                                    className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                <span className="hidden font-medium lg:inline">
                                    Order
                                </span>
                                {cartCount > 0 && (
                                    <span
                                        key={cartCount}
                                        className="header-badge bg-white text-brand-800 ring-2 ring-brand-700"
                                    >
                                        {cartCount > 9 ? "9+" : cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* Reciprocal of the "Restaurant" button in the
                                grocery header's action row — same placement
                                rule, same green-vs-terracotta signalling. */}
                            <Link
                                href="/shop"
                                className="header-action bg-primary-50 text-primary-800 shadow-sm ring-primary-900/10 hover:bg-white hover:ring-primary-900/20 focus-visible:ring-white lg:w-auto lg:gap-2 lg:px-3.5"
                                aria-label="Grocery shop"
                            >
                                <ShoppingBasket
                                    className="h-5 w-5 shrink-0"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                <span className="hidden font-semibold lg:inline">
                                    Grocery
                                </span>
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <Footer channel="restaurant" />
        </div>
    );
}
