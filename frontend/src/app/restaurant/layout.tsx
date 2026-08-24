import type { Metadata } from "next";
import RestaurantShell from "@/components/layout/RestaurantShell";

/**
 * Server layout for the restaurant storefront — exists to own the segment's
 * metadata. The chrome itself needs hooks (auth state, StoreProfile), so it
 * lives in the client `RestaurantShell`.
 */
export const metadata: Metadata = {
    title: {
        default: "Mary Ben's Kitchen Restaurant | Takeaway & Delivery Darwin NT",
        template: "%s | Mary Ben's Kitchen Restaurant",
    },
    description:
        "Home-style cooked meals from Mary Ben's Kitchen Restaurant in Darwin NT. Order online for takeaway or delivery.",
    alternates: {
        canonical: "https://marybenskitchen.com/restaurant",
    },
    openGraph: {
        type: "website",
        locale: "en_AU",
        url: "https://marybenskitchen.com/restaurant",
        siteName: "Mary Ben's Kitchen Restaurant",
        title: "Mary Ben's Kitchen Restaurant | Darwin NT",
        description:
            "Home-style cooked meals for takeaway or delivery across Darwin NT.",
    },
};

export default function RestaurantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RestaurantShell>{children}</RestaurantShell>;
}
