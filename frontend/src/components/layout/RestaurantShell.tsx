"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    ChefHat,
    ChevronRight,
    LogOut,
    Menu,
    Package,
    ShoppingBag,
    ShoppingBasket,
    UserRound,
    UtensilsCrossed,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import VisitTracker from "@/components/analytics/VisitTracker";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/layout/ScrollToTop";
import api from "@/lib/api";
import { authHref } from "@/lib/authRedirect";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantCart } from "@/store/cartStore";
import type { MenuCategory } from "@/types/menu";

/**
 * Chrome for the restaurant storefront.
 *
 * The restaurant shares the grocery shop's `StoreProfile` (same physical
 * location, same delivery zones), so contact details come from the same hook
 * the grocery nav uses. The cart badge reads the *restaurant* cart only —
 * `useRestaurantCart` is a separate store instance from the grocery one, so the
 * two counts can never cross over.
 *
 * This header carries a mobile drawer, which it went without for a while: the
 * grocery side had a hamburger and this one did not, so on a phone the account
 * links and the category list had no home at all here.
 */
export default function RestaurantShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, hasHydrated, logout } = useAuthStore();
    const { cart, fetchCart } = useRestaurantCart();
    const [menuOpen, setMenuOpen] = useState(false);

    const signedIn = hasHydrated && isAuthenticated;
    const cartCount = cart?.items?.length ?? 0;

    const { data: categoriesData } = useQuery({
        queryKey: ["menu-categories"],
        queryFn: () => api.get("/menu/categories/").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });
    const categories: MenuCategory[] =
        categoriesData?.results ?? categoriesData ?? [];

    useEffect(() => {
        if (isAuthenticated) fetchCart();
    }, [isAuthenticated, fetchCart]);

    // Prevent the page behind the drawer from scrolling with it.
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            setMenuOpen(false);
            router.push("/restaurant");
        }
    };

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
                            className="flex min-w-0 items-center gap-2 rounded-lg text-base font-bold transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-xl"
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
                                    className="header-action hidden md:inline-flex lg:w-auto lg:gap-2 lg:px-3.5"
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
                                    className="header-action hidden md:inline-flex lg:w-auto lg:gap-2 lg:px-3.5"
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
                                        className="header-badge bg-white text-brand-800 ring-2 ring-brand-600"
                                    >
                                        {cartCount > 9 ? "9+" : cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* Reciprocal of the "Restaurant" button in the
                                grocery header's action row — same placement
                                rule, same pale-plate treatment so the two
                                saturated brand colours never touch. */}
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

                            <button
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-label={menuOpen ? "Close menu" : "Open menu"}
                                aria-expanded={menuOpen}
                                className="header-action md:hidden"
                            >
                                {menuOpen ? (
                                    <X className="h-5 w-5" strokeWidth={1.75} />
                                ) : (
                                    <Menu className="h-5 w-5" strokeWidth={1.75} />
                                )}
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Mobile drawer */}
                {menuOpen && (
                    <div className="fixed inset-0 top-[60px] z-40 overflow-y-auto bg-brand-700 md:hidden">
                        <div className="flex flex-col gap-1 p-4">
                            {signedIn && user ? (
                                <div className="mb-2 flex items-center gap-3 rounded-xl bg-brand-800 px-3 py-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold uppercase ring-1 ring-white/20">
                                        {user.first_name?.[0] ?? (
                                            <UserRound className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-white">
                                            {user.full_name}
                                        </p>
                                        <p className="truncate text-xs text-brand-100/80">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    href={authHref("/login", pathname)}
                                    onClick={() => setMenuOpen(false)}
                                    className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-700"
                                >
                                    <UserRound className="h-4 w-4" /> Sign in /
                                    Register
                                </Link>
                            )}

                            <Link
                                href="/shop"
                                onClick={() => setMenuOpen(false)}
                                className="mb-1 flex items-center justify-between rounded-xl bg-primary-50 px-3 py-3 font-semibold text-primary-800 shadow-sm transition-colors hover:bg-white"
                            >
                                <span className="flex items-center gap-2">
                                    <ShoppingBasket
                                        className="h-5 w-5"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    Grocery Shop
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>

                            <p className="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-brand-200">
                                Menu
                            </p>
                            <Link
                                href="/restaurant"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-brand-100 transition-colors hover:bg-brand-600 hover:text-white"
                            >
                                <span className="flex items-center gap-2">
                                    <UtensilsCrossed className="h-4 w-4" /> All
                                    dishes
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                            {categories.map((c) => (
                                <Link
                                    key={c.id}
                                    href={`/restaurant?category=${c.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-brand-100 transition-colors hover:bg-brand-600 hover:text-white"
                                >
                                    {c.name}
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            ))}

                            <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-brand-200">
                                Your order
                            </p>
                            <Link
                                href="/restaurant/cart"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-brand-100 transition-colors hover:bg-brand-600 hover:text-white"
                            >
                                <span className="flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4" /> Cart
                                    {cartCount > 0 && (
                                        <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-bold text-brand-800">
                                            {cartCount}
                                        </span>
                                    )}
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>

                            {signedIn && (
                                <>
                                    <Link
                                        href="/restaurant/orders"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-brand-100 transition-colors hover:bg-brand-600 hover:text-white"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Package className="h-4 w-4" /> My
                                            orders
                                        </span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-red-200 transition-colors hover:bg-brand-600 hover:text-red-100"
                                    >
                                        <LogOut className="h-4 w-4" /> Sign Out
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <Footer channel="restaurant" />
        </div>
    );
}
