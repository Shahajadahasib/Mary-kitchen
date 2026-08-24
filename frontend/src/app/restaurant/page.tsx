"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, UtensilsCrossed } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MenuItemCard from "@/components/menu/MenuItemCard";
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
    const [search, setSearch] = useState(searchParams.get("search") || "");

    useEffect(() => {
        setSearch(searchParams.get("search") || "");
    }, [searchParams]);

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
        router.push(`/restaurant?${next.toString()}`);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParam("search", search.trim());
    };

    const handlePageChange = (page: number) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("page", String(page));
        router.push(`/restaurant?${next.toString()}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const items: MenuItemListEntry[] = data?.results ?? [];

    return (
        <div className="container-xl px-4 py-6 md:py-8">
            <header className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Our menu
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Cooked to order for takeaway or delivery across Darwin.
                </p>
            </header>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search the menu..."
                        className="input-field pl-10 w-full"
                    />
                </div>
                <button
                    type="submit"
                    className="rounded-lg bg-brand-600 px-5 font-semibold text-white transition-colors hover:bg-brand-700 whitespace-nowrap"
                >
                    Search
                </button>
            </form>

            {/* Category chips */}
            {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <button
                        onClick={() => setParam("category", "")}
                        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            !categorySlug
                                ? "bg-brand-600 text-white"
                                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                        }`}
                    >
                        All dishes
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setParam("category", c.slug)}
                            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                categorySlug === c.slug
                                    ? "bg-brand-600 text-white"
                                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                            }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Dietary chips */}
            <div className="flex flex-wrap gap-2 mb-6">
                {DIETARY_FILTERS.map((tag) => {
                    const active = dietaryTag === tag;
                    return (
                        <button
                            key={tag}
                            onClick={() => setParam("dietary_tag", active ? "" : tag)}
                            aria-pressed={active}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                active
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                            }`}
                        >
                            {dietaryLabel(tag)}
                        </button>
                    );
                })}
            </div>

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
        <Suspense
            fallback={
                <div className="container-xl px-4 py-8">
                    <Skeleton className="h-9 w-48 rounded-lg mb-6" />
                    <Skeleton className="h-10 w-full rounded-lg mb-6" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-64 rounded-xl" />
                        ))}
                    </div>
                </div>
            }
        >
            <MenuBrowse />
        </Suspense>
    );
}
