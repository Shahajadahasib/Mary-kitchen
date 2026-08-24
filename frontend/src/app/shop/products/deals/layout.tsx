import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Weekly Grocery Deals in Darwin NT",
    description:
        "This week's discounted fresh fish, meat, vegetables and pantry staples at Mary Ben's Kitchen. Delivered across Darwin NT.",
    alternates: { canonical: canonical("/shop/products/deals") },
};

export default function SegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
