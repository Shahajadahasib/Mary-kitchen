"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import MenuItemFields, {
    EMPTY_MENU_ITEM,
    toMenuItemPayload,
    type MenuItemFormState,
} from "@/components/admin/MenuItemFields";
import api from "@/lib/api";
import type { MenuCategory } from "@/types/menu";

/**
 * Create a dish.
 *
 * Photos and modifier groups both hang off a saved dish id, so this screen
 * only captures the core fields and then hands straight over to the edit
 * screen where those can be added.
 */
export default function AdminNewMenuItemPage() {
    const router = useRouter();
    const qc = useQueryClient();
    const [form, setForm] = useState<MenuItemFormState>(EMPTY_MENU_ITEM);
    const [saving, setSaving] = useState(false);

    const { data: categories } = useQuery<MenuCategory[]>({
        queryKey: ["admin-menu-categories"],
        queryFn: () =>
            api.get("/menu/admin/categories/").then((r) => r.data.results ?? r.data),
    });

    const categoryRows = categories ?? [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Dish name is required");
            return;
        }
        if (!form.category) {
            toast.error("Pick a category");
            return;
        }
        if (form.base_price === "" || Number(form.base_price) < 0) {
            toast.error("Enter a base price");
            return;
        }

        setSaving(true);
        try {
            const { data } = await api.post(
                "/menu/admin/items/",
                toMenuItemPayload(form)
            );
            qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
            qc.invalidateQueries({ queryKey: ["menu-items"] });
            toast.success("Dish created — now add photos and options");
            router.push(`/admin/menu/items/${data.id}/edit`);
        } catch (err: any) {
            const d = err?.response?.data;
            toast.error(
                d?.name?.[0] ||
                    d?.base_price?.[0] ||
                    d?.category?.[0] ||
                    d?.detail ||
                    d?.message ||
                    "Failed to create dish"
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/admin/menu"
                    aria-label="Back to menu"
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">New dish</h2>
                    <p className="mt-0.5 text-sm text-gray-400">
                        Photos and choice options come next, once it is saved.
                    </p>
                </div>
            </div>

            {categoryRows.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm font-medium text-amber-900">
                        There are no menu categories yet.
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                        Every dish belongs to a category, so create one first.
                    </p>
                    <Link
                        href="/admin/menu/categories"
                        className="btn-primary mt-4 inline-flex text-sm"
                    >
                        Add a category
                    </Link>
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                >
                    <MenuItemFields
                        form={form}
                        setForm={setForm}
                        categories={categoryRows}
                    />

                    <div className="mt-6 flex gap-3 border-t border-gray-100 pt-5">
                        <Link
                            href="/admin/menu"
                            className="btn-secondary flex-1 text-center"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex flex-1 items-center justify-center gap-2"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create dish
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
