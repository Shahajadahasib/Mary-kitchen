import type { Metadata } from "next";
import ShopShell from "@/components/layout/ShopShell";
import JsonLd from "@/components/seo/JsonLd";
import { grocerySchema } from "@/lib/schema";
import { canonical } from "@/lib/seo";

/**
 * Server layout for the grocery storefront — owns the segment's metadata and
 * the `GroceryStore` structured data that used to sit in the root layout (and
 * therefore leaked onto restaurant pages). The chrome itself needs hooks, so it
 * lives in the client `ShopShell`.
 */
export const metadata: Metadata = {
    title: {
        // `absolute` so the root layout's "| Mary Ben's Kitchen Darwin" suffix
        // is not appended to a title that already carries the brand.
        absolute: "Fresh Groceries Delivered in Darwin NT | Mary Ben's Kitchen",
        template: "%s | Mary Ben's Kitchen Grocery",
    },
    description:
        "Order fresh fish, seafood, meat, vegetables, rice and African grocery staples online. Same-day and next-day delivery across Darwin NT, Palmerston, Casuarina and Nightcliff.",
    keywords: [
        "grocery delivery Darwin",
        "grocery delivery Darwin NT",
        "online grocery Darwin",
        "Darwin grocery store",
        "fresh fish Darwin",
        "fresh fish delivery Darwin",
        "fresh meat Darwin NT",
        "vegetables Darwin",
        "African food Darwin",
        "African grocery Darwin NT",
        "rice delivery Darwin",
        "seafood Darwin NT",
        "grocery delivery Winnellie",
        "grocery delivery Palmerston",
        "grocery delivery Casuarina",
        "grocery delivery Nightcliff",
        "grocery delivery Stuart Park",
        "same day grocery delivery Darwin",
        "Marybens Kitchen",
        "Mary Bens Kitchen Darwin",
    ],
    alternates: { canonical: canonical("/shop") },
    openGraph: {
        type: "website",
        url: canonical("/shop"),
        siteName: "Mary Ben's Kitchen",
        title: "Grocery Shop | Fresh Groceries Delivered in Darwin NT",
        description:
            "Fresh fish, meat, vegetables and pantry staples delivered across Darwin NT.",
    },
    category: "grocery",
};

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <JsonLd data={grocerySchema()} />
            <ShopShell>{children}</ShopShell>
        </>
    );
}
