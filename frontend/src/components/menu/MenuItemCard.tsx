"use client";

import MediaImage from "@/components/ui/MediaImage";
import Link from "next/link";
import { Clock, Plus, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { absoluteMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantCart } from "@/store/cartStore";
import {
    dietaryLabel,
    dietaryTagClass,
    type MenuItemListEntry,
} from "@/types/menu";

/**
 * A dish tile in the menu grid.
 *
 * Dishes with modifier groups cannot be added straight from the grid — the
 * required choices have to be made first — so those link through to the detail
 * page instead of showing a quick-add button.
 */
export default function MenuItemCard({ item }: { item: MenuItemListEntry }) {
    const { addMenuItem } = useRestaurantCart();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [adding, setAdding] = useState(false);

    const image = absoluteMediaUrl(item.primary_image);

    const handleQuickAdd = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            toast.error("Please sign in to start an order");
            return;
        }
        setAdding(true);
        try {
            await addMenuItem(item.id, [], 1);
            toast.success(`${item.name} added`);
        } catch {
            toast.error("Could not add that dish");
        } finally {
            setAdding(false);
        }
    };

    return (
        <Link
            href={`/restaurant/${item.slug}`}
            className="card group flex flex-col overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                {image ? (
                    <MediaImage
                        src={image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <UtensilsCrossed className="w-10 h-10" strokeWidth={1.25} />
                    </div>
                )}

                {item.is_featured && (
                    <span className="absolute top-2 left-2 badge bg-brand-600 text-white">
                        Chef&apos;s pick
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-3 sm:p-4">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 group-hover:text-brand-700 transition-colors">
                    {item.name}
                </h3>

                <p className="mt-0.5 text-xs text-gray-500">{item.category_name}</p>

                {item.dietary_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {item.dietary_tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className={`badge text-[10px] ${dietaryTagClass(tag)}`}
                            >
                                {dietaryLabel(tag)}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-bold text-brand-700 text-sm sm:text-base">
                            {item.has_modifiers && (
                                <span className="text-xs font-normal text-gray-500">
                                    from{" "}
                                </span>
                            )}
                            {formatCurrency(item.base_price)}
                        </p>
                        {item.prep_time_minutes != null && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                {item.prep_time_minutes} min
                            </p>
                        )}
                    </div>

                    {item.has_modifiers ? (
                        <span className="text-xs font-medium text-brand-700 whitespace-nowrap">
                            Choose options →
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={handleQuickAdd}
                            disabled={adding}
                            aria-label={`Add ${item.name} to your order`}
                            className="flex-shrink-0 rounded-lg bg-brand-600 p-2 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
}
