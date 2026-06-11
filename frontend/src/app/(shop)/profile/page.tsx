"use client";
import AddressFormModal from "@/components/ui/AddressFormModal";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Check,
    Edit,
    Heart,
    MapPin,
    Package,
    Plus,
    Star,
    Trash2,
    User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const TABS = ["Profile", "Addresses", "Wishlist", "Orders"];

export default function ProfilePage() {
    const { user, fetchProfile } = useAuthStore();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState("Profile");
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        first_name: "",
        last_name: "",
        phone_number: "",
    });
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<any>(null);

    useEffect(() => {
        if (user)
            setProfileForm({
                first_name: user.first_name,
                last_name: user.last_name,
                phone_number: user.phone_number,
            });
    }, [user]);

    const { data: addresses } = useQuery({
        queryKey: ["addresses"],
        queryFn: () => api.get("/users/addresses/").then((r) => r.data),
        enabled: activeTab === "Addresses",
    });

    const { data: wishlist } = useQuery({
        queryKey: ["wishlist"],
        queryFn: () => api.get("/users/wishlist/").then((r) => r.data),
        enabled: activeTab === "Wishlist",
    });

    const handleSaveProfile = async () => {
        if (!profileForm.phone_number || !profileForm.phone_number.trim()) {
            toast.error("Phone number is required");
            return;
        }
        if (profileForm.phone_number.trim().length < 8) {
            toast.error("Please enter a valid phone number");
            return;
        }
        try {
            await api.patch("/users/profile/", profileForm);
            await fetchProfile();
            setEditingProfile(false);
            toast.success("Profile updated!");
        } catch (err: any) {
            const msg =
                err?.response?.data?.phone_number?.[0] ||
                err?.response?.data?.message ||
                "Failed to update profile";
            toast.error(msg);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm("Delete this address?")) return;
        try {
            await api.delete(`/users/addresses/${id}/`);
            qc.invalidateQueries({ queryKey: ["addresses"] });
            toast.success("Address deleted");
        } catch {}
    };

    const handleSetDefault = async (id: string) => {
        try {
            await api.post(`/users/addresses/${id}/set_default/`);
            qc.invalidateQueries({ queryKey: ["addresses"] });
            toast.success("Default address updated");
        } catch {}
    };

    if (!user)
        return (
            <div className="container-xl py-20 text-center">
                <Link href="/login" className="btn-primary">
                    Please Login
                </Link>
            </div>
        );

    return (
        <div className="container-xl px-4 py-6 md:py-8">
            <h1 className="section-title mb-6">My Account</h1>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto w-full sm:w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                            activeTab === tab
                                ? "bg-white text-primary-700 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === "Profile" && (
                <div className="w-full max-w-lg card p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />{" "}
                            Profile Info
                        </h2>
                        <button
                            onClick={() => setEditingProfile(!editingProfile)}
                            className="btn-secondary text-sm py-1.5 px-4 flex items-center gap-1"
                        >
                            <Edit className="w-3.5 h-3.5" />{" "}
                            {editingProfile ? "Cancel" : "Edit"}
                        </button>
                    </div>
                    {editingProfile ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        value={profileForm.first_name}
                                        onChange={(e) =>
                                            setProfileForm({
                                                ...profileForm,
                                                first_name: e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        value={profileForm.last_name}
                                        onChange={(e) =>
                                            setProfileForm({
                                                ...profileForm,
                                                last_name: e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    value={profileForm.phone_number}
                                    onChange={(e) =>
                                        setProfileForm({
                                            ...profileForm,
                                            phone_number: e.target.value,
                                        })
                                    }
                                    className={`input-field ${!profileForm.phone_number?.trim() ? "border-red-300" : ""}`}
                                    placeholder="+61 4XX XXX XXX"
                                />
                                {!profileForm.phone_number?.trim() && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Phone number is required
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    ) : (
                        <dl className="space-y-3 text-sm">
                            {[
                                { label: "Full Name", value: user.full_name },
                                { label: "Email", value: user.email },
                                {
                                    label: "Phone",
                                    value: user.phone_number ? (
                                        user.phone_number
                                    ) : (
                                        <span className="text-red-500 text-xs">
                                            Not provided — please update
                                        </span>
                                    ),
                                },
                                {
                                    label: "Email Verified",
                                    value: user.is_email_verified
                                        ? "✓ Verified"
                                        : "Not verified",
                                },
                            ].map(({ label, value }) => (
                                <div
                                    key={label}
                                    className="flex flex-col sm:flex-row sm:items-center"
                                >
                                    <dt className="text-gray-500 text-xs sm:text-sm sm:w-32 flex-shrink-0 mb-0.5 sm:mb-0">
                                        {label}
                                    </dt>
                                    <dd className="font-medium text-gray-900 text-sm">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>
            )}

            {/* Addresses Tab */}
            {activeTab === "Addresses" && (
                <div className="max-w-2xl">
                    <div className="grid gap-4">
                        {(addresses?.results ?? addresses ?? []).map(
                            (addr: any) => (
                                <div key={addr.id} className="card p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-gray-900">
                                                        {addr.label}
                                                    </span>
                                                    {addr.is_default && (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-200">
                                                            <Star className="w-3 h-3 fill-current" />{" "}
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-700">
                                                    {addr.full_name}
                                                    {addr.phone}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {addr.address_line1}
                                                    {addr.address_line2 &&
                                                        `, ${addr.address_line2}`}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {addr.suburb} {addr.state}{" "}
                                                    {addr.postcode}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                            {!addr.is_default && (
                                                <button
                                                    onClick={() =>
                                                        handleSetDefault(
                                                            addr.id,
                                                        )
                                                    }
                                                    className="text-xs text-primary-700 hover:underline"
                                                >
                                                    Set Default
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingAddress(addr);
                                                    setAddressModalOpen(true);
                                                }}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDeleteAddress(addr.id)
                                                }
                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ),
                        )}

                        {/* Add New Address button */}
                        <button
                            onClick={() => {
                                setEditingAddress(null);
                                setAddressModalOpen(true);
                            }}
                            className="card p-5 border-dashed flex items-center justify-center gap-2 text-sm text-primary-700 hover:bg-primary-50 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add New Address
                        </button>
                    </div>
                </div>
            )}

            {/* Address modal (shared between add and edit) */}
            <AddressFormModal
                open={addressModalOpen}
                onClose={() => {
                    setAddressModalOpen(false);
                    setEditingAddress(null);
                }}
                onSaved={() =>
                    qc.invalidateQueries({ queryKey: ["addresses"] })
                }
                initial={editingAddress ?? undefined}
            />

            {/* Wishlist Tab */}
            {activeTab === "Wishlist" && (
                <div>
                    {wishlist?.items?.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Heart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>Your wishlist is empty</p>
                            <Link
                                href="/products"
                                className="btn-primary inline-flex mt-4 text-sm"
                            >
                                Browse Products
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {wishlist?.items?.map((item: any) => (
                                <Link
                                    key={item.id}
                                    href={`/products/${item.product_slug}`}
                                    className="card p-4 hover:shadow-md"
                                >
                                    <p className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                                        {item.product_name}
                                    </p>
                                    <p className="text-primary-700 font-bold text-sm">
                                        ${item.product_price}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Orders Tab */}
            {activeTab === "Orders" && (
                <div className="text-center py-6">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 mb-4">
                        View your complete order history
                    </p>
                    <Link href="/orders" className="btn-primary inline-flex">
                        Go to Orders
                    </Link>
                </div>
            )}
        </div>
    );
}
