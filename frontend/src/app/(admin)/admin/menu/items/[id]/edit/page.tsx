"use client";

import MediaImage from "@/components/ui/MediaImage";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    ImagePlus,
    Loader2,
    Plus,
    Star,
    Trash2,
    UtensilsCrossed,
    X,
} from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import MenuItemFields, {
    EMPTY_MENU_ITEM,
    toMenuItemPayload,
    type MenuItemFormState,
} from "@/components/admin/MenuItemFields";
import api from "@/lib/api";
import { absoluteMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/utils";
import type {
    MenuCategory,
    MenuItemDetail,
    ModifierGroup,
} from "@/types/menu";

/**
 * Edit a dish: core fields, photos, and modifier groups.
 *
 * The nested endpoints are worth spelling out, because the collection route for
 * images is a viewset *action* (POST only) while the per-image route is a
 * separate viewset:
 *   POST   /menu/admin/items/<id>/images/                  (FormData upload)
 *   PATCH  /menu/admin/items/<id>/images/<imageId>/        (set primary)
 *   DELETE /menu/admin/items/<id>/images/<imageId>/
 *   POST   /menu/admin/items/<id>/modifier-groups/
 *   DELETE /menu/admin/items/<id>/modifier-groups/<groupId>/
 *   POST   /menu/admin/items/<id>/modifier-groups/<groupId>/options/
 *   DELETE /menu/admin/items/<id>/modifier-groups/<groupId>/options/<optId>/
 * Listing images via GET on the collection route would 405 — they come from the
 * dish detail payload instead.
 */

const EMPTY_GROUP = {
    name: "",
    selection_type: "single" as "single" | "multiple",
    is_required: false,
    min_select: 0,
    max_select: "" as string,
    sort_order: 0,
};

export default function AdminEditMenuItemPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const qc = useQueryClient();

    const [form, setForm] = useState<MenuItemFormState>(EMPTY_MENU_ITEM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupForm, setGroupForm] = useState(EMPTY_GROUP);
    const [savingGroup, setSavingGroup] = useState(false);

    // Per-group inline "add option" drafts, keyed by group id.
    const [optionDrafts, setOptionDrafts] = useState<
        Record<string, { name: string; price_delta: string }>
    >({});
    const [savingOption, setSavingOption] = useState<string | null>(null);

    const [pendingDelete, setPendingDelete] = useState<
        { kind: "group" | "image"; id: string; label: string } | null
    >(null);

    const itemKey = ["admin-menu-item", id];

    const { data: item, isLoading } = useQuery<MenuItemDetail>({
        queryKey: itemKey,
        queryFn: () => api.get(`/menu/admin/items/${id}/`).then((r) => r.data),
        enabled: !!id,
    });

    const { data: categories } = useQuery<MenuCategory[]>({
        queryKey: ["admin-menu-categories"],
        queryFn: () =>
            api.get("/menu/admin/categories/").then((r) => r.data.results ?? r.data),
    });

    // Seed the form once the dish loads.
    useEffect(() => {
        if (!item) return;
        setForm({
            category: item.category?.id ?? "",
            name: item.name,
            description: item.description ?? "",
            base_price: String(item.base_price ?? ""),
            is_active: item.is_active,
            is_available: item.is_available,
            is_featured: item.is_featured,
            dietary_tags: item.dietary_tags ?? [],
            prep_time_minutes:
                item.prep_time_minutes != null ? String(item.prep_time_minutes) : "",
        });
    }, [item]);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: itemKey });
        qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
        qc.invalidateQueries({ queryKey: ["menu-items"] });
    };

    const apiError = (err: any, fallback: string) => {
        const d = err?.response?.data;
        return (
            d?.name?.[0] ||
            d?.base_price?.[0] ||
            d?.category?.[0] ||
            d?.error ||
            d?.detail ||
            d?.message ||
            fallback
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Dish name is required");
            return;
        }
        setSaving(true);
        try {
            await api.patch(`/menu/admin/items/${id}/`, toMenuItemPayload(form));
            toast.success("Dish updated");
            refresh();
        } catch (err) {
            toast.error(apiError(err, "Failed to save dish"));
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setUploading(true);
        try {
            // FormData so the browser sets the multipart boundary.
            const fd = new FormData();
            fd.append("image", file);
            if (!item?.images?.length) fd.append("is_primary", "true");
            await api.post(`/menu/admin/items/${id}/images/`, fd);
            toast.success("Photo added");
            refresh();
        } catch (err) {
            toast.error(apiError(err, "Failed to upload photo"));
        } finally {
            setUploading(false);
        }
    };

    const setPrimary = async (imageId: string) => {
        try {
            await api.patch(`/menu/admin/items/${id}/images/${imageId}/`, {
                is_primary: true,
            });
            refresh();
        } catch {
            toast.error("Could not set the main photo");
        }
    };

    const createGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupForm.name.trim()) {
            toast.error("Group name is required");
            return;
        }
        setSavingGroup(true);
        try {
            await api.post(`/menu/admin/items/${id}/modifier-groups/`, {
                name: groupForm.name.trim(),
                selection_type: groupForm.selection_type,
                is_required: groupForm.is_required,
                min_select: groupForm.min_select,
                // Blank means unlimited; single-choice is forced to 1 server-side.
                max_select:
                    groupForm.selection_type === "single"
                        ? 1
                        : groupForm.max_select === ""
                          ? null
                          : Number(groupForm.max_select),
                sort_order: groupForm.sort_order,
            });
            toast.success("Option group added");
            setGroupForm(EMPTY_GROUP);
            setShowGroupModal(false);
            refresh();
        } catch (err) {
            toast.error(apiError(err, "Failed to add option group"));
        } finally {
            setSavingGroup(false);
        }
    };

    const addOption = async (group: ModifierGroup) => {
        const draft = optionDrafts[group.id];
        if (!draft?.name?.trim()) {
            toast.error("Option name is required");
            return;
        }
        setSavingOption(group.id);
        try {
            await api.post(
                `/menu/admin/items/${id}/modifier-groups/${group.id}/options/`,
                {
                    name: draft.name.trim(),
                    price_delta: draft.price_delta === "" ? "0" : draft.price_delta,
                }
            );
            setOptionDrafts((prev) => ({
                ...prev,
                [group.id]: { name: "", price_delta: "" },
            }));
            refresh();
        } catch (err) {
            toast.error(apiError(err, "Failed to add option"));
        } finally {
            setSavingOption(null);
        }
    };

    const deleteOption = async (groupId: string, optionId: string) => {
        try {
            await api.delete(
                `/menu/admin/items/${id}/modifier-groups/${groupId}/options/${optionId}/`
            );
            refresh();
        } catch {
            toast.error("Could not remove that option");
        }
    };

    const confirmPendingDelete = async () => {
        if (!pendingDelete) return;
        const target = pendingDelete;
        setPendingDelete(null);
        try {
            if (target.kind === "group") {
                await api.delete(
                    `/menu/admin/items/${id}/modifier-groups/${target.id}/`
                );
                toast.success("Option group removed");
            } else {
                await api.delete(`/menu/admin/items/${id}/images/${target.id}/`);
                toast.success("Photo removed");
            }
            refresh();
        } catch (err) {
            toast.error(apiError(err, "Delete failed"));
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-3xl space-y-4">
                <div className="skeleton h-10 w-64 rounded-lg" />
                <div className="skeleton h-96 rounded-2xl" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="py-20 text-center text-gray-400">
                <p>Dish not found.</p>
                <Link href="/admin/menu" className="btn-primary mt-4 inline-flex">
                    Back to menu
                </Link>
            </div>
        );
    }

    const images = item.images ?? [];
    const groups = item.modifier_groups ?? [];

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
                <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-gray-900">
                        {item.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-400">
                        {item.category?.name} · {formatCurrency(item.base_price)}
                    </p>
                </div>
            </div>

            {/* Core fields */}
            <form
                onSubmit={handleSave}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
            >
                <MenuItemFields
                    form={form}
                    setForm={setForm}
                    categories={categories ?? []}
                />
                <div className="mt-6 flex gap-3 border-t border-gray-100 pt-5">
                    <Link href="/admin/menu" className="btn-secondary flex-1 text-center">
                        Done
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary flex flex-1 items-center justify-center gap-2"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save changes
                    </button>
                </div>
            </form>

            {/* Photos */}
            <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-gray-900">Photos</h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                            The starred photo is the one shown on the menu.
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="btn-secondary flex shrink-0 items-center gap-2 text-sm"
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ImagePlus className="h-4 w-4" />
                        )}
                        Add photo
                    </button>
                </div>

                {images.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-400">
                        No photos yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {images.map((img) => {
                            const src = absoluteMediaUrl(img.image);
                            return (
                                <div
                                    key={img.id}
                                    className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100"
                                >
                                    {src ? (
                                        <MediaImage
                                            src={src}
                                            alt={img.alt_text || item.name}
                                            fill
                                            sizes="150px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                                            <UtensilsCrossed className="h-6 w-6" />
                                        </div>
                                    )}

                                    {img.is_primary && (
                                        <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 p-1 text-white">
                                            <Star className="h-3 w-3 fill-current" />
                                        </span>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                        {!img.is_primary && (
                                            <button
                                                type="button"
                                                onClick={() => setPrimary(img.id)}
                                                title="Make main photo"
                                                aria-label="Make main photo"
                                                className="rounded p-1 text-white hover:bg-white/20"
                                            >
                                                <Star className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPendingDelete({
                                                    kind: "image",
                                                    id: img.id,
                                                    label: "this photo",
                                                })
                                            }
                                            title="Remove photo"
                                            aria-label="Remove photo"
                                            className="rounded p-1 text-white hover:bg-white/20"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Modifier groups */}
            <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-gray-900">Choice options</h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Groups of choices on this dish, e.g. size or add-ons.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setGroupForm(EMPTY_GROUP);
                            setShowGroupModal(true);
                        }}
                        className="btn-secondary flex shrink-0 items-center gap-2 text-sm"
                    >
                        <Plus className="h-4 w-4" /> Add group
                    </button>
                </div>

                {groups.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-400">
                        No choice groups — this dish is ordered as-is.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {groups.map((group) => {
                            const draft = optionDrafts[group.id] ?? {
                                name: "",
                                price_delta: "",
                            };
                            return (
                                <div
                                    key={group.id}
                                    className="rounded-xl border border-gray-200 p-4"
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {group.name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                {group.selection_type === "single"
                                                    ? "Pick one"
                                                    : `Pick several${
                                                          group.max_select != null
                                                              ? `, up to ${group.max_select}`
                                                              : ""
                                                      }`}
                                                {group.is_required
                                                    ? " · Required"
                                                    : " · Optional"}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPendingDelete({
                                                    kind: "group",
                                                    id: group.id,
                                                    label: group.name,
                                                })
                                            }
                                            aria-label={`Remove ${group.name}`}
                                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {group.options.length > 0 && (
                                        <ul className="mb-3 space-y-1.5">
                                            {group.options.map((opt) => (
                                                <li
                                                    key={opt.id}
                                                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                                                >
                                                    <span className="text-gray-800">
                                                        {opt.name}
                                                        {opt.is_default && (
                                                            <span className="ml-2 text-xs text-gray-400">
                                                                default
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-gray-600">
                                                            {Number(opt.price_delta) === 0
                                                                ? "—"
                                                                : `${
                                                                      Number(
                                                                          opt.price_delta
                                                                      ) > 0
                                                                          ? "+"
                                                                          : "−"
                                                                  }${formatCurrency(
                                                                      Math.abs(
                                                                          Number(
                                                                              opt.price_delta
                                                                          )
                                                                      )
                                                                  )}`}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteOption(
                                                                    group.id,
                                                                    opt.id
                                                                )
                                                            }
                                                            aria-label={`Remove ${opt.name}`}
                                                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className="flex gap-2">
                                        <input
                                            value={draft.name}
                                            onChange={(e) =>
                                                setOptionDrafts((prev) => ({
                                                    ...prev,
                                                    [group.id]: {
                                                        ...draft,
                                                        name: e.target.value,
                                                    },
                                                }))
                                            }
                                            placeholder="Option name"
                                            className="input-field flex-1 text-sm"
                                        />
                                        <input
                                            value={draft.price_delta}
                                            onChange={(e) =>
                                                setOptionDrafts((prev) => ({
                                                    ...prev,
                                                    [group.id]: {
                                                        ...draft,
                                                        price_delta: e.target.value,
                                                    },
                                                }))
                                            }
                                            type="number"
                                            step="0.01"
                                            placeholder="+$"
                                            className="input-field w-24 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addOption(group)}
                                            disabled={savingOption === group.id}
                                            className="btn-secondary shrink-0 px-3 text-sm"
                                        >
                                            {savingOption === group.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plus className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Add-group modal */}
            {showGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                New choice group
                            </h3>
                            <button
                                onClick={() => setShowGroupModal(false)}
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={createGroup} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Group name
                                </label>
                                <input
                                    value={groupForm.name}
                                    onChange={(e) =>
                                        setGroupForm({
                                            ...groupForm,
                                            name: e.target.value,
                                        })
                                    }
                                    className="input-field"
                                    placeholder="Choose your size"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Selection
                                </label>
                                <select
                                    value={groupForm.selection_type}
                                    onChange={(e) =>
                                        setGroupForm({
                                            ...groupForm,
                                            selection_type: e.target
                                                .value as "single" | "multiple",
                                        })
                                    }
                                    className="input-field"
                                >
                                    <option value="single">Pick one</option>
                                    <option value="multiple">Pick several</option>
                                </select>
                            </div>

                            {groupForm.selection_type === "multiple" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Minimum
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={groupForm.min_select}
                                            onChange={(e) =>
                                                setGroupForm({
                                                    ...groupForm,
                                                    min_select:
                                                        Number(e.target.value) || 0,
                                                })
                                            }
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Maximum
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={groupForm.max_select}
                                            onChange={(e) =>
                                                setGroupForm({
                                                    ...groupForm,
                                                    max_select: e.target.value,
                                                })
                                            }
                                            className="input-field"
                                            placeholder="No limit"
                                        />
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={groupForm.is_required}
                                    onChange={(e) =>
                                        setGroupForm({
                                            ...groupForm,
                                            is_required: e.target.checked,
                                        })
                                    }
                                    className="h-4 w-4 accent-primary-700"
                                />
                                Customer must choose from this group
                            </label>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowGroupModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingGroup}
                                    className="btn-primary flex flex-1 items-center justify-center gap-2"
                                >
                                    {savingGroup && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    Add group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!pendingDelete}
                title={
                    pendingDelete?.kind === "group"
                        ? "Remove this choice group?"
                        : "Remove this photo?"
                }
                description={
                    pendingDelete
                        ? pendingDelete.kind === "group"
                            ? `"${pendingDelete.label}" and all of its options will be removed from this dish.`
                            : "The photo will be deleted from this dish."
                        : ""
                }
                confirmText="Remove"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmPendingDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
