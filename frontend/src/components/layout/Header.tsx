"use client";
import MediaImage from "@/components/ui/MediaImage";
import SearchAutocomplete from "@/components/layout/SearchAutocomplete";
import { useStoreProfile } from "@/hooks/useStoreProfile";
import api from "@/lib/api";
import { authHref } from "@/lib/authRedirect";
import { useAuthStore } from "@/store/authStore";
import { useGroceryCart } from "@/store/cartStore";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    Bell,
    ChefHat,
    ChevronRight,
    LogOut,
    Menu,
    Package,
    Search,
    ShoppingBag,
    UserRound,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavCategory = { id: string; name: string; slug: string };

/** Counts above this are shown as "9+" — the bubble is 18px wide. */
const BADGE_CAP = 9;

const cap = (n: number) => (n > BADGE_CAP ? `${BADGE_CAP}+` : String(n));

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const loginHref = authHref("/login", pathname);
    const { cart, fetchCart } = useGroceryCart();
    const { user, isAuthenticated, hasHydrated, logout } = useAuthStore();
    const { data: storeProfile } = useStoreProfile();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const { data: unreadCount } = useQuery({
        queryKey: ["unread-notifications"],
        queryFn: () =>
            api
                .get("/notifications/unread-count/")
                .then((r) => r.data.unread_count),
        enabled: isAuthenticated,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    });

    const { data: categoriesData } = useQuery({
        queryKey: ["categories"],
        queryFn: () => api.get("/products/categories/").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const navCategories: NavCategory[] =
        categoriesData?.results ?? categoriesData ?? [];

    useEffect(() => {
        if (isAuthenticated) fetchCart();
    }, [isAuthenticated, fetchCart]);

    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false);
        setSearchOpen(false);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!userMenuRef.current?.contains(target)) setUserMenuOpen(false);
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            router.push("/shop");
        }
    };

    const closeAll = () => {
        setMenuOpen(false);
        setSearchOpen(false);
        setUserMenuOpen(false);
    };

    const cartCount = cart?.items?.length || 0;
    // The auth store is persisted and rehydrates after the first paint, so
    // `isAuthenticated` is false for that first frame. Gate the chrome on
    // hydration — as RestaurantShell and Footer already do — otherwise a
    // signed-in user sees "Login" flash before their name appears.
    const signedIn = hasHydrated && isAuthenticated;
    const showVerifyBanner = signedIn && user && !user.is_email_verified;

    /**
     * Cross-link to the restaurant storefront.
     *
     * It lives in the action row, not in the category strip below: it is not a
     * grocery category, and sitting among them it read as one more aisle to
     * browse. In the action row it sits directly after the account control
     * (Login for guests, the profile menu once signed in), which is where a
     * "switch storefront" action belongs. The terracotta fill is the
     * restaurant's own accent, so the button announces where it leads before
     * the label is read.
     */
    const restaurantLink = (
        <Link
            href="/restaurant"
            onClick={closeAll}
            aria-label="Restaurant menu"
            className="header-action bg-brand-50 text-brand-800 shadow-sm ring-brand-900/10 hover:bg-white hover:ring-brand-900/20 focus-visible:ring-white lg:w-auto lg:gap-2 lg:px-3.5"
        >
            <ChefHat
                className="h-5 w-5 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
            />
            <span className="hidden text-sm font-semibold lg:inline">
                Restaurant
            </span>
        </Link>
    );

    return (
        <>
            <header className="sticky top-0 z-50 bg-primary-700 text-white shadow-lg">
                {/* Main header bar */}
                <div className="container-xl">
                    <div className="flex items-center gap-2 py-2.5 sm:gap-4">
                        {/* Logo */}
                        <Link
                            href="/shop"
                            className="flex min-w-0 items-center gap-2 rounded-lg text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            {storeProfile?.logo_url ? (
                                <MediaImage
                                    src={storeProfile.logo_url}
                                    alt={storeProfile.name}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-lg object-cover"
                                />
                            ) : (
                                <ShoppingBag className="h-7 w-7" strokeWidth={1.75} />
                            )}
                            <span className="truncate text-sm font-bold leading-tight md:text-lg">
                                {storeProfile?.name || "Mary Ben's Kitchen"}
                            </span>
                        </Link>

                        {/* Desktop search (hides itself below md) */}
                        <SearchAutocomplete onNavigate={closeAll} />

                        {/* Actions */}
                        <div className="ml-auto flex flex-shrink-0 items-center gap-1 sm:gap-2 md:ml-0">
                            {/* Mobile search toggle */}
                            <button
                                onClick={() => {
                                    setSearchOpen(!searchOpen);
                                    setMenuOpen(false);
                                }}
                                aria-label={
                                    searchOpen ? "Close search" : "Open search"
                                }
                                aria-expanded={searchOpen}
                                className="header-action md:hidden"
                            >
                                {searchOpen ? (
                                    <X className="h-5 w-5" strokeWidth={1.75} />
                                ) : (
                                    <Search className="h-5 w-5" strokeWidth={1.75} />
                                )}
                            </button>

                            {/* Cart */}
                            <Link
                                href="/shop/cart"
                                className="header-action group"
                                aria-label={`Cart (${cartCount} item${cartCount === 1 ? "" : "s"})`}
                            >
                                <ShoppingBag
                                    className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                {cartCount > 0 && (
                                    <span
                                        key={cartCount}
                                        className="header-badge bg-brand-700 text-white ring-2 ring-primary-700"
                                    >
                                        {cap(cartCount)}
                                    </span>
                                )}
                            </Link>

                            {/* Notifications — hidden on mobile (shown in the drawer) */}
                            {signedIn && (
                                <Link
                                    href="/shop/notifications"
                                    className="header-action group hidden sm:inline-flex"
                                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                                >
                                    <Bell
                                        className="h-5 w-5 origin-top group-hover:animate-bell-swing"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    {unreadCount > 0 && (
                                        <span
                                            key={unreadCount}
                                            className="header-badge bg-red-500 text-white ring-2 ring-primary-700"
                                        >
                                            {cap(unreadCount)}
                                        </span>
                                    )}
                                </Link>
                            )}

                            {/* Account — desktop only */}
                            {signedIn ? (
                                <div
                                    className="relative hidden md:block"
                                    ref={userMenuRef}
                                >
                                    <button
                                        onClick={() =>
                                            setUserMenuOpen(!userMenuOpen)
                                        }
                                        aria-haspopup="menu"
                                        aria-expanded={userMenuOpen}
                                        className={`header-action-wide ${userMenuOpen ? "bg-white/20 ring-white/30" : ""}`}
                                    >
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold uppercase">
                                            {user?.first_name?.[0] ?? (
                                                <UserRound
                                                    className="h-3.5 w-3.5"
                                                    strokeWidth={2}
                                                />
                                            )}
                                        </span>
                                        <span className="max-w-[7rem] truncate text-sm font-medium">
                                            {user?.first_name}
                                        </span>
                                    </button>
                                    {userMenuOpen && (
                                        <div
                                            role="menu"
                                            className="absolute right-0 top-full z-50 mt-2 w-52 animate-dropdown-in overflow-hidden rounded-xl border border-gray-100 bg-white py-1 text-gray-700 shadow-2xl"
                                        >
                                            <Link
                                                href="/shop/profile"
                                                role="menuitem"
                                                onClick={() =>
                                                    setUserMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                                            >
                                                <UserRound className="h-4 w-4 text-gray-400" />{" "}
                                                My Profile
                                            </Link>
                                            <Link
                                                href="/shop/orders"
                                                role="menuitem"
                                                onClick={() =>
                                                    setUserMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                                            >
                                                <Package className="h-4 w-4 text-gray-400" />{" "}
                                                My Orders
                                            </Link>
                                            {user?.is_staff && (
                                                <Link
                                                    href="/admin"
                                                    role="menuitem"
                                                    onClick={() =>
                                                        setUserMenuOpen(false)
                                                    }
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                                                >
                                                    Admin Panel
                                                </Link>
                                            )}
                                            <hr className="my-1" />
                                            <button
                                                role="menuitem"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                                            >
                                                <LogOut className="h-4 w-4" />{" "}
                                                Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href={loginHref}
                                    className="hidden h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary-700 shadow-sm transition duration-200 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 md:flex"
                                >
                                    <UserRound
                                        className="h-4 w-4"
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    />{" "}
                                    Login
                                </Link>
                            )}

                            {/* Restaurant storefront — immediately after the
                                account control at every breakpoint. */}
                            {restaurantLink}

                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => {
                                    setMenuOpen(!menuOpen);
                                    setSearchOpen(false);
                                }}
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
                        </div>
                    </div>
                </div>

                {/* Desktop category strip. Horizontally scrollable when the
                    catalogue outgrows the viewport — `scrollbar-slim-inverse`
                    gives it a 6px rounded thumb tuned for a dark surface
                    instead of the browser's default bar. */}
                <div className="hidden bg-primary-800 md:block">
                    <div className="container-xl">
                        <nav
                            aria-label="Product categories"
                            className="scrollbar-slim-inverse flex gap-1 overflow-x-auto pb-1.5 pt-1.5"
                        >
                            <Link
                                href="/shop/products"
                                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-primary-100 transition-colors hover:bg-primary-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                All Products
                            </Link>
                            {navCategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={`/shop/products?category=${cat.slug}`}
                                    className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-primary-100 transition-colors hover:bg-primary-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                >
                                    {cat.name}
                                </Link>
                            ))}
                            <Link
                                href="/shop/products/deals"
                                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-brand-200 transition-colors hover:bg-primary-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                🔥 Deals
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Mobile search sheet */}
                {searchOpen && (
                    <div className="animate-fade-in bg-primary-800 px-3 py-2.5 md:hidden">
                        <SearchAutocomplete
                            variant="panel"
                            autoFocus
                            onNavigate={closeAll}
                        />
                    </div>
                )}

                {/* Mobile full-screen menu */}
                {menuOpen && (
                    <div className="fixed inset-0 top-[60px] z-40 overflow-y-auto bg-primary-800 md:hidden">
                        <div className="flex flex-col gap-1 p-4">
                            {/* User info */}
                            {signedIn && user && (
                                <div className="mb-2 flex items-center gap-3 rounded-xl bg-primary-700 px-3 py-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-bold uppercase">
                                        {user.first_name?.[0] ?? (
                                            <UserRound className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-white">
                                            {user.full_name}
                                        </p>
                                        <p className="truncate text-xs text-primary-300">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Login button for guests */}
                            {!signedIn && (
                                <Link
                                    href={loginHref}
                                    onClick={() => setMenuOpen(false)}
                                    className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary-700 transition-colors"
                                >
                                    <UserRound className="h-4 w-4" /> Login /
                                    Register
                                </Link>
                            )}

                            {/* Cross-link to the restaurant storefront. Same
                                rule as the desktop action row: directly after
                                the account control, above the categories. */}
                            <Link
                                href="/restaurant"
                                onClick={() => setMenuOpen(false)}
                                className="mb-1 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-3 font-semibold text-brand-800 shadow-sm transition-colors hover:bg-white"
                            >
                                <span className="flex items-center gap-2">
                                    <ChefHat
                                        className="h-5 w-5"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    Restaurant Menu
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>

                            {/* Categories */}
                            <p className="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-primary-400">
                                Shop
                            </p>
                            <Link
                                href="/shop/products"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-primary-100 transition-colors hover:bg-primary-700 hover:text-white"
                            >
                                All Products{" "}
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                            {navCategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={`/shop/products?category=${cat.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-primary-100 transition-colors hover:bg-primary-700 hover:text-white"
                                >
                                    {cat.name}{" "}
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            ))}
                            <Link
                                href="/shop/products/deals"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-primary-100 transition-colors hover:bg-primary-700 hover:text-white"
                            >
                                🔥 Deals <ChevronRight className="h-4 w-4" />
                            </Link>

                            {/* Account links */}
                            {signedIn && (
                                <>
                                    <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-primary-400">
                                        Account
                                    </p>
                                    <Link
                                        href="/shop/profile"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-primary-100 transition-colors hover:bg-primary-700 hover:text-white"
                                    >
                                        <span className="flex items-center gap-2">
                                            <UserRound className="h-4 w-4" /> My
                                            Profile
                                        </span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href="/shop/orders"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-primary-100 transition-colors hover:bg-primary-700 hover:text-white"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Package className="h-4 w-4" /> My
                                            Orders
                                        </span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href="/shop/notifications"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-primary-100 transition-colors hover:bg-primary-700 hover:text-white"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Bell className="h-4 w-4" />{" "}
                                            Notifications
                                            {unreadCount > 0 && (
                                                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                    {user?.is_staff && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-primary-100 transition-colors hover:bg-primary-700 hover:text-white"
                                        >
                                            <span className="flex items-center gap-2">
                                                ⚙️ Admin Panel
                                            </span>
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setMenuOpen(false);
                                        }}
                                        className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-red-400 transition-colors hover:bg-primary-700 hover:text-red-300"
                                    >
                                        <LogOut className="h-4 w-4" /> Sign Out
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Email verification banner */}
            {showVerifyBanner && (
                <div className="border-b border-amber-200 bg-amber-50">
                    <div className="container-xl flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-amber-800">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="hidden sm:inline">
                                Your email address is not verified. Some
                                features may be restricted.
                            </span>
                            <span className="sm:hidden">
                                Email not verified.
                            </span>
                        </div>
                        <Link
                            href={`/verify-email?email=${encodeURIComponent(user.email)}`}
                            className="flex-shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                        >
                            Verify Email
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
