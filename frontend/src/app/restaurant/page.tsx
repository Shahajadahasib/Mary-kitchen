"use client";

import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import FilterDropdown from "@/components/ui/FilterDropdown";
import MenuItemCard from "@/components/menu/MenuItemCard";
import SearchAutocomplete from "@/components/layout/SearchAutocomplete";
import RestaurantHero from "@/components/layout/RestaurantHero";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import { dietaryLabel, type MenuCategory, type MenuItemListEntry } from "@/types/menu";

/** Tags offered as quick filters. The API filters on one tag at a time. */
const DIETARY_FILTERS = [
    "vegetarian",
    "vegan",
    "gluten_free",
    "halal",
    "spicy",
];

function MenuBrowse() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const categorySlug = searchParams.get("category") || "";
    const dietaryTag = searchParams.get("dietary_tag") || "";
    const activeSearch = searchParams.get("search") || "";

    const { data: categoriesData } = useQuery({
        queryKey: ["menu-categories"],
        queryFn: () => api.get("/menu/categories/").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });
    const categories: MenuCategory[] =
        categoriesData?.results ?? categoriesData ?? [];

    const { data, isLoading } = useQuery({
        queryKey: ["menu-items", searchParams.toString()],
        queryFn: () =>
            api.get(`/menu/?${searchParams.toString()}`).then((r) => r.data),
    });

    /** Push a changed filter, always resetting pagination. */
    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        router.push(`/restaurant?${next.toString()}`, { scroll: false });
    };

    const handlePageChange = (page: number) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("page", String(page));
        router.push(`/restaurant?${next.toString()}`, { scroll: false });
        document
            .getElementById("menu")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const items: MenuItemListEntry[] = data?.results ?? [];

    return (
        <div id="menu" className="container-xl scroll-mt-20 px-4 py-6 md:py-8">
            {/* Toolbar: one row on every width. The search field used to run
                the full page width with a separate button beside it, and the
                categories and dietary tags below it were two horizontal chip
                rows — which wrapped into a ragged pile on a phone and pushed
                the dish grid off the first screen. Both filters are dropdowns
                now, so the whole control set occupies a single fixed-height
                band and the search field can be a sensible width. */}
            <div className="mb-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <SearchAutocomplete
                    channel="restaurant"
                    variant="panel"
                    surface="light"
                    className="sm:max-w-md sm:flex-1"
                />

                <div className="flex gap-2.5 sm:ml-auto">
                    <FilterDropdown
                        label="All dishes"
                        allLabel="All dishes"
                        value={categorySlug}
                        onChange={(v) => setParam("category", v)}
                        options={categories.map((c) => ({
                            value: c.slug,
                            label: c.name,
                            hint: c.item_count,
                        }))}
                        className="flex-1 sm:w-40 sm:flex-none"
                    />
                    <FilterDropdown
                        label="Dietary"
                        allLabel="Any dietary"
                        value={dietaryTag}
                        onChange={(v) => setParam("dietary_tag", v)}
                        options={DIETARY_FILTERS.map((tag) => ({
                            value: tag,
                            label: dietaryLabel(tag),
                        }))}
                        className="flex-1 sm:w-36 sm:flex-none"
                    />
                </div>
            </div>

            {/* An applied search is the one filter with no visible control of
                its own — the field clears itself after submitting — so it gets
                a removable chip instead. */}
            {activeSearch && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-gray-500">Showing results for</span>
                    <button
                        type="button"
                        onClick={() => setParam("search", "")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-2 font-medium text-brand-800 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100"
                    >
                        &ldquo;{activeSearch}&rdquo;
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">Clear search</span>
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 rounded-xl" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 md:py-20 text-gray-400">
                    <UtensilsCrossed
                        className="w-12 h-12 mx-auto mb-4 opacity-40"
                        strokeWidth={1.25}
                    />
                    <p className="text-base md:text-lg font-medium">
                        No dishes match those filters
                    </p>
                    <p className="text-sm">
                        Try clearing a filter — the menu changes daily.
                    </p>
                </div>
            ) : (
                <>
                    {data?.count != null && (
                        <p className="text-sm text-gray-500 mb-4">
                            {data.count} dish{data.count !== 1 ? "es" : ""}
                        </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {items.map((item) => (
                            <MenuItemCard key={item.id} item={item} />
                        ))}
                    </div>

                    {data?.total_pages > 1 && (
                        <div className="flex justify-center flex-wrap gap-2 mt-8">
                            {Array.from({ length: data.total_pages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(i + 1)}
                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                        data.current_page === i + 1
                                            ? "bg-brand-600 text-white"
                                            : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function RestaurantMenuPage() {
    return (
        <div>
            {/* Outside the Suspense boundary on purpose: MenuBrowse suspends on
                useSearchParams, so anything inside it reaches crawlers as a
                skeleton. The hero owns the <h1> and the Darwin-local copy, and
                is a server component so both land in the initial HTML. */}
            <RestaurantHero />

            <Suspense
                fallback={
                    <div className="container-xl px-4 py-8">
                        <Skeleton className="mb-6 h-10 w-full rounded-lg" />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-64 rounded-xl" />
                            ))}
                        </div>
                    </div>
                }
            >
                <MenuBrowse />
            </Suspense>
        </div>
    );
}
