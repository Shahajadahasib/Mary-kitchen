import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

/** Transactional route — must never appear in search results. */
export const metadata: Metadata = {
    title: "Your Order",
    robots: { index: false, follow: false },
    // Without this it would inherit the storefront root as its canonical.
    alternates: { canonical: canonical("/restaurant/cart") },
};

export default function SegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
