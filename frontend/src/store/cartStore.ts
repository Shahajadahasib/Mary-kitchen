/**
 * Zustand cart stores – sync with the backend cart API.
 *
 * The backend keeps one cart per `(user, channel)`, so the frontend keeps one
 * store per channel: `useGroceryCart` and `useRestaurantCart`. They are fully
 * independent instances, which means a channel's cart can never leak into the
 * other storefront's UI (e.g. the grocery header badge counting restaurant
 * lines). Consumers pick the channel by picking the hook — "the current cart"
 * is never implicit.
 *
 * A cart line is *either* a grocery line (`product` set) or a restaurant line
 * (`menu_item` set), never both — mirroring `cart.CartItem` on the backend.
 */
import { create } from "zustand";
import api from "@/lib/api";

export type CartChannel = "grocery" | "restaurant";

/** Snapshot of one chosen modifier, as stored on the cart line by the backend. */
export interface SelectedModifier {
  modifier_id: string;
  group: string;
  name: string;
  price_delta: string;
}

export interface CartItem {
  id: string;
  /** Grocery line: set. Restaurant line: null. */
  product: string | null;
  variant: string | null;
  product_detail: {
    id: string;
    name: string;
    slug: string;
    base_price: string;
    primary_image: string | null;
  } | null;
  variant_detail: {
    id: string;
    name: string;
    price: string;
  } | null;
  /** Restaurant line: set. Grocery line: null. */
  menu_item: string | null;
  menu_item_detail: {
    id: string;
    name: string;
    slug: string;
    category_name: string;
    base_price: string;
    is_available: boolean;
    dietary_tags: string[];
    primary_image: string | null;
    has_modifiers: boolean;
  } | null;
  selected_modifiers: SelectedModifier[];
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Cart {
  id: string;
  channel: CartChannel;
  items: CartItem[];
  total_items: number;
  subtotal: string;
}

export interface CartState {
  /** The channel this store instance is bound to. */
  channel: CartChannel;
  cart: Cart | null;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  /** Grocery only — adds a product/variant line. */
  addItem: (
    productId: string,
    variantId?: string,
    quantity?: number
  ) => Promise<void>;
  /** Restaurant only — adds a menu item with its chosen modifiers. */
  addMenuItem: (
    menuItemId: string,
    modifierIds?: string[],
    quantity?: number
  ) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

function createCartStore(channel: CartChannel) {
  return create<CartState>((set) => ({
    channel,
    cart: null,
    isLoading: false,

    fetchCart: async () => {
      set({ isLoading: true });
      try {
        const { data } = await api.get("/cart/", { params: { channel } });
        set({ cart: data.data, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    // POST /cart/add/ takes no channel param — the backend infers it from the
    // payload shape (product_id -> grocery, menu_item_id -> restaurant). That
    // makes calling the wrong add method a silent channel mix-up: the response
    // would be the *other* channel's cart, which we'd then store here. Guard.
    addItem: async (productId, variantId, quantity = 1) => {
      if (channel !== "grocery") {
        throw new Error(
          "addItem() adds a grocery product; use addMenuItem() on the restaurant cart."
        );
      }
      const { data } = await api.post("/cart/add/", {
        product_id: productId,
        variant_id: variantId || null,
        quantity,
      });
      set({ cart: data.data });
    },

    addMenuItem: async (menuItemId, modifierIds = [], quantity = 1) => {
      if (channel !== "restaurant") {
        throw new Error(
          "addMenuItem() adds a restaurant dish; use addItem() on the grocery cart."
        );
      }
      const { data } = await api.post("/cart/add/", {
        menu_item_id: menuItemId,
        modifier_ids: modifierIds,
        quantity,
      });
      set({ cart: data.data });
    },

    // Single-item PATCH/DELETE need no channel — the backend resolves the cart
    // from the item itself.
    updateItem: async (itemId, quantity) => {
      const { data } = await api.patch(`/cart/items/${itemId}/`, { quantity });
      set({ cart: data.data });
    },

    removeItem: async (itemId) => {
      const { data } = await api.delete(`/cart/items/${itemId}/remove/`);
      set({ cart: data.data });
    },

    clearCart: async () => {
      await api.delete("/cart/clear/", { params: { channel } });
      set({ cart: null });
    },
  }));
}

export const useGroceryCart = createCartStore("grocery");
export const useRestaurantCart = createCartStore("restaurant");
