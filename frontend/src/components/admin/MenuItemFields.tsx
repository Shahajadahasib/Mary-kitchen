"use client";

import { DIETARY_TAG_OPTIONS, dietaryLabel, type MenuCategory } from "@/types/menu";

/**
 * The core dish fields, shared by the create and edit screens so the two
 * cannot drift apart. Images and modifier groups are deliberately not here:
 * both hang off a saved dish id, so they only exist on the edit screen.
 */

export interface MenuItemFormState {
    category: string;
    name: string;
    description: string;
    base_price: string;
    is_active: boolean;
    is_available: boolean;
    is_featured: boolean;
    dietary_tags: string[];
    prep_time_minutes: string;
}

export const EMPTY_MENU_ITEM: MenuItemFormState = {
    category: "",
    name: "",
    description: "",
    base_price: "",
    is_active: true,
    is_available: true,
    is_featured: false,
    dietary_tags: [],
    prep_time_minutes: "",
};

/** Shape the form state into the JSON body the admin API expects. */
export function toMenuItemPayload(form: MenuItemFormState) {
    return {
        category: form.category,
        name: form.name.trim(),
        description: form.description,
        base_price: form.base_price,
        is_active: form.is_active,
        is_available: form.is_available,
        is_featured: form.is_featured,
        dietary_tags: form.dietary_tags,
        // Blank means "not specified" — the column is nullable.
        prep_time_minutes: form.prep_time_minutes
            ? Number(form.prep_time_minutes)
            : null,
    };
}

export default function MenuItemFields({
    form,
    setForm,
    categories,
}: {
    form: MenuItemFormState;
    setForm: (next: MenuItemFormState) => void;
    categories: MenuCategory[];
}) {
    const toggleTag = (tag: string) => {
        setForm({
            ...form,
            dietary_tags: form.dietary_tags.includes(tag)
                ? form.dietary_tags.filter((t) => t !== tag)
                : [...form.dietary_tags, tag],
        });
    };

    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Dish name <span className="text-red-500">*</span>
                    </label>
                    <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="input-field"
                        placeholder="Butter chicken"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={form.category}
                        onChange={(e) =>
                            setForm({ ...form, category: e.target.value })
                        }
                        className="input-field"
                    >
                        <option value="">Select a category…</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                </label>
                <textarea
                    value={form.description}
                    onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    className="input-field resize-none"
                    placeholder="What is in it, how it is served…"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Base price (AUD) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.base_price}
                        onChange={(e) =>
                            setForm({ ...form, base_price: e.target.value })
                        }
                        className="input-field"
                        placeholder="18.50"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        Modifier options add to this price.
                    </p>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Prep time (minutes)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={form.prep_time_minutes}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                prep_time_minutes: e.target.value,
                            })
                        }
                        className="input-field"
                        placeholder="20"
                    />
                </div>
            </div>

            <div>
                <span className="mb-2 block text-sm font-medium text-gray-700">
                    Dietary tags
                </span>
                <div className="flex flex-wrap gap-2">
                    {DIETARY_TAG_OPTIONS.map((tag) => {
                        const on = form.dietary_tags.includes(tag);
                        return (
                            <button
                                key={tag}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleTag(tag)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    on
                                        ? "bg-emerald-600 text-white"
                                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                {dietaryLabel(tag)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-2 rounded-xl bg-gray-50 p-4">
                <label className="flex items-start gap-2.5 text-sm">
                    <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) =>
                            setForm({ ...form, is_active: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 accent-primary-700"
                    />
                    <span>
                        <span className="font-medium text-gray-900">On the menu</span>
                        <span className="block text-xs text-gray-500">
                            Turn off to retire the dish entirely.
                        </span>
                    </span>
                </label>

                <label className="flex items-start gap-2.5 text-sm">
                    <input
                        type="checkbox"
                        checked={form.is_available}
                        onChange={(e) =>
                            setForm({ ...form, is_available: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 accent-primary-700"
                    />
                    <span>
                        <span className="font-medium text-gray-900">
                            Available today
                        </span>
                        <span className="block text-xs text-gray-500">
                            Today&apos;s 86 list — off means sold out for now, still
                            on the menu.
                        </span>
                    </span>
                </label>

                <label className="flex items-start gap-2.5 text-sm">
                    <input
                        type="checkbox"
                        checked={form.is_featured}
                        onChange={(e) =>
                            setForm({ ...form, is_featured: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 accent-primary-700"
                    />
                    <span>
                        <span className="font-medium text-gray-900">
                            Chef&apos;s pick
                        </span>
                        <span className="block text-xs text-gray-500">
                            Highlighted on the menu.
                        </span>
                    </span>
                </label>
            </div>
        </div>
    );
}
