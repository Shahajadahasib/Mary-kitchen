"use client";

import { useQuery } from "@tanstack/react-query";
import {
    ChevronRight,
    Clock,
    Minus,
    Plus,
    ShoppingBag,
    UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import ModifierPicker, {
    initialSelection,
    selectedModifierIds,
    selectionError,
    selectionPriceDelta,
    type ModifierSelection,
} from "@/components/menu/ModifierPicker";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import { authHref } from "@/lib/authRedirect";
import { absoluteMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantCart } from "@/store/cartStore";
import { dietaryLabel, dietaryTagClass, type MenuItemDetail } from "@/types/menu";

export default function MenuItemDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const router = useRouter();
    const { addMenuItem } = useRestaurantCart();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const [selection, setSelection] = useState<ModifierSelection | null>(null);
    const [adding, setAdding] = useState(false);

    const { data: item, isLoading } = useQuery<MenuItemDetail>({
        queryKey: ["menu-item", slug],
        queryFn: () => api.get(`/menu/${slug}/`).then((r) => r.data),
    });

    const groups = useMemo(
        () => item?.modifier_groups ?? [],
        [item?.modifier_groups]
    );

    // Seed defaults once the dish arrives; the picker owns it after that.
    const currentSelection = selection ?? initialSelection(groups);

    const unitPrice = item
        ? Number(item.base_price) + selectionPriceDelta(groups, currentSelection)
        : 0;
    const validationError = selectionError(groups, currentSelection);
    const orderable = item?.is_active && item?.is_available;

    const handleAdd = async () => {
        if (!item) return;
        if (!isAuthenticated) {
            router.push(authHref("/login", `/restaurant/${item.slug}`));
            return;
        }
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setAdding(true);
        try {
            await addMenuItem(
                item.id,
                selectedModifierIds(currentSelection),
                quantity
            );
            toast.success(`${item.name} added to your order`);
            router.push("/restaurant/cart");
        } catch (e: unknown) {
            const message =
                (e as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? "Could not add that dish";
            toast.error(message);
        } finally {
            setAdding(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container-xl py-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <Skeleton className="h-80 rounded-2xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="container-xl py-20 text-center">
                <UtensilsCrossed
                    className="w-12 h-12 mx-auto text-gray-300 mb-4"
                    strokeWidth={1.25}
                />
                <p className="text-gray-500 mb-6">We couldn&apos;t find that dish.</p>
                <Link
                    href="/restaurant"
                    className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
                >
                    Back to the menu
                </Link>
            </div>
        );
    }

    const images = item.images ?? [];
    const heroSrc = absoluteMediaUrl(images[activeImage]?.image);

    return (
        <div className="container-xl py-6 sm:py-8">
            <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 mb-5 overflow-x-auto">
                <Link href="/restaurant" className="hover:text-brand-700 whitespace-nowrap">
                    Menu
                </Link>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <Link
                    href={`/restaurant?category=${item.category?.slug}`}
                    className="hover:text-brand-700 whitespace-nowrap"
                >
                    {item.category?.name}
                </Link>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-gray-900 font-medium truncate max-w-[160px] sm:max-w-xs">
                    {item.name}
                </span>
            </nav>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12">
                {/* Images */}
                <div>
                    <div className="relative h-64 sm:h-80 md:aspect-square md:h-auto rounded-2xl overflow-hidden bg-gray-100 mb-3">
                        {heroSrc ? (
                            <Image
                                src={heroSrc}
                                alt={images[activeImage]?.alt_text || item.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <UtensilsCrossed className="w-16 h-16" strokeWidth={1} />
                            </div>
                        )}
                        {!orderable && (
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                <span className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white">
                                    Not available today
                                </span>
                            </div>
                        )}
                    </div>

                    {images.length > 1 && (
                        <div className="scrollbar-slim flex gap-2 overflow-x-auto pb-1.5">
                            {images.map((img, i) => {
                                const thumb = absoluteMediaUrl(img.image);
                                if (!thumb) return null;
                                return (
                                    <button
                                        key={img.id}
                                        onClick={() => setActiveImage(i)}
                                        className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                                            i === activeImage
                                                ? "border-brand-500"
                                                : "border-transparent hover:border-gray-300"
                                        }`}
                                    >
                                        <Image
                                            src={thumb}
                                            alt={img.alt_text || `${item.name} ${i + 1}`}
                                            fill
                                            sizes="64px"
                                            className="object-cover"
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Details + modifiers */}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {item.name}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {item.dietary_tags?.map((tag) => (
                            <span
                                key={tag}
                                className={`badge ${dietaryTagClass(tag)}`}
                            >
                                {dietaryLabel(tag)}
                            </span>
                        ))}
                        {item.prep_time_minutes != null && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                about {item.prep_time_minutes} min
                            </span>
                        )}
                    </div>

                    {item.description && (
                        <p className="mt-4 text-gray-600 leading-relaxed">
                            {item.description}
                        </p>
                    )}

                    <p className="mt-4 text-2xl font-bold text-brand-700">
                        {formatCurrency(item.base_price)}
                    </p>

                    {groups.length > 0 && (
                        <div className="mt-8">
                            <ModifierPicker
                                groups={groups}
                                selection={currentSelection}
                                onChange={setSelection}
                            />
                        </div>
                    )}

                    {/* Quantity + add */}
                    <div className="mt-8 border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <span className="text-sm font-medium text-gray-700">
                                Quantity
                            </span>
                            <div className="flex items-center gap-1 rounded-lg border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    aria-label="Decrease quantity"
                                    className="rounded-l-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-10 text-center text-sm font-medium">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => q + 1)}
                                    aria-label="Increase quantity"
                                    className="rounded-r-lg p-2 text-gray-600 hover:bg-gray-100"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mb-4 flex items-baseline justify-between">
                            <span className="text-sm text-gray-600">Total</span>
                            <span className="text-xl font-bold text-gray-900">
                                {formatCurrency(unitPrice * quantity)}
                            </span>
                        </div>

                        {validationError && (
                            <p className="mb-3 text-sm text-amber-700">
                                {validationError}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={adding || !orderable || !!validationError}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                            {!orderable
                                ? "Not available today"
                                : adding
                                  ? "Adding..."
                                  : "Add to order"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
