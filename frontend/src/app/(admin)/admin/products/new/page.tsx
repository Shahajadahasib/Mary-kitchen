"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [catLoading, setCatLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    base_price: "",
    compare_price: "",
    sku: "",
    stock_quantity: "0",
    category: "",
    is_featured: false,
    is_active: true,
    weight: "",
    unit: "kg",
    tags: "",
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/products/admin/categories/").then((r) => r.data.results ?? r.data),
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) { toast.error("Category name is required"); return; }
    setCatLoading(true);
    try {
      const { data } = await api.post("/products/admin/categories/", { ...catForm, is_active: true });
      toast.success(`Category "${data.name}" created!`);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setForm((prev) => ({ ...prev, category: data.id }));
      setShowCatModal(false);
      setCatForm({ name: "", description: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.name?.[0] || "Failed to create category");
    } finally {
      setCatLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.base_price || !form.category) {
      toast.error("Name, price and category are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/products/admin/products/", {
        name: form.name,
        description: form.description,
        category: form.category,
        base_price: parseFloat(form.base_price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        stock_quantity: parseInt(form.stock_quantity),
        sku: form.sku || null,
        weight: form.weight ? parseFloat(form.weight) : null,
        unit: form.unit,
        is_active: form.is_active,
        is_featured: form.is_featured,
        tags: form.tags || "",
      });
      toast.success("Product created!");
      router.push("/admin/products");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.name?.[0] || "Failed to create product";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Basic Information</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input required value={form.name} onChange={update("name")} className="input-field" placeholder="e.g. Fresh Mango" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={update("description")} rows={4} className="input-field resize-none" placeholder="Product description..." />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Category *</label>
              <button
                type="button"
                onClick={() => setShowCatModal(true)}
                className="flex items-center gap-1 text-xs text-primary-700 hover:underline font-medium"
              >
                <Plus className="w-3 h-3" /> New Category
              </button>
            </div>
            <select required value={form.category} onChange={update("category")} className="input-field">
              <option value="">Select a category</option>
              {categories?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(!categories || categories.length === 0) && (
              <p className="text-xs text-amber-600 mt-1">No categories yet — click "New Category" to create one first.</p>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (AUD) *</label>
              <input required type="number" step="0.01" min="0" value={form.base_price} onChange={update("base_price")} className="input-field" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price <span className="text-gray-400 font-normal">(before discount)</span></label>
              <input type="number" step="0.01" min="0" value={form.compare_price} onChange={update("compare_price")} className="input-field" placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Inventory</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input value={form.sku} onChange={update("sku")} className="input-field" placeholder="e.g. MNG-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
              <input type="number" min="0" value={form.stock_quantity} onChange={update("stock_quantity")} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={form.unit} onChange={update("unit")} className="input-field">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="mL">mL</option>
                <option value="pcs">pcs</option>
                <option value="pack">pack</option>
                <option value="dozen">dozen</option>
                <option value="box">box</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input type="number" step="0.01" min="0" value={form.weight} onChange={update("weight")} className="input-field" placeholder="e.g. 0.5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400 font-normal">(comma separated)</span></label>
            <input value={form.tags} onChange={update("tags")} className="input-field" placeholder="e.g. fresh, organic, local" />
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={update("is_active")} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm text-gray-700">Active (visible in store)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={update("is_featured")} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm text-gray-700">Featured (shown on homepage)</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pb-8">
          <Link href="/admin/products" className="btn-secondary flex-1 text-center">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Product
          </button>
        </div>
      </form>

      {/* Quick Create Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">New Category</h3>
              <button onClick={() => setShowCatModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  required
                  autoFocus
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Fresh Produce"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="input-field"
                  placeholder="Short description..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCatModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={catLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {catLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
