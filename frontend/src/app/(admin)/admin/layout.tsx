"use client";
import AdminOrderNotifications from "@/components/admin/AdminOrderNotifications";
import { useAuthStore } from "@/store/authStore";
import {
    ImageIcon,
    LayoutDashboard,
    LogOut,
    Menu,
    Package,
    Settings,
    ShoppingBag,
    ShoppingCart,
    Tag,
    Truck,
    Users,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Categories", href: "/admin/categories", icon: Tag },
    { label: "Delivery Zones", href: "/admin/delivery", icon: Truck },
    { label: "Banners", href: "/admin/banners", icon: ImageIcon },
    { label: "Store Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, hasHydrated, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!hasHydrated) return;
        if (!isAuthenticated) router.push("/login");
        else if (user && !user.is_staff) router.push("/");
    }, [hasHydrated, isAuthenticated, user?.is_staff]);

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    // Prevent body scroll when sidebar open on mobile
    useEffect(() => {
        if (sidebarOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [sidebarOpen]);

    if (!hasHydrated) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const Sidebar = () => (
        <aside className="w-60 bg-gray-900 text-gray-100 flex flex-col h-full">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold text-lg text-white"
                >
                    <ShoppingBag className="w-6 h-6 text-brand-400" /> Mary
                    Kitchen
                </Link>
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="md:hidden p-1 text-gray-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <p className="text-xs text-gray-400 px-5 py-1.5 border-b border-gray-800">
                Admin Panel
            </p>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                    </Link>
                ))}
            </nav>
            <div className="p-3 border-t border-gray-800">
                <div className="px-3 py-2 mb-2">
                    <p className="text-xs font-medium text-white truncate">
                        {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                        {user?.email}
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </aside>
    );

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden md:flex flex-shrink-0">
                <Sidebar />
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="w-60 flex-shrink-0">
                        <Sidebar />
                    </div>
                    <div
                        className="flex-1 bg-black/50"
                        onClick={() => setSidebarOpen(false)}
                    />
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="font-semibold text-gray-900 text-sm sm:text-base">
                            Admin Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <AdminOrderNotifications />
                        <Link
                            href="/"
                            className="text-xs sm:text-sm text-primary-700 hover:underline whitespace-nowrap"
                        >
                            ← View Store
                        </Link>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
