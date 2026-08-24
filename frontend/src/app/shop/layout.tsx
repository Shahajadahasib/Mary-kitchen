"use client";
import VisitTracker from "@/components/analytics/VisitTracker";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { useEffect, useState } from "react";

function SessionExpiredToast({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                />
            </svg>
            <div>
                <p className="font-semibold">Session Expired</p>
                <p className="text-sm opacity-90">
                    You have been logged out. Redirecting to home...
                </p>
            </div>
            <button
                onClick={onClose}
                className="ml-2 opacity-70 hover:opacity-100"
            >
                ✕
            </button>
        </div>
    );
}

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [showSessionExpired, setShowSessionExpired] = useState(false);

    useEffect(() => {
        const handleSessionExpired = () => {
            setShowSessionExpired(true);
            setTimeout(() => setShowSessionExpired(false), 3000);
        };
        window.addEventListener("session-expired", handleSessionExpired);
        return () =>
            window.removeEventListener("session-expired", handleSessionExpired);
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <ScrollToTop />
            <VisitTracker />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            {showSessionExpired && (
                <SessionExpiredToast
                    onClose={() => setShowSessionExpired(false)}
                />
            )}
        </div>
    );
}
