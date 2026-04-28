"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { cart, fetchCart, updateItem, removeItem, isLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container-xl py-20 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Please login to view your cart</h2>
        <Link href="/login" className="btn-primary inline-flex mt-4">Login</Link>
      </div>
    );
  }

  const items = cart?.items || [];

  if (!isLoading && items.length === 0) {
    return (
      <div className="container-xl py-20 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
        <Link href="/products" className="btn-primary inline-flex mt-4">Start Shopping</Link>
      </div>
    );
  }

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  return (
    <div className="container-xl py-8">
      <h1 className="section-title mb-6">Shopping Cart</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4">
              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                {item.product_detail?.primary_image ? (
                  <Image src={item.product_detail.primary_image} alt={item.product_detail.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product_detail?.slug}`} className="font-semibold text-gray-900 hover:text-primary-700 line-clamp-2 text-sm">
                  {item.product_detail?.name}
                </Link>
                {item.variant_detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.variant_detail.name}</p>
                )}
                <p className="text-sm text-primary-700 font-bold mt-1">{formatCurrency(item.unit_price)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="font-bold text-gray-900">{formatCurrency(item.line_total)}</p>
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                  <button
                    onClick={() => item.quantity > 1 && updateItem(item.id, item.quantity - 1)}
                    className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-l-lg"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2 text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateItem(item.id, item.quantity + 1)}
                    className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-r-lg"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button onClick={() => handleRemove(item.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div className="card p-6 sticky top-4">
            <h2 className="font-bold text-lg text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart?.total_items} items)</span>
                <span>{formatCurrency(cart?.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span className="text-primary-600">Calculated at checkout</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-3 mb-5">
              <span>Subtotal</span>
              <span className="text-primary-700">{formatCurrency(cart?.subtotal || 0)}</span>
            </div>
            <Link href="/checkout" className="btn-primary w-full flex items-center justify-center gap-2">
              Checkout <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/products" className="btn-secondary w-full flex items-center justify-center mt-3 text-sm">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
