import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
    title: "About Mary Ben's Kitchen",
    description:
        "Mary Ben's Kitchen is a family-run grocery shop and restaurant in Winnellie, serving Darwin NT with fresh produce and home-style cooked meals.",
    alternates: { canonical: canonical("/shop/about") },
};

export default function SegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
