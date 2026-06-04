"use client";
import HeroBanner from "@/components/layout/HeroBanner";
import { HeroBanners, PromoBanners } from "@/components/layout/PromoBanners";
import CategoryCard from "@/components/product/CategoryCard";
import ProductCard from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function HomePage() {
    const { data: featured } = useQuery({
        queryKey: ["featured-products"],
        queryFn: () => api.get("/products/featured/").then((r) => r.data),
    });

    const { data: categories, isLoading: catLoading } = useQuery({
        queryKey: ["categories"],
        queryFn: () => api.get("/products/categories/").then((r) => r.data),
    });

    const { data: allProducts, isLoading: allLoading } = useQuery({
        queryKey: ["all-products"],
        queryFn: () =>
            api
                .get("/products/?ordering=-created_at&page_size=20")
                .then((r) => r.data),
    });

    const featuredList = featured?.results ?? [];
    const hasFeatured = featuredList.length > 0;

    return (
        <div>
            <HeroBanner />
            <HeroBanners />

            {/* Categories */}
            <section className="container-xl px-4 py-8 md:py-10">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="section-title text-lg md:text-2xl">
                        Shop by Category
                    </h2>
                    <Link
                        href="/products"
                        className="text-primary-700 hover:underline text-sm font-medium"
                    >
                        View all
                    </Link>
                </div>
                {catLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-20 md:h-24 w-full rounded-xl"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                        {categories?.results?.map((cat: any) => (
                            <CategoryCard key={cat.id} category={cat} />
                        ))}
                    </div>
                )}
            </section>

            <PromoBanners location="top" />

            {/* Featured Products */}
            {hasFeatured && (
                <section className="bg-white py-8 md:py-10">
                    <div className="container-xl px-4">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h2 className="section-title text-lg md:text-2xl">
                                Featured Products
                            </h2>
                            <Link
                                href="/products?is_featured=true"
                                className="text-primary-700 hover:underline text-sm font-medium"
                            >
                                View all
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                            {featuredList.map((p: any) => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <PromoBanners location="middle" />

            {/* All Products */}
            <section className="container-xl px-4 py-8 md:py-10">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="section-title text-lg md:text-2xl">
                        All Products
                    </h2>
                    <Link
                        href="/products"
                        className="text-primary-700 hover:underline text-sm font-medium"
                    >
                        View all
                    </Link>
                </div>
                {allLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-64 md:h-72 w-full rounded-xl"
                            />
                        ))}
                    </div>
                ) : allProducts?.results?.length === 0 ? (
                    <div className="text-center py-12 md:py-16 text-gray-400">
                        <p className="text-lg font-medium">No products yet</p>
                        <p className="text-sm mt-1">
                            Add products from the admin panel to display them
                            here.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {allProducts?.results?.map((p: any) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                )}
            </section>

            <PromoBanners location="bottom" />

            {/* Value Props */}
            <section className="bg-primary-700 text-white py-10 md:py-12">
                <div className="container-xl px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
                        {[
                            {
                                icon: "🚚",
                                title: "Fast Delivery",
                                desc: "Darwin-wide same/next-day delivery",
                            },
                            {
                                icon: "🌿",
                                title: "Fresh Products",
                                desc: "Sourced fresh daily",
                            },
                            {
                                icon: "🔒",
                                title: "Secure Payment",
                                desc: "Stripe-powered checkout",
                            },
                            {
                                icon: "📱",
                                title: "Easy Returns",
                                desc: "Hassle-free return policy",
                            },
                        ].map((v) => (
                            <div
                                key={v.title}
                                className="flex flex-col items-center"
                            >
                                <div className="text-3xl md:text-4xl mb-2">
                                    {v.icon}
                                </div>
                                <h3 className="font-bold text-base md:text-lg">
                                    {v.title}
                                </h3>
                                <p className="text-primary-100 text-xs md:text-sm mt-1">
                                    {v.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
