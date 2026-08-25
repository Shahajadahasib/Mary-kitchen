"use client";

import MediaImage from "@/components/ui/MediaImage";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import api from "@/lib/api";
import { absoluteMediaUrl } from "@/lib/media";
import type { MenuCategory } from "@/types/menu";

/**
 * Menu category admin.
 *
 * Mirrors the grocery category screen, against /menu/admin/categories/. The
 * backend refuses to delete a category that still holds dishes and returns a
 * specific 400 `detail`, so that message is surfaced rather than a generic one.
 */

const EMPTY_FORM = {
    name: "",
    description: "",
    is_active: true,
    sort_order: 0,
};

export default function AdminMenuCategoriesPage() {
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MenuCategory | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<MenuCategory | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: categories, isLoading } = useQuery<MenuCategory[]>({
        queryKey: ["admin-menu-categories"],
        queryFn: () =>
            api.get("/menu/admin/categories/").then((r) => r.data.results ?? r.data),
    });

    useEffect(() => {
        return () => {
            if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const revokePreview = () => {
        if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setImageFile(null);
        revokePreview();
        setImagePreview(null);
        setShowModal(true);
    };

    const openEdit = (cat: MenuCategory) => {
        setEditing(cat);
        setForm({
            name: cat.name,
            description: cat.description ?? "",
            is_active: cat.is_active,
            sort_order: cat.sort_order ?? 0,
        });
        setImageFile(null);
        revokePreview();
        setImagePreview(absoluteMediaUrl(cat.image_url ?? cat.image ?? null));
        setShowModal(true);
    };

    const closeModal = () => {
        revokePreview();
        setImagePreview(null);
        setImageFile(null);
        setEditing(null);
        setShowModal(false);
    };

    const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        revokePreview();
        setImageFile(f);
        setImagePreview(URL.createObjectURL(f));
        e.target.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Category name is required");
            return;
        }
        setSaving(true);
        try {
            // Image uploads must go as FormData so the browser sets the multipart
            // boundary; the axios client drops Content-Type for us.
            let payload: FormData | Record<string, unknown>;
            if (imageFile) {
                const fd = new FormData();
                fd.append("name", form.name.trim());
                fd.append("description", form.description);
                fd.append("is_active", form.is_active ? "true" : "false");
                fd.append("sort_order", String(form.sort_order));
                fd.append("image", imageFile);
                payload = fd;
            } else {
                payload = { ...form, name: form.name.trim() };
            }

            if (editing) {
                await api.patch(`/menu/admin/categories/${editing.id}/`, payload);
                toast.success("Menu category updated");
            } else {
                await api.post("/menu/admin/categories/", payload);
                toast.success("Menu category created");
            }
            qc.invalidateQueries({ queryKey: ["admin-menu-categories"] });
            qc.invalidateQueries({ queryKey: ["menu-categories"] });
            closeModal();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.name?.[0] ||
                    err?.response?.data?.detail ||
                    err?.response?.data?.message ||
                    "Failed to save menu category"
            );
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const cat = pendingDelete;
        setPendingDelete(null);
        try {
            await api.delete(`/menu/admin/categories/${cat.id}/`);
            toast.success("Menu category deleted");
            qc.invalidateQueries({ queryKey: ["admin-menu-categories"] });
            qc.invalidateQueries({ queryKey: ["menu-categories"] });
        } catch (err: any) {
            // The API returns a specific 400 when the category still has dishes.
            toast.error(
                err?.response?.data?.detail ||
                    err?.response?.data?.message ||
                    "Failed to delete menu category"
            );
        }
    };

    const rows = categories ?? [];

    return (
        <div>
            <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        Menu Categories
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-400">
                        Sections of the restaurant menu, e.g. Starters, Mains.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="btn-primary flex shrink-0 items-center gap-2 text-sm"
                >
                    <Plus className="h-4 w-4" /> New category
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-20 rounded-xl" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
                    <UtensilsCrossed
                        className="mx-auto mb-3 h-10 w-10 text-gray-300"
                        strokeWidth={1.25}
                    />
                    <p className="font-medium text-gray-700">No menu categories yet</p>
                    <p className="mt-1 text-sm text-gray-400">
                        Add one before creating dishes — every dish needs a category.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {[
                                        "Category",
                                        "Dishes",
                                        "Order",
                                        "Status",
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
                                {rows.map((cat) => {
                                    const img = absoluteMediaUrl(
                                        cat.image_url ?? cat.image ?? null
                                    );
                                    return (
                                        <tr
                                            key={cat.id}
                                            className="border-b border-gray-50 transition-colors hover:bg-gray-50/60"
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                        {img ? (
                                                            <MediaImage
                                                                src={img}
                                                                alt={cat.name}
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
                                                        <p className="font-medium text-gray-900">
                                                            {cat.name}
                                                        </p>
                                                        <p className="truncate text-xs text-gray-400">
                                                            /{cat.slug}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-600">
                                                {cat.item_count}
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-600">
                                                {cat.sort_order}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={`badge ${
                                                        cat.is_active
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-600"
                                                    }`}
                                                >
                                                    {cat.is_active
                                                        ? "Active"
                                                        : "Hidden"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEdit(cat)}
                                                        aria-label={`Edit ${cat.name}`}
                                                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setPendingDelete(cat)
                                                        }
                                                        aria-label={`Delete ${cat.name}`}
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

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editing ? "Edit menu category" : "New menu category"}
                            </h3>
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Name
                                </label>
                                <input
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({ ...form, name: e.target.value })
                                    }
                                    className="input-field"
                                    placeholder="Starters"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description: e.target.value,
                                        })
                                    }
                                    rows={2}
                                    className="input-field resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Sort order
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.sort_order}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                sort_order:
                                                    Number(e.target.value) || 0,
                                            })
                                        }
                                        className="input-field"
                                    />
                                </div>
                                <div className="flex items-end pb-2.5">
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={form.is_active}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    is_active: e.target.checked,
                                                })
                                            }
                                            className="h-4 w-4 accent-primary-700"
                                        />
                                        Show on the menu
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Image
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                                        {imagePreview ? (
                                            <MediaImage
                                                src={imagePreview}
                                                alt=""
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                                unoptimized={imagePreview.startsWith(
                                                    "blob:"
                                                )}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                                                <UtensilsCrossed className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={onPickImage}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn-secondary text-sm"
                                    >
                                        Choose image
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex flex-1 items-center justify-center gap-2"
                                >
                                    {saving && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {editing ? "Save changes" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!pendingDelete}
                title="Delete menu category?"
                description={
                    pendingDelete
                        ? `"${pendingDelete.name}" will be removed. Categories that still contain dishes cannot be deleted.`
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
