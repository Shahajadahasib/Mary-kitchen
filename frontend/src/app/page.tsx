import type { Metadata } from "next";
import Image from "next/image";
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
        image: "/assets/grocery.jpg",
        imageAlt:
            "Shelves of pantry staples — tinned goods, tea, sauces and snacks",
        icon: ShoppingBasket,
        // Grocery keeps the established green brand.
        accent: {
            badge: "bg-primary-700 text-white",
            button: "bg-primary-700 hover:bg-primary-800",
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
            button: "bg-brand-600 hover:bg-brand-700",
            ring: "focus-visible:ring-brand-400",
        },
    },
] as const;

export default function HubPage() {
    return (
        <main className="relative min-h-screen overflow-hidden">
            {/* Background photograph */}
            <Image
                src="/assets/home-bg.jpg"
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

            <div className="relative flex min-h-screen flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
                <div className="mx-auto w-full max-w-3xl">
                    <header className="animate-fade-in-up text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300 sm:text-sm">
                            Darwin, Northern Territory
                        </p>
                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                            Mary Ben&apos;s Kitchen
                        </h1>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
                            One kitchen, two ways to order. Fill the fridge from
                            our grocery shop, or let us cook for you at the
                            restaurant.
                        </p>
                    </header>

                    <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6">
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
                                    className={`animate-fade-in-up group flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${s.accent.ring}`}
                                >
                                    {/* Card header image */}
                                    <div className="relative aspect-[16/10] overflow-hidden">
                                        <Image
                                            src={s.image}
                                            alt={s.imageAlt}
                                            fill
                                            sizes="(max-width: 640px) 100vw, 360px"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div
                                            aria-hidden="true"
                                            className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"
                                        />
                                        <span
                                            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.accent.badge}`}
                                        >
                                            <Icon
                                                className="h-3.5 w-3.5"
                                                aria-hidden="true"
                                            />
                                            {s.eyebrow}
                                        </span>
                                    </div>

                                    {/* Card body */}
                                    <div className="flex flex-1 flex-col p-5">
                                        <h2 className="text-lg font-bold text-gray-900">
                                            {s.title}
                                        </h2>
                                        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-600">
                                            {s.description}
                                        </p>
                                        <span
                                            className={`mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${s.accent.button}`}
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

                    <p
                        style={{ animationDelay: "340ms" }}
                        className="animate-fade-in-up mt-10 text-center text-xs text-gray-300 sm:text-sm"
                    >
                        One account across both.{" "}
                        <Link
                            href="/login"
                            className="font-medium text-white underline-offset-4 hover:underline"
                        >
                            Sign in
                        </Link>{" "}
                        or{" "}
                        <Link
                            href="/register"
                            className="font-medium text-white underline-offset-4 hover:underline"
                        >
                            create an account
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </main>
    );
}
