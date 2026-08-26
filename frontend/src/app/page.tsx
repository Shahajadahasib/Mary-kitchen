import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import {
    HubAccountBar,
    HubVerifyBanner,
    HubWelcomeLine,
} from "@/components/layout/HubAccountBar";

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
        image: "/assets/grocery.jpg",
        imageAlt:
            "Shelves of pantry staples — tinned goods, tea, sauces and snacks",
        icon: ShoppingBasket,
        // Grocery keeps the established green brand.
        accent: {
            badge: "bg-primary-700 text-white",
            // Mobile CTA is plain text; the button background only applies from sm up.
            cta: "text-primary-700",
            button: "sm:bg-primary-700 sm:hover:bg-primary-800",
            ring: "focus-visible:ring-primary-400",
        },
    },
    {
        href: "/restaurant",
        eyebrow: "Restaurant",
        // Not "Mary Ben's Kitchen" — that is the <h1> directly above, and
        // repeating it makes the two cards look like the same business.
        title: "The Restaurant",
        description:
            "Home-style cooked meals made to order. Pick up from Winnellie or have it delivered.",
        cta: "View the menu",
        image: "/assets/restaurant.jpg",
        imageAlt: "A spread of freshly cooked pasta, seafood and pizza dishes",
        icon: UtensilsCrossed,
        // Restaurant uses the warm amber brand scale to read as a distinct storefront.
        accent: {
            badge: "bg-brand-600 text-white",
            cta: "text-brand-700",
            button: "sm:bg-brand-600 sm:hover:bg-brand-700",
            ring: "focus-visible:ring-brand-400",
        },
    },
] as const;

export default function HubPage() {
    return (
        <main className="relative min-h-dvh overflow-hidden">
            {/* Background photograph */}
            <Image
                src="/assets/hub-desktop.jpg"
                alt=""
                aria-hidden="true"
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />

            {/* Two stacked overlays. The first tints the whole photo; the second
                darkens top and bottom specifically, because the background's
                bright floor sat directly behind the footer line and washed it
                out. */}
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-gray-950/90 via-gray-900/85 to-primary-900/85"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-b from-gray-950/50 via-transparent to-gray-950/70"
            />

            <div className="relative flex min-h-dvh flex-col">
                {/* The hub has no header of its own, so the unverified-email
                    nudge the storefronts carry rides at the very top here. */}
                <HubVerifyBanner />

                <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 short:py-4">
                    {/* The account control gets a row of its own rather than
                        being positioned over the heading: overlaid, it lands on
                        the <h1> at phone widths. */}
                    <div className="mx-auto flex w-full max-w-3xl shrink-0 justify-end">
                        <HubAccountBar />
                    </div>

                    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
                        <header className="animate-fade-in-up text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300 sm:text-sm">
                                Darwin, Northern Territory
                            </p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl short:text-3xl">
                                Mary Ben&apos;s Kitchen
                            </h1>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base short:mt-2 short:text-sm">
                                One kitchen, two ways to order. Fill the fridge from
                                our grocery shop, or let us cook for you at the
                                restaurant.
                            </p>
                        </header>

                        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 short:mt-5">
                            {STOREFRONTS.map((s, i) => {
                                const Icon = s.icon;
                                return (
                                    <Link
                                        key={s.href}
                                        href={s.href}
                                        style={{
                                            // Stagger the cards in after the heading.
                                            animationDelay: `${120 + i * 110}ms`,
                                        }}
                                        className={`animate-fade-in-up group flex flex-row overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:flex-col ${s.accent.ring}`}
                                    >
                                        {/* Header image. A square thumbnail beside the
                                            text on phones, a full-width banner from sm
                                            up — two stacked banner cards do not fit one
                                            screen on a phone. */}
                                        <div className="relative aspect-square w-28 shrink-0 overflow-hidden sm:aspect-[16/9] sm:w-auto short:sm:aspect-[16/7]">
                                            <Image
                                                src={s.image}
                                                alt={s.imageAlt}
                                                fill
                                                sizes="(max-width: 640px) 112px, 360px"
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div
                                                aria-hidden="true"
                                                className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"
                                            />
                                            <span
                                                className={`absolute left-3 top-3 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${s.accent.badge}`}
                                            >
                                                <Icon
                                                    className="h-3.5 w-3.5"
                                                    aria-hidden="true"
                                                />
                                                {s.eyebrow}
                                            </span>
                                        </div>

                                        {/* Card body */}
                                        <div className="flex flex-1 flex-col p-4 sm:p-5 short:sm:p-4">
                                            <span
                                                className={`mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:hidden ${s.accent.badge}`}
                                            >
                                                <Icon
                                                    className="h-3 w-3"
                                                    aria-hidden="true"
                                                />
                                                {s.eyebrow}
                                            </span>
                                            <h2 className="text-base font-bold text-gray-900 sm:text-lg">
                                                {s.title}
                                            </h2>
                                            <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-600 sm:mt-1.5 sm:line-clamp-none sm:text-sm">
                                                {s.description}
                                            </p>
                                            <span
                                                className={`mt-2 inline-flex w-fit items-center gap-1.5 text-xs font-semibold sm:mt-4 sm:w-auto sm:justify-center sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2.5 sm:text-sm sm:text-white sm:transition-colors ${s.accent.cta} ${s.accent.button}`}
                                            >
                                                {s.cta}
                                                <ArrowRight
                                                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <HubWelcomeLine />
                    </div>
                </div>
            </div>
        </main>
    );
}
