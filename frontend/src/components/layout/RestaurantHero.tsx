import { ArrowRight, Clock, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

/**
 * Hero for the restaurant storefront — the counterpart to `HeroBanner` on the
 * grocery side, in the warm `brand` palette rather than the grocery green.
 *
 * Deliberately a server component, and it must stay one. It owns the page's
 * <h1>, and `/restaurant`'s menu browse suspends on `useSearchParams` — so
 * anything rendered inside that Suspense boundary reaches crawlers as a
 * skeleton. The heading and the Darwin-local copy have to be in the initial
 * HTML, which means they live here, above the boundary.
 *
 * Kept shorter than a full-viewport hero on purpose: this page's job is
 * browsing dishes, and every extra pixel here pushes the first row of food
 * below the fold.
 */
export default function RestaurantHero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
            {/* Same subtle tile as the grocery hero, so the two read as siblings. */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                }}
            />

            <div className="container-xl relative px-4 py-10 sm:py-12 md:py-14">
                <div className="max-w-2xl">
                    <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-5 sm:px-4 sm:text-sm">
                        <UtensilsCrossed className="h-3.5 w-3.5 text-brand-200 sm:h-4 sm:w-4" />
                        <span>Takeaway &amp; delivery across Darwin NT</span>
                    </div>

                    <h1 className="mb-3 max-w-3xl text-[1.75rem] font-extrabold leading-tight sm:mb-4 sm:text-4xl md:text-5xl">
                        Home-Style Meals
                        <br />
                        <span className="text-brand-200">
                            Cooked to Order in Darwin
                        </span>
                    </h1>

                    <p className="mb-6 max-w-lg text-sm text-brand-50/90 sm:mb-8 sm:text-base md:text-lg">
                        Freshly made at Mary Ben&apos;s Kitchen in Winnellie.
                        Collect from the kitchen, or have it delivered across
                        Darwin, Palmerston, Casuarina and Nightcliff.
                    </p>

                    <div className="flex flex-wrap gap-3 sm:gap-4">
                        {/* Anchors to the grid below rather than navigating, so the
                            hero can never become an obstacle to the menu. */}
                        <a
                            href="#menu"
                            className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-brand-700 shadow-lg transition-colors hover:bg-brand-50 sm:px-8 sm:py-3 sm:text-base"
                        >
                            Browse the menu <ArrowRight className="h-4 w-4" />
                        </a>
                        <Link
                            href="/restaurant?is_featured=true"
                            className="rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:px-8 sm:py-3 sm:text-base"
                        >
                            Chef&apos;s picks
                        </Link>
                    </div>

                    <p className="mt-6 flex items-center gap-2 text-xs text-brand-100/80 sm:text-sm">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Most dishes ready in about 20 minutes
                    </p>
                </div>
            </div>
        </section>
    );
}
