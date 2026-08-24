"use client";

import { useStoreProfile } from "@/hooks/useStoreProfile";
import { useAuthStore } from "@/store/authStore";
import {
    ChefHat,
    Mail,
    MapPin,
    Phone,
    Shield,
    ShoppingBag,
    ShoppingBasket,
    UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authHref } from "@/lib/authRedirect";
import { FaFacebook, FaGlobe, FaInstagram } from "react-icons/fa6";

/**
 * Footer shared by both storefronts.
 *
 * Everything that differs between the grocery shop and the restaurant lives in
 * CHANNEL_CONFIG — link columns, accent colour, brand mark and blurb. The two
 * businesses trade from the same address, so contact details still come from
 * the one shared `StoreProfile` rather than being duplicated per channel.
 *
 * Every footer also carries a cross-link to the *other* storefront, so
 * discovery and internal link equity flow both ways.
 */

export type FooterChannel = "grocery" | "restaurant";

const CHANNEL_CONFIG = {
    grocery: {
        BrandIcon: ShoppingBag,
        accent: "text-primary-400",
        homeHref: "/shop",
        fallbackName: "Mary Ben's Kitchen",
        fallbackBlurb:
            "Your local Darwin grocery & food marketplace. Fresh products delivered to your door across Darwin NT.",
        columnTitle: "Shop",
        links: [
            { label: "All Products", href: "/shop/products" },
            { label: "Fish & Seafood", href: "/shop/products?category=fish-seafood" },
            { label: "Meat & Poultry", href: "/shop/products?category=meat-poultry" },
            { label: "Vegetables", href: "/shop/products?category=vegetables" },
            { label: "Rice & Grains", href: "/shop/products?category=rice-grains" },
            { label: "Weekly Deals", href: "/shop/products/deals" },
        ],
        accountLinks: [
            { label: "My Orders", href: "/shop/orders" },
            { label: "My Profile", href: "/shop/profile" },
        ],
        cross: {
            href: "/restaurant",
            Icon: UtensilsCrossed,
            heading: "Hungry now?",
            body: "Skip the cooking — order a freshly made meal from Mary Ben's Kitchen Restaurant for takeaway or delivery.",
            cta: "View the menu",
            ctaClass: "bg-brand-600 hover:bg-brand-700",
        },
    },
    restaurant: {
        BrandIcon: ChefHat,
        accent: "text-brand-400",
        homeHref: "/restaurant",
        fallbackName: "Mary Ben's Kitchen Restaurant",
        fallbackBlurb:
            "Home-style cooked meals made to order in Darwin NT. Takeaway from Winnellie or delivered to your door.",
        columnTitle: "Menu",
        links: [
            { label: "Full Menu", href: "/restaurant" },
            { label: "Vegetarian", href: "/restaurant?dietary_tag=vegetarian" },
            { label: "Vegan", href: "/restaurant?dietary_tag=vegan" },
            { label: "Halal", href: "/restaurant?dietary_tag=halal" },
            { label: "Gluten Free", href: "/restaurant?dietary_tag=gluten_free" },
        ],
        accountLinks: [
            { label: "My Orders", href: "/restaurant/orders" },
            { label: "My Profile", href: "/shop/profile" },
        ],
        cross: {
            href: "/shop",
            Icon: ShoppingBasket,
            heading: "Stocking up?",
            body: "Fresh fish, meat, vegetables, rice and pantry staples delivered across Darwin from our grocery shop.",
            cta: "Shop groceries",
            ctaClass: "bg-primary-700 hover:bg-primary-800",
        },
    },
} as const;

// Shared by both storefronts — one physical business, one set of policies.
const INFO_LINKS = [
    { label: "About Us", href: "/shop/about" },
    { label: "Delivery Info", href: "/shop/delivery" },
    { label: "Contact Us", href: "/shop/contact" },
    { label: "Privacy Policy", href: "/shop/privacy" },
    { label: "Terms of Service", href: "/shop/terms" },
];

function safeHref(url: string): string | undefined {
    try {
        const { protocol } = new URL(url);
        return protocol === "https:" || protocol === "http:" ? url : undefined;
    } catch {
        return undefined;
    }
}

function telHref(phone: string): string {
    return `tel:${phone.replace(/[\s\-().]/g, "")}`;
}

