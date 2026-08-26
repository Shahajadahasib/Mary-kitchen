"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authHref } from "@/lib/authRedirect";
import { useAuthStore } from "@/store/authStore";

/**
 * Guard a customer-facing page that only makes sense when signed in.
 *
 * Without this, a signed-out visitor opening a bookmarked or emailed
 * order-history URL fires the API call anyway, gets a 401, and the axios
 * interceptor in `lib/api.ts` treats it as an expired session — clearing
 * cookies and showing "your session expired" to someone who never had one.
 * Sending them to the login page with a `next` back to where they were asking
 * for is both truthful and useful.
 *
 * Returns `ready`, which is what the caller should gate its queries on: it is
 * false until the persisted auth store has rehydrated, so a signed-in user's
 * request is never fired before the token is known and never redirected on the
 * strength of a not-yet-loaded session.
 */
export function useRequireAuth(): { ready: boolean } {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, hasHydrated } = useAuthStore();

    useEffect(() => {
        if (hasHydrated && !isAuthenticated) {
            router.replace(authHref("/login", pathname));
        }
    }, [hasHydrated, isAuthenticated, pathname, router]);

    return { ready: hasHydrated && isAuthenticated };
}
