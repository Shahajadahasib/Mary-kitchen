/**
 * Restaurant menu types, mirroring `apps.menu.serializers`.
 *
 * Kept separate from the grocery product types on purpose — the menu domain is
 * deliberately parallel to `apps.products` on the backend (no stock quantity,
 * an `is_available` 86 toggle instead, and per-dish modifier groups).
 */

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  item_count: number;
}

/** One selectable option inside a modifier group, e.g. "Large" (+$2.00). */
export interface Modifier {
  id: string;
  name: string;
  price_delta: string;
  is_default: boolean;
  sort_order: number;
}

/** A choice group on a dish, e.g. "Choose your size". */
export interface ModifierGroup {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_select: number;
  /** null = unlimited (only meaningful when selection_type is "multiple"). */
  max_select: number | null;
  sort_order: number;
  options: Modifier[];
}

export interface MenuItemImage {
  id: string;
  image: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
}

/** Shape returned by the list/browse endpoints and embedded in cart lines. */
export interface MenuItemListEntry {
  id: string;
  name: string;
  slug: string;
  category: string;
  category_name: string;
  base_price: string;
  is_available: boolean;
  is_featured: boolean;
  dietary_tags: string[];
  prep_time_minutes: number | null;
  primary_image: string | null;
  has_modifiers: boolean;
}

/** Shape returned by GET /menu/<slug>/. */
export interface MenuItemDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: MenuCategory;
  base_price: string;
  is_active: boolean;
  is_available: boolean;
  is_featured: boolean;
  dietary_tags: string[];
  prep_time_minutes: number | null;
  images: MenuItemImage[];
  modifier_groups: ModifierGroup[];
  created_at: string;
  updated_at: string;
}

/**
 * Display labels for the free-form `dietary_tags` JSON list. Tags the kitchen
 * invents that aren't listed here still render, just title-cased.
 */
const DIETARY_LABELS: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  gluten_free: "Gluten free",
  halal: "Halal",
  contains_nuts: "Contains nuts",
  spicy: "Spicy",
  dairy_free: "Dairy free",
};

export function dietaryLabel(tag: string): string {
  return (
    DIETARY_LABELS[tag] ??
    tag
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

/** Tags that are allergy warnings rather than dietary suitability. */
const WARNING_TAGS = new Set(["contains_nuts", "spicy"]);

export function dietaryTagClass(tag: string): string {
  return WARNING_TAGS.has(tag)
    ? "bg-amber-50 text-amber-800 border border-amber-200"
    : "bg-emerald-50 text-emerald-800 border border-emerald-200";
}
