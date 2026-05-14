"use client";
import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatDateTime, toLocalDatetimeInput, toUTCISO } from "@/lib/utils";
import { ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  location: "hero" | "top" | "middle" | "bottom";
  size: "small" | "medium" | "large" | "extra_large";
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

const LOCATIONS = [
  { value: "hero", label: "Hero" },
  { value: "top", label: "Top Strip" },
  { value: "middle", label: "Middle Section" },
  { value: "bottom", label: "Bottom Section" },
];

const SIZES = [
  { value: "small", label: "Small", hint: "~120px" },
  { value: "medium", label: "Medium", hint: "~200px" },
  { value: "large", label: "Large", hint: "~320px" },
  { value: "extra_large", label: "Extra Large", hint: "~420px" },
];

const LOCATION_COLORS: Record<string, string> = {
  hero: "bg-purple-100 text-purple-700",
  top: "bg-blue-100 text-blue-700",
  middle: "bg-amber-100 text-amber-700",
  bottom: "bg-green-100 text-green-700",
};

function nowLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

// When the native picker's "Today" button is used it sets time to 00:00.
// If user picked today's date with midnight, assume they wanted "now".
function normaliseDateTimeInput(value: string): string {
  if (!value) return value;
  const today = nowLocal().slice(0, 10);
  if (value.slice(0, 10) === today && value.slice(11, 16) === "00:00") {
    return nowLocal();
  }
  return value;
}

const EMPTY_FORM = {
  title: "", subtitle: "", link: "",
  location: "hero" as Banner["location"],
  size: "medium" as Banner["size"],
  sort_order: 0, is_active: true,
  starts_at: "", ends_at: "",
};

type FormState = typeof EMPTY_FORM & { imageFile?: File | null };

export default function AdminBannersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; banner: Banner | null }>({ open: false, banner: null });
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => api.get("/banners/admin/").then((r) => r.data),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setModal({ open: true, banner: null });
  };

  const openEdit = (banner: Banner) => {
    setForm({
      title: banner.title,
      subtitle: banner.subtitle,
      link: banner.link,
      location: banner.location,
      size: banner.size,
      sort_order: banner.sort_order,
      is_active: banner.is_active,
      starts_at: toLocalDatetimeInput(banner.starts_at ?? ""),
      ends_at: toLocalDatetimeInput(banner.ends_at ?? ""),
      imageFile: null,
    });
    setImagePreview(banner.image || null);
    setModal({ open: true, banner });
  };

  const closeModal = () => {
    setModal({ open: false, banner: null });
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, imageFile: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: (payload: FormState) => {
      const fd = new FormData();
      fd.append("title", payload.title);
      fd.append("subtitle", payload.subtitle);
      fd.append("link", payload.link);
      fd.append("location", payload.location);
      fd.append("size", payload.size);
      fd.append("sort_order", String(payload.sort_order));
      fd.append("is_active", String(payload.is_active));
      if (payload.starts_at) fd.append("starts_at", toUTCISO(payload.starts_at));
      if (payload.ends_at) fd.append("ends_at", toUTCISO(payload.ends_at));
      if (payload.imageFile) fd.append("image", payload.imageFile);

      return modal.banner
        ? api.patch(`/banners/admin/${modal.banner.id}/`, fd)
        : api.post("/banners/admin/", fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success(modal.banner ? "Banner updated" : "Banner created");
      closeModal();
    },
    onError: () => toast.error("Failed to save banner"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/banners/admin/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete banner"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/banners/admin/${id}/`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
    onError: () => toast.error("Failed to update banner"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.banner && !form.imageFile) {
      toast.error("Please upload a banner image");
      return;
    }
    saveMutation.mutate(form);
  };

  const banners: Banner[] = data?.results ?? data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Promotional Banners</h2>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Image", "Title", "Location", "Order", "Schedule", "Active", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : banners.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No banners yet. Click "Add Banner" to create one.</td></tr>
            ) : (
              banners.map((banner) => (
                <tr key={banner.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {banner.image ? (
                        <Image src={banner.image} alt={banner.title} fill className="object-cover" sizes="80px" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-300 m-auto mt-3" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[180px]">{banner.title}</p>
                    {banner.subtitle && <p className="text-xs text-gray-400 truncate max-w-[180px]">{banner.subtitle}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${LOCATION_COLORS[banner.location]}`}>
                      {LOCATIONS.find((l) => l.value === banner.location)?.label ?? banner.location}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{banner.sort_order}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {banner.starts_at || banner.ends_at ? (
                      <>
                        {banner.starts_at && <div>From: {formatDateTime(banner.starts_at)}</div>}
                        {banner.ends_at && <div>To: {formatDateTime(banner.ends_at)}</div>}
                      </>
                    ) : (
                      <span className="text-gray-300">Always</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ id: banner.id, is_active: !banner.is_active })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${banner.is_active ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${banner.is_active ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(banner)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(banner)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900 text-lg">
                {modal.banner ? "Edit Banner" : "New Banner"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image {!modal.banner && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-start gap-3">
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    {imagePreview ? (
                      <Image src={imagePreview} alt="preview" fill className="object-cover" sizes="128px" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="btn-secondary text-sm text-center">
                      {imagePreview ? "Change Image" : "Upload Image"}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <p className="text-xs text-gray-400 mt-1">Recommended: 1200×400px or wider</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Fresh Fish Sale – 20% Off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  className="input-field"
                  placeholder="Optional tagline or description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                <input
                  value={form.link}
                  onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                  className="input-field"
                  placeholder="/products?category=fish-seafood"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value as Banner["location"] }))}
                    className="input-field"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Size</label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm((p) => ({ ...p, size: e.target.value as Banner["size"] }))}
                    className="input-field"
                  >
                    {SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label} ({s.hint})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => setForm((p) => ({ ...p, starts_at: normaliseDateTimeInput(e.target.value) }))}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, starts_at: nowLocal() }))}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                    >
                      Now
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(e) => setForm((p) => ({ ...p, ends_at: normaliseDateTimeInput(e.target.value) }))}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, ends_at: nowLocal() }))}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                    >
                      Now
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">Active (visible on storefront)</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary" disabled={saveMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 btn-primary disabled:opacity-60">
                  {saveMutation.isPending ? "Saving…" : modal.banner ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Delete Banner</h3>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-1">Are you sure you want to delete:</p>
            <p className="font-semibold text-gray-900 mb-4">"{deleteTarget.title}"</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary" disabled={deleteMutation.isPending}>
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
