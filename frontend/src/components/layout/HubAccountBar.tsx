"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
    AlertCircle,
    LayoutDashboard,
    LogOut,
    ShoppingBasket,
    UserRound,
    UtensilsCrossed,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

/**
 * Account chrome for the hub landing page.
 *
 * The hub is the one page with no header and no footer, so until now it was the
 * only place in the app that could not show a session. That made signing in
 * from the hub look like it had failed: `/login` sends a user back to
 * `DEFAULT_POST_AUTH_PATH` ("/") when they came from here, and the page they
 * returned to was byte-identical to the one they left.
 *
 * These three pieces are mounted by `app/page.tsx`, which stays a server
 * component because it owns the hub's `metadata` and canonical URL.
 *
 * The account control deliberately mirrors the storefront headers
 * (`Header.tsx`, `RestaurantShell.tsx`) — same `header-action-wide` skin, same
 * dropdown panel — so the hub reads as the same product rather than a separate
 * splash page. It differs in one way on purpose: the storefront headers hide
 * their dropdown below `md` and move the account links into a mobile drawer.
 * The hub has no drawer, so this control stays visible at every width.
 */

/** Profile lives under /shop: there is one account across both storefronts. */
const PROFILE_HREF = "/shop/profile";

function useHubSession() {
    const { user, isAuthenticated, hasHydrated, logout } = useAuthStore();
    return {
        user,
        hasHydrated,
        signedIn: hasHydrated && isAuthenticated,
        logout,
    };
}

export function HubAccountBar() {
    const { user, hasHydrated, signedIn, logout } = useHubSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        window.addEventListener("click", onClick);
        return () => window.removeEventListener("click", onClick);
    }, []);

    const handleLogout = async () => {
        setMenuOpen(false);
        // No router.push afterwards: authStore.logout() hard-navigates to
        // storefrontRootFor(pathname), which is "/" — this page — already.
        await logout();
    };

    // The auth store is persisted to localStorage and rehydrates after the
    // first paint. Reserve the row's height until then so the heading below
    // does not jump, and so a signed-in user never sees a "Sign in" flash.
    if (!hasHydrated) return <div className="h-10" aria-hidden="true" />;

    if (!signedIn) {
        return (
            <div className="flex items-center gap-2">
                {/* Bare hrefs, unlike every other auth link in the app: those
                    attach ?next= via authHref() to get the user back where they
                    started, and the hub *is* the default post-auth path, so a
                    next param here would be a no-op. */}
                <Link
                    href="/login"
                    className="header-action-wide text-sm font-medium"
                >
                    <UserRound
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                    />
                    Sign in
                </Link>
                <Link
                    href="/register"
                    className="hidden rounded-xl px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
                >
                    Create account
                </Link>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {/* Staff get the admin console as a visible pill, not only as a
                dropdown item — an admin arriving at the hub should not have to
                open a menu to find the console. */}
            {user?.is_staff && (
                <Link
                    href="/admin"
                    className="header-action-wide hidden bg-white/15 text-sm font-semibold sm:inline-flex"
                >
                    <LayoutDashboard
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                    />
                    Admin dashboard
                </Link>
            )}

            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className={`header-action-wide ${menuOpen ? "bg-white/20 ring-white/30" : ""}`}
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold uppercase">
                        {user?.first_name?.[0] ?? (
                            <UserRound className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                    </span>
                    <span className="max-w-[7rem] truncate text-sm font-medium">
                        {user?.first_name}
                    </span>
                </button>

                {menuOpen && (
                    <div
                        role="menu"
                        className="absolute right-0 top-full z-50 mt-2 w-56 animate-dropdown-in overflow-hidden rounded-xl border border-gray-100 bg-white py-1 text-gray-700 shadow-2xl"
                    >
                        <Link
                            href={PROFILE_HREF}
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                        >
                            <UserRound className="h-4 w-4 text-gray-400" /> My
                            Profile
                        </Link>
                        {/* The hub belongs to neither channel, so it names both
                            order lists rather than picking one. */}
                        <Link
                            href="/shop/orders"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                        >
                            <ShoppingBasket className="h-4 w-4 text-gray-400" />{" "}
                            Grocery orders
                        </Link>
                        <Link
                            href="/restaurant/orders"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                        >
                            <UtensilsCrossed className="h-4 w-4 text-gray-400" />{" "}
                            Restaurant orders
                        </Link>
                        {user?.is_staff && (
                            <Link
                                href="/admin"
                                role="menuitem"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                            >
                                <LayoutDashboard className="h-4 w-4" /> Admin
                                dashboard
                            </Link>
                        )}
                        <hr className="my-1" />
                        <button
                            role="menuitem"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * The same unverified-email nudge the grocery header carries. Someone who only
 * ever lands on the hub — which is where registration returns them — would
 * otherwise never be prompted to verify.
 */
export function HubVerifyBanner() {
    const { user, signedIn } = useHubSession();
    if (!signedIn || !user || user.is_email_verified) return null;

    return (
        <div className="border-b border-amber-200 bg-amber-50">
            <div className="container-xl flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">
                        Your email address is not verified. Some features may be
                        restricted.
                    </span>
                    <span className="sm:hidden">Email not verified.</span>
                </div>
                <Link
                    href={`/verify-email?email=${encodeURIComponent(user.email)}`}
                    className="flex-shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                >
                    Verify Email
                </Link>
            </div>
        </div>
    );
}

/** The footnote under the storefront cards, greeting a signed-in visitor. */
export function HubWelcomeLine() {
    const { user, hasHydrated, signedIn, logout } = useHubSession();

    const linkClass =
        "rounded font-medium text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

    // Guest copy until the store rehydrates: it is the honest default for a
    // visitor with no session, and the line swaps in place once known.
    const body =
        hasHydrated && signedIn ? (
            <>
                Welcome back, {user?.first_name || "friend"}. Pick a storefront
                above, or open your{" "}
                <Link href={PROFILE_HREF} className={linkClass}>
                    profile
                </Link>{" "}
                &middot;{" "}
                <button onClick={() => logout()} className={linkClass}>
                    Sign out
                </button>
            </>
        ) : (
            <>
                One account across both.{" "}
                <Link href="/login" className={linkClass}>
                    Sign in
                </Link>{" "}
                or{" "}
                <Link href="/register" className={linkClass}>
                    create an account
                </Link>
                .
            </>
        );

    return (
        <p
            style={{ animationDelay: "340ms" }}
            className="animate-fade-in-up mt-8 text-center text-xs text-gray-300 sm:text-sm short:mt-5"
        >
            {body}
        </p>
    );
}
