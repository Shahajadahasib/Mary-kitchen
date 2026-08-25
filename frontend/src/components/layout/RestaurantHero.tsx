import { ArrowRight, Clock, MapPin, Truck, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * Hero for the restaurant storefront — the counterpart to `HeroBanner` on the
 * grocery side.
 *
 * Deliberately a server component, and it must stay one. It owns the page's
 * <h1>, and `/restaurant`'s menu browse suspends on `useSearchParams` — so
 * anything rendered inside that Suspense boundary reaches crawlers as a
 * skeleton. The heading and the Darwin-local copy have to be in the initial
 * HTML, which means they live here, above the boundary.
 *
 * The background used to be a flat terracotta wash. It is now the food
 * photograph in `public/assets/restaurant.jpg` — the same image the hub page
 * uses for the restaurant card, so the two entry points match.
 *
 * Two scrims sit between the photo and the text, and both are load-bearing
 * rather than decorative:
 *  - the directional one darkens the side the copy sits on, which is the left
 *    on wide screens and the whole frame on a phone (where the text spans the
 *    full width). That is why the gradient's direction is itself responsive.
 *  - the vertical one pins the top and bottom edges down, so the sticky header
 *    above and the category chips below always meet a dark band rather than
 *    whatever part of the dish happens to land there.
 *
 * Still kept shorter than a full-viewport hero: this page's job is browsing
 * dishes, and every extra pixel here pushes the first row of food below the
 * fold.
 */
export default function RestaurantHero() {
    return (
        <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
            <Image
                src="/assets/restaurant.jpg"
                alt=""
                aria-hidden="true"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
            />

            {/* Directional scrim — vertical on phones, horizontal from md up. */}
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/70
                           md:bg-gradient-to-r md:from-black/85 md:via-black/55 md:to-transparent"
            />
            {/* Edge scrim — keeps the header and the strip below it readable. */}
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/45"
            />
            {/* A single warm highlight, so the photo does not read as grey. */}
            <div
                aria-hidden="true"
                className="absolute -right-20 top-1/2 hidden h-[26rem] w-[26rem] -translate-y-1/2 rounded-full bg-brand-500/25 blur-3xl lg:block"
            />

            <div className="container-xl relative px-4 py-12 sm:py-14 lg:py-16">
                <div className="max-w-3xl">
                    <p className="mb-4 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-md sm:mb-5 sm:px-4 sm:text-sm">
                        <UtensilsCrossed
                            className="h-3.5 w-3.5 text-brand-300 sm:h-4 sm:w-4"
                            aria-hidden="true"
                        />
                        <span>Takeaway &amp; delivery across Darwin NT</span>
                    </p>

                    <h1 className="mb-3 text-[2rem] font-extrabold leading-[1.1] tracking-tight drop-shadow-sm sm:mb-4 sm:text-[2.75rem] lg:text-[3.25rem]">
                        Home-Style Meals
                        <br />
                        <span className="text-brand-300">
                            Cooked to Order in Darwin
                        </span>
                    </h1>

                    <p className="mb-7 max-w-lg text-sm leading-relaxed text-white/85 sm:mb-9 sm:text-base lg:text-lg">
                        Freshly made at Mary Ben&apos;s Kitchen in Winnellie.
                        Collect from the kitchen, or have it delivered across
                        Darwin, Palmerston, Casuarina and Nightcliff.
                    </p>

                    <div className="flex flex-wrap gap-3 sm:gap-4">
                        {/* Anchors to the grid below rather than navigating, so the
                            hero can never become an obstacle to the menu. */}
                        <a
                            href="#menu"
                            className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-lg shadow-brand-950/40 transition duration-200 hover:bg-brand-50 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-950 active:scale-95 sm:px-8 sm:text-base"
                        >
                            Browse the menu
                            <ArrowRight
                                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                                aria-hidden="true"
                            />
                        </a>
                        <Link
                            href="/restaurant?is_featured=true"
                            className="rounded-xl border border-white/35 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition duration-200 hover:border-white/50 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-950 active:scale-95 sm:px-8 sm:text-base"
                        >
                            Chef&apos;s picks
                        </Link>
                    </div>

                    {/* Reassurance strip: the three things people check before
                        they start an order. */}
                    <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/75 sm:mt-9 sm:text-sm">
                        <li className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-brand-300" aria-hidden="true" />
                            Ready in about 20 minutes
                        </li>
                        <li className="flex items-center gap-1.5">
                            <Truck className="h-4 w-4 text-brand-300" aria-hidden="true" />
                            Delivery across Darwin
                        </li>
                        <li className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-brand-300" aria-hidden="true" />
                            Pick up in Winnellie
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
