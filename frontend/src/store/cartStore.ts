/**
 * Zustand cart store – syncs with backend cart API.
 */
import { create } from "zustand";
import api from "@/lib/api";

interface CartItem {
  id: string;
  product: string;
  variant: string | null;
  product_detail: {
    id: string;
    name: string;
    slug: string;
    base_price: string;
    primary_image: string | null;
  };
  variant_detail: {
    id: string;
    name: string;
    price: string;
  } | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface Cart {
  id: string;
  items: CartItem[];
  total_items: number;
  subtotal: string;
}

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, variantId?: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/cart/");
      set({ cart: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, variantId, quantity = 1) => {
    const { data } = await api.post("/cart/add/", {
      product_id: productId,
      variant_id: variantId || null,
      quantity,
    });
    set({ cart: data.data });
  },

  updateItem: async (itemId, quantity) => {
    const { data } = await api.patch(`/cart/items/${itemId}/`, { quantity });
    set({ cart: data.data });
  },

  removeItem: async (itemId) => {
    const { data } = await api.delete(`/cart/items/${itemId}/remove/`);
    set({ cart: data.data });
  },

  clearCart: async () => {
    await api.delete("/cart/clear/");
    set({ cart: null });
  },
}));
