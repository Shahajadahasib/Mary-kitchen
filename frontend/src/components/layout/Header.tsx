"use client";
import { useStoreProfile } from "@/hooks/useStoreProfile";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    Bell,
    ChevronRight,
    LogOut,
    Menu,
    Package,
    Search,
    ShoppingBag,
    ShoppingCart,
    User,
    X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavCategory = { id: string; name: string; slug: string };

type ProductSuggestion = {
    id: string;
    name: string;
    slug: string;
    base_price: string | number;
    sale_price?: string | number | null;
    primary_image?: string | null;
};

export default function Header() {
    const router = useRouter();
    const { cart, fetchCart } = useCartStore();
    const { user, isAuthenticated, logout } = useAuthStore();
    const { data: storeProfile } = useStoreProfile();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLFormElement>(null);
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
        const query = search.trim();
        if (query.length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        let active = true;
        const delay = window.setTimeout(async () => {
            try {
                setLoadingSuggestions(true);
                const res = await api.get(
                    `/products/?search=${encodeURIComponent(query)}&limit=5`,
                );
                const results = res.data.results || res.data || [];
                if (active) {
                    setSuggestions(results.slice(0, 5));
                    setShowDropdown(true);
                }
            } catch (err) {
                console.error(err);
                if (active) setSuggestions([]);
            } finally {
                if (active) setLoadingSuggestions(false);
            }
        }, 300);
        return () => {
            active = false;
            window.clearTimeout(delay);
        };
    }, [search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!userMenuRef.current?.contains(target)) setUserMenuOpen(false);
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const handleSearchBlur = () => {
        setTimeout(() => setShowDropdown(false), 200);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (search.trim()) {
            router.push(`/products?search=${encodeURIComponent(search)}`);
            setSearch("");
            setShowDropdown(false);
            setSearchOpen(false);
            setMenuOpen(false);
        }
    };

    const handleSuggestionClick = (item: ProductSuggestion) => {
        router.push(`/products/${item.slug}`);
        setSearch("");
        setShowDropdown(false);
        setSearchOpen(false);
        setMenuOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            router.push("/");
        }
    };

    const cartCount = cart?.items?.length || 0;
    const showVerifyBanner = isAuthenticated && user && !user.is_email_verified;

    return (
        <>
            <header className="bg-primary-700 text-white sticky top-0 z-50 shadow-lg">
                {/* Main header bar */}
                <div className="container-xl">
                    <div className="flex items-center gap-2 sm:gap-4 py-3">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="flex items-center gap-2 font-bold text-xl flex-shrink-0"
                        >
                            {storeProfile?.logo_url ? (
                                <Image
                                    src={storeProfile.logo_url}
                                    alt={storeProfile.name}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-lg object-cover"
                                />
                            ) : (
                                <ShoppingBag className="w-7 h-7" />
                            )}
                            <span className="text-sm font-bold leading-tight block md:text-lg">
                                {storeProfile?.name || "Mary Ben's Kitchen"}
                            </span>
                        </Link>

                        {/* Desktop Search */}
                        <form
                            ref={searchRef}
                            onSubmit={handleSearch}
                            className="relative flex-1 max-w-2xl hidden md:flex"
                        >
                            <div className="flex w-full">
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onFocus={() => {
                                        if (
                                            search.trim().length >= 2 &&
                                            suggestions.length > 0
                                        )
                                            setShowDropdown(true);
                                    }}
                                    onBlur={handleSearchBlur}
                                    placeholder="Search groceries, fish, meat..."
                                    className="flex-1 px-4 py-2 text-gray-900 rounded-l-lg text-base focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="bg-brand-500 hover:bg-brand-600 px-4 rounded-r-lg transition-colors"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </div>
                            {showDropdown &&
                                (suggestions.length > 0 ||
                                    loadingSuggestions) && (
                                    <div className="absolute left-0 top-full mt-1 w-full overflow-hidden rounded-xl bg-white text-gray-800 shadow-xl border border-gray-100 z-50">
                                        {loadingSuggestions &&
                                        suggestions.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-gray-500">
                                                Searching...
                                            </div>
                                        ) : (
                                            suggestions.map((item) => {
                                                const price =
                                                    item.sale_price ??
                                                    item.base_price;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() =>
                                                            handleSuggestionClick(
                                                                item,
                                                            )
                                                        }
                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                                                    >
                                                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                                                            {item.primary_image ? (
                                                                <Image
                                                                    src={
                                                                        item.primary_image
                                                                    }
                                                                    alt={
                                                                        item.name
                                                                    }
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="40px"
                                                                />
                                                            ) : (
                                                                <ShoppingBag className="m-2 h-6 w-6 text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-gray-900">
                                                                {item.name}
                                                            </p>
                                                            <p className="text-xs font-semibold text-primary-700">
                                                                {formatCurrency(
                                                                    price,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                        {search.trim().length >= 2 && (
                                            <button
                                                type="submit"
                                                className="w-full border-t border-gray-100 px-4 py-2.5 text-left text-sm font-semibold text-primary-700 hover:bg-primary-50"
                                            >
                                                View all results for &quot;
                                                {search.trim()}&quot;
                                            </button>
                                        )}
                                    </div>
                                )}
                        </form>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto md:ml-0">
                            {/* Mobile search toggle */}
                            <button
                                onClick={() => {
                                    setSearchOpen(!searchOpen);
                                    setMenuOpen(false);
                                }}
                                className="md:hidden p-2 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                                {searchOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Search className="w-5 h-5" />
                                )}
                            </button>

                            {/* Cart */}
                            <Link
                                href="/cart"
                                className="relative p-2 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                                <ShoppingCart className="w-6 h-6" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                        {cartCount > 9 ? "9+" : cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* Notifications — hidden on mobile (shown in mobile menu) */}
                            {isAuthenticated && (
                                <Link
                                    href="/notifications"
                                    className="relative p-2 hover:bg-primary-600 rounded-lg transition-colors hidden sm:flex"
                                >
                                    <Bell className="w-6 h-6" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                            {unreadCount > 9
                                                ? "9+"
                                                : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            )}

                            {/* User Menu — desktop only */}
                            {isAuthenticated ? (
                                <div
                                    className="relative hidden md:block"
                                    ref={userMenuRef}
                                >
                                    <button
                                        onClick={() =>
                                            setUserMenuOpen(!userMenuOpen)
                                        }
                                        className="flex items-center gap-2 p-2 hover:bg-primary-600 rounded-lg transition-colors"
                                    >
                                        <User className="w-6 h-6" />
                                        <span className="hidden md:block text-sm font-medium">
                                            {user?.first_name}
                                        </span>
                                    </button>
                                    {userMenuOpen && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white text-gray-700 rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                                            <Link
                                                href="/profile"
                                                onClick={() =>
                                                    setUserMenuOpen(false)
                                                }
                                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm"
                                            >
                                                <User className="w-4 h-4" /> My
                                                Profile
                                            </Link>
                                            <Link
                                                href="/orders"
                                                onClick={() =>
                                                    setUserMenuOpen(false)
                                                }
                                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm"
                                            >
                                                <Package className="w-4 h-4" />{" "}
                                                My Orders
                                            </Link>
                                            {user?.is_staff && (
                                                <Link
                                                    href="/admin"
                                                    onClick={() =>
                                                        setUserMenuOpen(false)
                                                    }
                                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-primary-700 font-medium"
                                                >
                                                    Admin Panel
                                                </Link>
                                            )}
                                            <hr className="my-1" />
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-red-600 w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />{" "}
                                                Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="hidden md:flex items-center gap-2 bg-white text-primary-700 hover:bg-gray-50 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                                >
                                    <User className="w-4 h-4" /> Login
                                </Link>
                            )}

                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => {
                                    setMenuOpen(!menuOpen);
                                    setSearchOpen(false);
                                }}
                                className="md:hidden p-2 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                                {menuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Desktop nav bar */}
                <div className="bg-primary-800 hidden md:block">
                    <div className="container-xl">
                        <nav className="flex gap-1 py-1 overflow-x-auto">
                            <Link
                                href="/products"
                                className="px-3 py-1.5 text-sm text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors whitespace-nowrap"
                            >
                                All Products
                            </Link>
                            {navCategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={`/products?category=${cat.slug}`}
                                    className="px-3 py-1.5 text-sm text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors whitespace-nowrap"
                                >
                                    {cat.name}
                                </Link>
                            ))}
                            <Link
                                href="/products/deals"
                                className="px-3 py-1.5 text-sm text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors whitespace-nowrap"
                            >
                                🔥 Deals
                            </Link>
                        </nav>
                    </div>
                </div>
                {/* Mobile search bar — shown when searchOpen */}
                {searchOpen && (
                    <div className="md:hidden bg-primary-800 px-3 py-2">
                        <form
                            ref={searchRef}
                            onSubmit={handleSearch}
                            className="relative flex"
                        >
                            <input
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onBlur={handleSearchBlur}
                                placeholder="Search groceries, fish, meat..."
                                className="flex-1 px-4 py-2 text-gray-900 rounded-l-lg text-base focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="bg-brand-500 hover:bg-brand-600 px-4 rounded-r-lg transition-colors"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                            {showDropdown &&
                                (suggestions.length > 0 ||
                                    loadingSuggestions) && (
                                    <div className="absolute left-0 top-full mt-1 w-full overflow-hidden rounded-xl bg-white text-gray-800 shadow-xl border border-gray-100 z-50">
                                        {loadingSuggestions &&
                                        suggestions.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-gray-500">
                                                Searching...
                                            </div>
                                        ) : (
                                            suggestions.map((item) => {
                                                const price =
                                                    item.sale_price ??
                                                    item.base_price;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={item.id}
                                                        onClick={() =>
                                                            handleSuggestionClick(
                                                                item,
                                                            )
                                                        }
                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                                                    >
                                                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                                                            {item.primary_image ? (
                                                                <Image
                                                                    src={
                                                                        item.primary_image
                                                                    }
                                                                    alt={
                                                                        item.name
                                                                    }
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="40px"
                                                                />
                                                            ) : (
                                                                <ShoppingBag className="m-2 h-6 w-6 text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-gray-900">
                                                                {item.name}
                                                            </p>
                                                            <p className="text-xs font-semibold text-primary-700">
                                                                {formatCurrency(
                                                                    price,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                        {search.trim().length >= 2 && (
                                            <button
                                                type="submit"
                                                className="w-full border-t border-gray-100 px-4 py-2.5 text-left text-sm font-semibold text-primary-700 hover:bg-primary-50"
                                            >
                                                View all results for &quot;
                                                {search.trim()}&quot;
                                            </button>
                                        )}
                                    </div>
                                )}
                        </form>
                    </div>
                )}

                {/* Mobile full-screen menu */}
                {menuOpen && (
                    <div className="md:hidden fixed inset-0 top-[57px] bg-primary-800 z-40 overflow-y-auto">
                        <div className="flex flex-col p-4 gap-1">
                            {/* User info */}
                            {isAuthenticated && user && (
                                <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-primary-700 rounded-xl">
                                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">
                                            {user.full_name}
                                        </p>
                                        <p className="text-xs text-primary-300">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Login button for guests */}
                            {!isAuthenticated && (
                                <Link
                                    href="/login"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold text-sm px-4 py-3 rounded-xl mb-2 transition-colors"
                                >
                                    <User className="w-4 h-4" /> Login /
                                    Register
                                </Link>
                            )}

                            {/* Categories */}
                            <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 mt-2 mb-1">
                                Shop
                            </p>
                            <Link
                                href="/products"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between px-3 py-2.5 text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
                            >
                                All Products{" "}
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                            {navCategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={`/products?category=${cat.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between px-3 py-2.5 text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
                                >
                                    {cat.name}{" "}
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            ))}
                            <Link
                                href="/products/deals"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between px-3 py-2.5 text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
                            >
                                🔥 Deals <ChevronRight className="w-4 h-4" />
                            </Link>

                            {/* Account links */}
                            {isAuthenticated && (
                                <>
                                    <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 mt-4 mb-1">
                                        Account
                                    </p>
                                    <Link
                                        href="/profile"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center justify-between px-3 py-2.5 text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <User className="w-4 h-4" /> My
                                            Profile
                                        </span>
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href="/orders"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center justify-between px-3 py-2.5 text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Package className="w-4 h-4" /> My
                                            Orders
                                        </span>
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href="/notifications"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center justify-between px-3 py-2.5 text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Bell className="w-4 h-4" />{" "}
                                            Notifications
                                            {unreadCount > 0 && (
                                                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </span>
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                    {user?.is_staff && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center justify-between px-3 py-2.5 text-primary-100 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                ⚙️ Admin Panel
                                            </span>
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setMenuOpen(false);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-primary-700 rounded-lg transition-colors mt-2 w-full"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Email verification banner */}
            {showVerifyBanner && (
                <div className="bg-amber-50 border-b border-amber-200">
                    <div className="container-xl flex items-center justify-between gap-3 py-2.5 px-4">
                        <div className="flex items-center gap-2 text-amber-800 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                            className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Verify Email
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
