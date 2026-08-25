"use client";

import MediaImage from "@/components/ui/MediaImage";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    ChevronDown,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    UtensilsCrossed,
} from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import api from "@/lib/api";
import { absoluteMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/utils";
import type { MenuCategory, MenuItemDetail } from "@/types/menu";

/**
 * Dish list for the restaurant menu.
 *
 * Two independent switches per dish, which is the whole reason the menu domain
 * is separate from products:
 *   is_active    — permanently on/off the menu
 *   is_available — today's 86 list, flipped from here without editing the dish
 *
 * Both are togglable inline because 86'ing a dish mid-service needs to be one
 * click, not a trip through an edit form.
 */
export default function AdminMenuItemsPage() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [pendingDelete, setPendingDelete] = useState<MenuItemDetail | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const { data: categories } = useQuery<MenuCategory[]>({
        queryKey: ["admin-menu-categories"],
        queryFn: () =>
            api.get("/menu/admin/categories/").then((r) => r.data.results ?? r.data),
    });

    const { data, isLoading } = useQuery({
        queryKey: ["admin-menu-items", search, categoryFilter],
        queryFn: () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (categoryFilter) params.set("category", categoryFilter);
            return api.get(`/menu/admin/items/?${params}`).then((r) => r.data);
        },
    });

    const items: MenuItemDetail[] = data?.results ?? data ?? [];

    /** Flip is_active or is_available without opening the edit form. */
    const toggleFlag = async (
        item: MenuItemDetail,
        field: "is_active" | "is_available"
    ) => {
        setTogglingId(item.id);
        try {
            await api.patch(`/menu/admin/items/${item.id}/`, {
                [field]: !item[field],
            });
            qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
            qc.invalidateQueries({ queryKey: ["menu-items"] });
            toast.success(
                field === "is_available"
                    ? item.is_available
                        ? `${item.name} marked unavailable`
                        : `${item.name} back on`
                    : item.is_active
                      ? `${item.name} taken off the menu`
                      : `${item.name} added back to the menu`
            );
        } catch {
            toast.error("Could not update that dish");
        } finally {
            setTogglingId(null);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const item = pendingDelete;
        setPendingDelete(null);
        try {
            await api.delete(`/menu/admin/items/${item.id}/`);
            toast.success("Dish deleted");
            qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
            qc.invalidateQueries({ queryKey: ["menu-items"] });
        } catch (err: any) {
            // 409 when the dish appears on existing orders — deactivate instead.
            toast.error(
                err?.response?.data?.detail ||
                    err?.response?.data?.message ||
                    "Failed to delete dish"
            );
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                    <p className="mt-0.5 text-sm text-gray-400">
                        Dishes on the restaurant menu.
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Link
                        href="/admin/menu/categories"
                        className="btn-secondary flex items-center gap-2 text-sm"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Categories</span>
                    </Link>
                    <Link
                        href="/admin/menu/items/new"
                        className="btn-primary flex items-center gap-2 text-sm"
                    >
                        <Plus className="h-4 w-4" /> New dish
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search dishes…"
                        className="input-field pl-9 text-sm"
                    />
                </div>
                <div className="relative">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="input-field w-auto appearance-none pr-9 text-sm"
                    >
                        <option value="">All categories</option>
                        {(categories ?? []).map((c) => (
                            <option key={c.id} value={c.slug}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton h-20 rounded-xl" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
                    <UtensilsCrossed
                        className="mx-auto mb-3 h-10 w-10 text-gray-300"
                        strokeWidth={1.25}
                    />
                    <p className="font-medium text-gray-700">No dishes found</p>
                    <p className="mt-1 text-sm text-gray-400">
                        {search || categoryFilter
                            ? "Try clearing the filters."
                            : "Add your first dish to get the menu started."}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {[
                                        "Dish",
                                        "Category",
                                        "Price",
                                        "Options",
                                        "On menu",
                                        "Available",
                                        "Actions",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const primary =
                                        item.images?.find((i) => i.is_primary) ??
                                        item.images?.[0];
                                    const img = absoluteMediaUrl(primary?.image);
                                    const busy = togglingId === item.id;
                                    return (
                                        <tr
                                            key={item.id}
                                            className="border-b border-gray-50 transition-colors hover:bg-gray-50/60"
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                        {img ? (
                                                            <MediaImage
                                                                src={img}
                                                                alt={item.name}
                                                                fill
                                                                sizes="40px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                                                                <UtensilsCrossed className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="max-w-[200px] truncate font-medium text-gray-900">
                                                            {item.name}
                                                        </p>
                                                        {item.dietary_tags?.length >
                                                            0 && (
                                                            <p className="truncate text-xs text-gray-400">
                                                                {item.dietary_tags.join(
                                                                    ", "
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-600">
                                                {item.category?.name}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 font-medium text-gray-900">
                                                {formatCurrency(item.base_price)}
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-600">
                                                {item.modifier_groups?.length
                                                    ? `${item.modifier_groups.length} group${
                                                          item.modifier_groups
                                                              .length > 1
                                                              ? "s"
                                                              : ""
                                                      }`
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        toggleFlag(item, "is_active")
                                                    }
                                                    className={`badge transition-colors disabled:opacity-50 ${
                                                        item.is_active
                                                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {item.is_active ? "On" : "Off"}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <button
                                                    type="button"
                                                    disabled={busy || !item.is_active}
                                                    onClick={() =>
                                                        toggleFlag(
                                                            item,
                                                            "is_available"
                                                        )
                                                    }
                                                    title={
                                                        item.is_active
                                                            ? "Today's 86 list"
                                                            : "Dish is off the menu entirely"
                                                    }
                                                    className={`badge transition-colors disabled:opacity-40 ${
                                                        item.is_available
                                                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                                    }`}
                                                >
                                                    {item.is_available
                                                        ? "Available"
                                                        : "86'd"}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        href={`/admin/menu/items/${item.id}/edit`}
                                                        aria-label={`Edit ${item.name}`}
                                                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() =>
                                                            setPendingDelete(item)
                                                        }
                                                        aria-label={`Delete ${item.name}`}
                                                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!pendingDelete}
                title="Delete this dish?"
                description={
                    pendingDelete
                        ? `"${pendingDelete.name}" will be removed. A dish that appears on existing orders cannot be deleted — take it off the menu instead.`
                        : ""
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
