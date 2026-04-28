/**
 * Modal for adding or editing a saved delivery address.
 * IMPORTANT: The modal panel must NOT use overflow-hidden — it would clip
 * the Google Places .pac-container dropdown which is appended to <body>.
 */
"use client";
import { useState, useEffect, useRef } from "react";
import { X, Loader2, MapPin, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import AddressAutocomplete from "./AddressAutocomplete";
import type { ParsedAddress } from "@/hooks/useGooglePlaces";

interface AddressFormData {
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  latitude: string;
  longitude: string;
  is_default: boolean;
}

const EMPTY: AddressFormData = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  suburb: "",
  state: "NT",
  postcode: "",
  country: "Australia",
  latitude: "",
  longitude: "",
  is_default: false,
};

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const AU_POSTCODE_RANGES: Record<string, [number, number][]> = {
  ACT: [[200, 299], [2600, 2618], [2900, 2920]],
  NSW: [[1000, 2599], [2619, 2899], [2921, 2999]],
  NT:  [[800, 999]],
  QLD: [[4000, 4999], [9000, 9999]],
  SA:  [[5000, 5999]],
  TAS: [[7000, 7999]],
  VIC: [[3000, 3999], [8000, 8999]],
  WA:  [[6000, 6999]],
};

function validatePostcodeState(postcode: string, state: string): string | null {
  const pc = parseInt(postcode, 10);
  if (isNaN(pc)) return "Invalid postcode";
  const ranges = AU_POSTCODE_RANGES[state];
  if (!ranges) return null;
  const valid = ranges.some(([lo, hi]) => pc >= lo && pc <= hi);
  if (!valid) return `Postcode ${postcode} doesn't match state ${state}`;
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<AddressFormData> & { id?: string };
}

