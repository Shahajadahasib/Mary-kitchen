import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Delivery Information — Darwin NT Grocery Delivery",
    description:
        "Fast grocery delivery across Darwin NT. We deliver to Winnellie, Palmerston, Casuarina, Nightcliff, Stuart Park and surrounding areas. Same day and next day delivery available.",
    alternates: {
        canonical: "https://marybenskitchen.com/delivery",
    },
};

export default function DeliveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
