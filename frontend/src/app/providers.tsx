"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/authStore";

/**
 * Runs once on app mount. If there's a token cookie, always re-validate
 * the session via fetchProfile so we get fresh user data (including is_staff).
 * This handles the case where the page is reloaded after a long session.
 */
function AuthInitializer() {
  const { isAuthenticated, fetchProfile } = useAuthStore();
  useEffect(() => {
    const hasToken = !!Cookies.get("access_token") || !!Cookies.get("refresh_token");
    if (isAuthenticated || hasToken) {
      fetchProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: "#1f2937", color: "#fff", fontSize: "14px" },
          success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
    </QueryClientProvider>
  );
}
