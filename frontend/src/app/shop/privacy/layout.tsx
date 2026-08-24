import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "How Mary Ben's Kitchen collects, uses and protects your personal information.",
    alternates: { canonical: canonical("/shop/privacy") },
};

export default function SegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
