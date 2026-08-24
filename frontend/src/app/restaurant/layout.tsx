import type { Metadata } from "next";
import RestaurantShell from "@/components/layout/RestaurantShell";
import JsonLd from "@/components/seo/JsonLd";
import { restaurantSchema } from "@/lib/schema";
import { canonical } from "@/lib/seo";

/**
 * Server layout for the restaurant storefront — owns the segment's metadata and
 * its `Restaurant` structured data. Before this, every restaurant page inherited
 * the root layout's `GroceryStore` schema and grocery keywords, so the
 * restaurant was invisible as a restaurant to search engines.
 */
export const metadata: Metadata = {
    title: {
        absolute:
            "Mary Ben's Kitchen Restaurant | Takeaway & Delivery Darwin NT",
        template: "%s | Mary Ben's Kitchen Restaurant",
    },
    description:
        "Home-style cooked meals made to order in Darwin NT. Order online for takeaway from Winnellie or delivery across Darwin, Palmerston and the northern suburbs.",
    keywords: [
        "restaurant Darwin NT",
        "takeaway Darwin",
        "food delivery Darwin NT",
        "African restaurant Darwin",
        "African food Darwin",
        "home style meals Darwin",
        "order food online Darwin",
        "takeaway Winnellie",
        "food delivery Palmerston",
        "food delivery Casuarina",
        "food delivery Nightcliff",
        "halal food Darwin",
        "vegetarian food Darwin NT",
        "Mary Bens Kitchen Restaurant",
    ],
    alternates: { canonical: canonical("/restaurant") },
    openGraph: {
        type: "website",
        locale: "en_AU",
        url: canonical("/restaurant"),
        siteName: "Mary Ben's Kitchen Restaurant",
        title: "Mary Ben's Kitchen Restaurant | Darwin NT",
        description:
            "Home-style cooked meals for takeaway or delivery across Darwin NT.",
    },
    category: "restaurant",
};

export default function RestaurantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <JsonLd data={restaurantSchema()} />
            <RestaurantShell>{children}</RestaurantShell>
        </>
    );
}