export default function AddressFormModal({ open, onClose, onSaved, initial }: Props) {
  const [form, setForm] = useState<AddressFormData>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [autofilled, setAutofilled] = useState(false);

  // Reset all state when the modal opens.
  // The component stays mounted (returns null when closed), so useState
  // initialisers only run once. We must reset explicitly on re-open.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const next = { ...EMPTY, ...initial };
      setForm(next);
      setErrors({});
      setAutofilled(false);
    }
    prevOpenRef.current = open;
  }, [open, initial]);

  const set = (field: keyof AddressFormData, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  // Called when user clicks an address suggestion.
  const handlePlaceSelect = (parsed: ParsedAddress, _formatted: string) => {
    setForm((prev) => ({
      ...prev,
      address_line1: parsed.address_line1 || prev.address_line1,
      suburb:        parsed.suburb        || prev.suburb,
      state:         parsed.state         || prev.state,
      postcode:      parsed.postcode      || prev.postcode,
      country:       parsed.country       || "Australia",
      latitude:      parsed.latitude  != null ? String(parsed.latitude)  : prev.latitude,
      longitude:     parsed.longitude != null ? String(parsed.longitude) : prev.longitude,
    }));
    setErrors({});
    setAutofilled(true);
    setTimeout(() => setAutofilled(false), 5000);
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.full_name.trim()) e.full_name = "Required";
    if (!form.address_line1.trim()) e.address_line1 = "Required";
    if (!form.suburb.trim()) e.suburb = "Required";
    if (!form.state) e.state = "Required";
    if (!form.postcode.trim()) e.postcode = "Required";
    if (form.country.trim().toLowerCase() !== "australia") e.country = "Only Australian addresses are allowed";
    const pcErr = validatePostcodeState(form.postcode, form.state);
    if (pcErr) e.postcode = pcErr;
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fill in all required fields");
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Nominatim returns 7+ decimal places; backend DecimalField allows max 6.
        latitude: form.latitude ? parseFloat(parseFloat(form.latitude).toFixed(6)) : null,
        longitude: form.longitude ? parseFloat(parseFloat(form.longitude).toFixed(6)) : null,
      };
      if (initial?.id) {
        await api.patch(`/users/addresses/${initial.id}/`, payload);
        toast.success("Address updated");
      } else {
        await api.post("/users/addresses/", payload);
        toast.success("Address saved");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;

      // The backend uses a custom exception handler that returns:
      // { success: false, status_code: 400, message: "...", errors: [{field, message}] }
      if (data?.errors && Array.isArray(data.errors)) {
        const mapped: typeof errors = {};
        data.errors.forEach(({ field, message }: { field: string; message: string }) => {
          mapped[field as keyof AddressFormData] = message;
        });
        setErrors(mapped);
        toast.error(data.message || "Please fix the errors below");
      } else if (data?.message) {
        toast.error(data.message);
      } else {
        toast.error("Failed to save address. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/*
        Panel — deliberately NO overflow-hidden here!
        overflow-hidden clips the Google Places .pac-container dropdown
        which is appended directly to <body> at a fixed position.
        The scrollable area is only the inner body div.
      */}
      <div className="relative z-10 bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">
              {initial?.id ? "Edit Address" : "Add Delivery Address"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-5 space-y-4 flex-1">

          {/* ── Address search ── */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Search Address
              <span className="ml-1 text-gray-400 font-normal">(Australia only)</span>
            </label>
            <AddressAutocomplete
              initialValue={initial?.address_line1 ?? ""}
              onSelect={handlePlaceSelect}
              placeholder="e.g. 42 Styles Street Darwin"
            />
            {autofilled && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-600 animate-pulse">
                <CheckCircle className="w-3.5 h-3.5" />
                Fields filled automatically — review and confirm below.
              </div>
            )}
          </div>

          {/* ── Label & Name ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
              <select
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                className="input-field text-sm py-2"
              >
                {["Home", "Work", "Partner's Place", "Other"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Jane Smith"
                className={`input-field text-sm py-2 ${errors.full_name ? "border-red-400" : ""}`}
              />
              {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name}</p>}
            </div>
          </div>

          {/* ── Phone ── */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              type="tel"
              placeholder="04XX XXX XXX"
              className={`input-field text-sm py-2 ${errors.phone ? "border-red-400" : ""}`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
          </div>

          {/* ── Street address (auto-filled, editable) ── */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Street Address *
              <span className="ml-1 text-gray-400 font-normal text-[10px]">auto-filled from search above</span>
            </label>
            <input
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
              placeholder="123 Main St"
              className={`input-field text-sm py-2 ${errors.address_line1 ? "border-red-400" : ""}`}
            />
            {errors.address_line1 && <p className="text-xs text-red-500 mt-0.5">{errors.address_line1}</p>}
          </div>

          {/* ── Unit / Apt ── */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Unit / Apt / Suite</label>
            <input
              value={form.address_line2}
              onChange={(e) => set("address_line2", e.target.value)}
              placeholder="Unit 4"
              className="input-field text-sm py-2"
            />
          </div>

          {/* ── State + Suburb ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
              <select
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={`input-field text-sm py-2 ${errors.state ? "border-red-400" : ""}`}
              >
                {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p className="text-xs text-red-500 mt-0.5">{errors.state}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Suburb *</label>
              <input
                value={form.suburb}
                onChange={(e) => set("suburb", e.target.value)}
                placeholder="Darwin"
                className={`input-field text-sm py-2 ${errors.suburb ? "border-red-400" : ""}`}
              />
              {errors.suburb && <p className="text-xs text-red-500 mt-0.5">{errors.suburb}</p>}
            </div>
          </div>

          {/* ── Postcode + Country ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Postcode *</label>
              <input
                value={form.postcode}
                onChange={(e) => set("postcode", e.target.value)}
                placeholder="0800"
                maxLength={4}
                className={`input-field text-sm py-2 ${errors.postcode ? "border-red-400" : ""}`}
              />
              {errors.postcode && <p className="text-xs text-red-500 mt-0.5">{errors.postcode}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country *</label>
              <input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={`input-field text-sm py-2 bg-gray-50 ${errors.country ? "border-red-400" : ""}`}
              />
              {errors.country && <p className="text-xs text-red-500 mt-0.5">{errors.country}</p>}
            </div>
          </div>

          {/* ── Default toggle ── */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => set("is_default", !form.is_default)}
          >
            <div
              className={`w-10 rounded-full relative transition-colors flex-shrink-0 ${
                form.is_default ? "bg-primary-600" : "bg-gray-300"
              }`}
              style={{ height: "22px" }}
            >
              <span
                className={`absolute top-[2px] rounded-full bg-white shadow transition-transform`}
                style={{
                  width: "18px",
                  height: "18px",
                  left: "2px",
                  transform: form.is_default ? "translateX(18px)" : "translateX(0)",
                }}
              />
            </div>
            <span className="text-sm text-gray-700">Set as default address</span>
          </div>

          {/* ── Location verified ── */}
          {form.latitude && form.longitude && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              GPS verified: {parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary text-sm py-2.5">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "Saving…" : initial?.id ? "Update Address" : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );
}
