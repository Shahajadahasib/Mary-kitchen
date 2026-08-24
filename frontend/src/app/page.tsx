import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingBasket, UtensilsCrossed } from "lucide-react";

export const metadata: Metadata = {
    title: {
        absolute: "Mary Ben's Kitchen | Grocery Shop & Restaurant in Darwin NT",
    },
    description:
        "Two ways to eat well in Darwin NT: fresh groceries delivered to your door, and Mary Ben's Kitchen Restaurant for takeaway and delivery.",
    alternates: {
        canonical: "https://marybenskitchen.com",
    },
};

const STOREFRONTS = [
    {
        href: "/shop",
        eyebrow: "Grocery",
        title: "Grocery Shop",
        description:
            "Fresh fish, meat, vegetables, rice and pantry staples — delivered across Darwin NT.",
        cta: "Shop groceries",
        icon: ShoppingBasket,
        // Grocery keeps the established green brand.
        accent: {
            panel: "from-primary-700 to-primary-900",
            badge: "bg-primary-50 text-primary-800",
            button: "bg-primary-700 hover:bg-primary-800",
            ring: "hover:border-primary-300",
        },
    },
    {
        href: "/restaurant",
        eyebrow: "Restaurant",
        title: "Mary Ben's Kitchen Restaurant",
        description:
            "Home-style cooked meals made to order. Pick up from Winnellie or have it delivered.",
        cta: "View the menu",
        icon: UtensilsCrossed,
        // Restaurant uses the warm amber brand scale to read as a distinct storefront.
        accent: {
            panel: "from-brand-500 to-brand-700",
            badge: "bg-brand-50 text-brand-800",
            button: "bg-brand-600 hover:bg-brand-700",
            ring: "hover:border-brand-300",
        },
    },
] as const;

export default function HubPage() {
    return (
        <main className="min-h-screen bg-gray-50">
            <div className="container-xl py-14 sm:py-20">
                <header className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-wider text-primary-700">
                        Darwin, NT
                    </p>
                    <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                        Mary Ben&apos;s Kitchen
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
                        One kitchen, two ways to order. Fill the fridge from our
                        grocery shop, or let us cook for you at the restaurant.
                    </p>
                </header>

                <div className="mt-10 sm:mt-14 grid gap-6 lg:gap-8 md:grid-cols-2">
                    {STOREFRONTS.map((s) => {
                        const Icon = s.icon;
                        return (
                            <Link
                                key={s.href}
                                href={s.href}
                                className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-600 ${s.accent.ring}`}
                            >
                                <div
                                    className={`flex h-40 sm:h-48 items-center justify-center bg-gradient-to-br ${s.accent.panel}`}
                                >
                                    <Icon
                                        className="h-16 w-16 sm:h-20 sm:w-20 text-white/90 transition-transform duration-200 group-hover:scale-105"
                                        strokeWidth={1.25}
                                        aria-hidden="true"
                                    />
                                </div>

                                <div className="flex flex-1 flex-col p-6 sm:p-7">
                                    <span
                                        className={`badge self-start ${s.accent.badge}`}
                                    >
                                        {s.eyebrow}
                                    </span>
                                    <h2 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900">
                                        {s.title}
                                    </h2>
                                    <p className="mt-2 flex-1 text-sm sm:text-base text-gray-600 leading-relaxed">
                                        {s.description}
                                    </p>
                                    <span
                                        className={`mt-6 inline-flex items-center gap-2 self-start rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${s.accent.button}`}
                                    >
                                        {s.cta}
                                        <ArrowRight
                                            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <p className="mt-12 text-sm text-gray-500">
                    Same account across both — sign in once and your orders from
                    either storefront live together.{" "}
                    <Link
                        href="/login"
                        className="font-medium text-primary-700 hover:underline"
                    >
                        Sign in
                    </Link>{" "}
                    or{" "}
                    <Link
                        href="/register"
                        className="font-medium text-primary-700 hover:underline"
                    >
                        create an account
                    </Link>
                    .
                </p>
            </div>
        </main>
    );
}
