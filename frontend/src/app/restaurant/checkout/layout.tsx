import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

/** Transactional route — must never appear in search results. */
export const metadata: Metadata = {
    title: "Checkout",
    robots: { index: false, follow: false },
    // Without this it would inherit the storefront root as its canonical.
    alternates: { canonical: canonical("/restaurant/checkout") },
};

export default function SegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