export default function Footer({
    channel = "grocery",
}: {
    channel?: FooterChannel;
}) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hasHydrated = useAuthStore((s) => s.hasHydrated);
    const { data: store } = useStoreProfile();
    const pathname = usePathname();

    const cfg = CHANNEL_CONFIG[channel];
    const { BrandIcon } = cfg;
    const CrossIcon = cfg.cross.Icon;

    const accountLinks =
        hasHydrated && isAuthenticated
            ? cfg.accountLinks
            : [
                  { label: "Login", href: authHref("/login", pathname) },
                  { label: "Register", href: authHref("/register", pathname) },
              ];

    // StoreProfile.name is the business name; the restaurant reads as a
    // sub-brand of it, so only the grocery side uses it verbatim.
    const storeName =
        channel === "grocery"
            ? store?.name || cfg.fallbackName
            : cfg.fallbackName;
    // StoreProfile.description is written for the grocery shop, so only the
    // grocery footer uses it; the restaurant keeps its own blurb.
    const description =
        channel === "grocery"
            ? store?.description || cfg.fallbackBlurb
            : cfg.fallbackBlurb;

    const addressParts = [
        store?.address,
        store?.suburb || store?.state
            ? [store.suburb, store.state, store.postcode].filter(Boolean).join(" ")
            : undefined,
    ].filter(Boolean);

    const facebookHref = store?.facebook ? safeHref(store.facebook) : undefined;
    const instagramHref = store?.instagram ? safeHref(store.instagram) : undefined;
    const websiteHref = store?.website ? safeHref(store.website) : undefined;
    const hasSocial = facebookHref || instagramHref || websiteHref;

    return (
        <footer className="mt-auto bg-gray-900 pb-6 pt-10 text-gray-300">
            <div className="container-xl px-4">
                {/* Cross-storefront promo — the reciprocal link between the two
                    businesses, present on both sides. */}
                <Link
                    href={cfg.cross.href}
                    className="group mb-10 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-800/50 p-5 transition-colors hover:border-gray-700 sm:flex-row sm:items-center sm:gap-6"
                >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900">
                        <CrossIcon
                            className="h-6 w-6 text-white"
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-white">
                            {cfg.cross.heading}
                        </span>
                        <span className="mt-0.5 block text-sm text-gray-400">
                            {cfg.cross.body}
                        </span>
                    </span>
                    <span
                        className={`inline-flex shrink-0 items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${cfg.cross.ctaClass}`}
                    >
                        {cfg.cross.cta}
                    </span>
                </Link>

                <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
                    {/* Column 1 — Brand */}
                    <div className="sm:col-span-2 md:col-span-1">
                        <Link
                            href={cfg.homeHref}
                            className="mb-3 flex items-center gap-2 text-xl font-bold text-white"
                        >
                            <BrandIcon className={`h-6 w-6 ${cfg.accent}`} />
                            {storeName}
                        </Link>
                        <p className="mb-4 text-sm leading-relaxed text-gray-400">
                            {description}
                        </p>

                        <div className="space-y-2.5 text-sm">
                            {addressParts.length > 0 && (
                                <p className="flex items-start gap-2 text-gray-400">
                                    <MapPin
                                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${cfg.accent}`}
                                    />
                                    <span className="whitespace-pre-line">
                                        {addressParts.join("\n")}
                                    </span>
                                </p>
                            )}
                            {store?.phone && (
                                <a
                                    href={telHref(store.phone)}
                                    className="flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
                                >
                                    <Phone className={`h-4 w-4 ${cfg.accent}`} />
                                    {store.phone}
                                </a>
                            )}
                            {store?.email && (
                                <a
                                    href={`mailto:${store.email}`}
                                    className="flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
                                >
                                    <Mail className={`h-4 w-4 ${cfg.accent}`} />
                                    {store.email}
                                </a>
                            )}
                        </div>

                        {hasSocial && (
                            <div className="mt-4 flex items-center gap-4">
                                {facebookHref && (
                                    <a
                                        href={facebookHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Facebook"
                                        className="text-gray-500 transition-colors hover:text-white"
                                    >
                                        <FaFacebook className="h-5 w-5" />
                                    </a>
                                )}
                                {instagramHref && (
                                    <a
                                        href={instagramHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Instagram"
                                        className="text-gray-500 transition-colors hover:text-white"
                                    >
                                        <FaInstagram className="h-5 w-5" />
                                    </a>
                                )}
                                {websiteHref && (
                                    <a
                                        href={websiteHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Website"
                                        className="text-gray-500 transition-colors hover:text-white"
                                    >
                                        <FaGlobe className="h-5 w-5" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Column 2 — this storefront's own links */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                            {cfg.columnTitle}
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            {cfg.links.map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={l.href}
                                        className="text-gray-400 transition-colors hover:text-white"
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3 — Account */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                            Account
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            {accountLinks.map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={l.href}
                                        className="text-gray-400 transition-colors hover:text-white"
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4 — Information */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                            Information
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            {INFO_LINKS.map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={l.href}
                                        className="text-gray-400 transition-colors hover:text-white"
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link
                                    href="/"
                                    className="text-gray-400 transition-colors hover:text-white"
                                >
                                    Both Storefronts
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-800 pt-6 text-center text-sm text-gray-500 sm:flex-row sm:text-left">
                    <p>
                        © {new Date().getFullYear()}{" "}
                        {store?.name || "Mary Ben's Kitchen"}. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span>Secure payments by</span>
                        <span className="font-bold text-white">Stripe</span>
                    </div>
                </div>

                {/* Developer credit */}
                <div className="mt-4 border-t border-gray-800 pt-4 text-center text-xs text-gray-600">
                    Designed &amp; developed with ❤️ by{" "}
                    <a
                        href="https://linkedin.com/in/shahajadahasib/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`font-medium transition-colors hover:text-white ${cfg.accent}`}
                    >
                        Hasib
                    </a>
                </div>
            </div>
        </footer>
    );
}
