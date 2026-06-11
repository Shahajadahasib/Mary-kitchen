import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Delivery Information",
    description:
        "Darwin-wide grocery delivery from Marybens Kitchen. Fast same-day and next-day delivery across Darwin NT.",
};

export default function DeliveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
