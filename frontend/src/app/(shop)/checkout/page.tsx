"use client";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import api from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";
import {
  MapPin, Package, CreditCard, Loader2, Plus, Edit2, Star,
  Home, Briefcase, CheckCircle, Trash2,
} from "lucide-react";
import AddressFormModal from "@/components/ui/AddressFormModal";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

// ─── Stripe payment sub-form ──────────────────────────────────────────────────

function CheckoutForm({ orderNumber, clientSecret }: { orderNumber: string; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (error) {
      toast.error(error.message || "Payment failed");
      setPaying(false);
    } else if (paymentIntent?.status === "succeeded") {
      toast.success("Payment successful!");
      router.push(`/orders/${orderNumber}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
        <CardElement options={{ style: { base: { fontSize: "16px", color: "#374151", fontFamily: "Inter, sans-serif" } } }} />
      </div>
      <button type="submit" disabled={!stripe || paying} className="btn-primary w-full flex items-center justify-center gap-2">
        {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {paying ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}

// ─── Address card ─────────────────────────────────────────────────────────────

function AddressCard({
  addr,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  addr: any;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const labelIcon =
    addr.label?.toLowerCase() === "home" ? <Home className="w-3.5 h-3.5" /> :
    addr.label?.toLowerCase() === "work" ? <Briefcase className="w-3.5 h-3.5" /> :
    <MapPin className="w-3.5 h-3.5" />;

  return (
    <div
      onClick={onSelect}
      className={`relative flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
        selected ? "border-primary-600 bg-primary-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {/* Radio */}
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
        selected ? "border-primary-600 bg-primary-600" : "border-gray-400"
      }`}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
            selected ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
          }`}>
            {labelIcon} {addr.label}
          </span>
          {addr.is_default && (
            <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-200">
              <Star className="w-3 h-3 fill-current" /> Default
            </span>
          )}
        </div>
        <p className="font-medium text-gray-900 text-sm">{addr.full_name}</p>
        <p className="text-sm text-gray-500 truncate">
          {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}
        </p>
        <p className="text-xs text-gray-400">{addr.suburb} {addr.state} {addr.postcode}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Edit">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        {!addr.is_default && (
          <button onClick={onSetDefault} className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500 transition-colors" title="Set as default">
            <Star className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main checkout page ───────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { cart, fetchCart } = useCartStore();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"details" | "payment">("details");
  const [orderData, setOrderData] = useState<{ orderNumber: string; clientSecret: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Address modal state
  const [addrModal, setAddrModal] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.push("/login");
    else fetchCart();
  }, [hasHydrated, isAuthenticated]);

  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => api.get("/users/addresses/").then((r) => r.data),
    enabled: isAuthenticated,
    onSuccess: (data: any) => {
      // Auto-select default address
      if (!selectedAddress) {
        const def = (data?.results ?? data)?.find((a: any) => a.is_default);
        if (def) setSelectedAddress(def.id);
      }
    },
  } as any);

  const addrList: any[] = addresses?.results ?? addresses ?? [];

  const handleSetDefault = async (id: string) => {
    try {
      await api.post(`/users/addresses/${id}/set_default/`);
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Default address updated");
    } catch {
      toast.error("Failed to update default address");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Remove this address?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/addresses/${id}/`);
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      if (selectedAddress === id) setSelectedAddress("");
      toast.success("Address removed");
    } catch {
      toast.error("Failed to remove address");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (orderType === "delivery" && !selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    setLoading(true);
    try {
      const { data: orderResp } = await api.post("/orders/checkout/", {
        order_type: orderType,
        address_id: orderType === "delivery" ? selectedAddress : null,
        notes,
      });
      const order = orderResp.data;

      const { data: paymentResp } = await api.post("/payments/create-intent/", {
        order_number: order.order_number,
      });
      setOrderData({ orderNumber: order.order_number, clientSecret: paymentResp.data.client_secret });
      setStep("payment");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = Number(cart?.subtotal || 0);

  return (
    <div className="container-xl py-8">
      <h1 className="section-title mb-6">Checkout</h1>

      {step === "details" ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order type */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600" /> Order Type
              </h2>
              <div className="flex gap-4">
                {(["delivery", "pickup"] as const).map((type) => (
                  <label key={type} className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    orderType === type ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <input type="radio" name="order_type" value={type} checked={orderType === type} onChange={() => setOrderType(type)} className="sr-only" />
                    <span className="font-medium capitalize">{type}</span>
                    {type === "delivery" && <span className="text-xs text-gray-500 ml-auto">Delivery fee applies</span>}
                    {type === "pickup" && <span className="text-xs text-green-600 ml-auto">Free</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Delivery address */}
            {orderType === "delivery" && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-600" /> Delivery Address
                  </h2>
                  <button
                    onClick={() => setAddrModal({ open: true })}
                    className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add New
                  </button>
                </div>

                {addrList.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                    <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm mb-3">No saved addresses yet.</p>
                    <button onClick={() => setAddrModal({ open: true })} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 mx-auto">
                      <Plus className="w-4 h-4" /> Add Delivery Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addrList.map((addr: any) => (
                      <AddressCard
                        key={addr.id}
                        addr={addr}
                        selected={selectedAddress === addr.id}
                        onSelect={() => setSelectedAddress(addr.id)}
                        onEdit={() => setAddrModal({ open: true, editing: addr })}
                        onDelete={() => handleDeleteAddress(addr.id)}
                        onSetDefault={() => handleSetDefault(addr.id)}
                      />
                    ))}
                  </div>
                )}

                {selectedAddress && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Delivery address selected
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Order Notes <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or delivery notes..."
                className="input-field min-h-[80px] resize-none"
              />
            </div>
          </div>

          {/* Order summary */}
          <div>
            <div className="card p-6 sticky top-4">
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4 max-h-48 overflow-y-auto pr-1">
                {cart?.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-gray-600">
                    <span className="truncate mr-2">{item.product_detail?.name} × {item.quantity}</span>
                    <span className="flex-shrink-0">{formatCurrency(item.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-1 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>{orderType === "pickup" ? <span className="text-green-600">Free</span> : "TBD"}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t">
                  <span>Total</span><span>{formatCurrency(subtotal)}</span>
                </div>
              </div>
              <button onClick={handlePlaceOrder} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Placing Order..." : "Place Order"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">You'll be redirected to payment</p>
            </div>
          </div>
        </div>
      ) : orderData ? (
        <div className="max-w-lg mx-auto">
          <div className="card p-8">
            <h2 className="font-bold text-xl text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary-600" /> Complete Payment
            </h2>
            <p className="text-gray-500 text-sm mb-6">Order #{orderData.orderNumber} – Enter your card details below</p>
            <Elements stripe={stripePromise} options={{ clientSecret: orderData.clientSecret }}>
              <CheckoutForm {...orderData} />
            </Elements>
          </div>
        </div>
      ) : null}

      {/* Address add/edit modal */}
      <AddressFormModal
        open={addrModal.open}
        onClose={() => setAddrModal({ open: false })}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["addresses"] });
        }}
        initial={addrModal.editing}
      />
    </div>
  );
}
