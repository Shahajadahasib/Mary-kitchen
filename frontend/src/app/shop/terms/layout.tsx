import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Terms of Service",
    description:
        "The terms that apply when you order from Mary Ben's Kitchen in Darwin NT.",
    alternates: { canonical: canonical("/shop/terms") },
};

export default function SegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
