import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact Us — Marybens Kitchen Darwin",
    description:
        "Contact Marybens Kitchen Darwin. Visit us at 8/63 Winnellie Rd, Winnellie NT 0820 or call 0449 529 923. Fresh grocery delivery across Darwin NT Australia.",
    alternates: {
        canonical: "https://marybenskitchen.com/contact",
    },
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
