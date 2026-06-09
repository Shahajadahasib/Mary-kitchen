import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
    title: {
        default: "Marybens Kitchen | Fresh Groceries Delivered in Darwin NT",
        template: "%s | Marybens Kitchen Darwin",
    },
    description:
        "Darwin's local grocery & food marketplace. Fresh fish, meats, vegetables, rice and more delivered to your door in Darwin NT, Australia.",
    keywords: [
        "grocery delivery Darwin",
        "fresh fish Darwin NT",
        "Darwin grocery store",
        "food delivery Darwin",
        "Winnellie grocery",
        "African food Darwin",
        "fresh meat Darwin",
        "online grocery Darwin Australia",
        "Marybens Kitchen",
    ],
    authors: [{ name: "Marybens Kitchen" }],
    creator: "Marybens Kitchen",
    metadataBase: new URL("https://marybenskitchen.com"),
    openGraph: {
        type: "website",
        locale: "en_AU",
        url: "https://marybenskitchen.com",
        siteName: "Marybens Kitchen",
        title: "Mary Ben's Kitchen | Fresh Groceries Delivered in Darwin NT",
        description:
            "Darwin's local grocery & food marketplace. Fresh fish, meats, vegetables, rice and more delivered to your door.",
        images: [
            {
                url: "/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "Marybens Kitchen — Fresh Groceries Darwin NT",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Marybens Kitchen | Fresh Groceries Darwin NT",
        description:
            "Fresh fish, meats, vegetables and more delivered in Darwin NT Australia.",
        images: ["/og-image.jpg"],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
    alternates: {
        canonical: "https://marybenskitchen.com",
    },
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en-AU">
            <body className={inter.className}>
                <Providers>{children}</Providers>

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "GroceryStore",
                            name: "Marybens Kitchen",
                            description:
                                "Darwin's local grocery & food marketplace",
                            url: "https://marybenskitchen.com",
                            telephone: "+61449529923",
                            email: "hello@marykitchen.com.au",
                            address: {
                                "@type": "PostalAddress",
                                streetAddress: "8/63 Winnellie Rd",
                                addressLocality: "Winnellie",
                                addressRegion: "NT",
                                postalCode: "0820",
                                addressCountry: "AU",
                            },
                            geo: {
                                "@type": "GeoCoordinates",
                                latitude: -12.4634,
                                longitude: 130.8456,
                            },
                            openingHours: "Mo-Fr 09:00-17:00",
                            servesCuisine: [
                                "Groceries",
                                "Fresh Fish",
                                "Meat",
                                "Vegetables",
                            ],
                            priceRange: "$$",
                            areaServed: {
                                "@type": "City",
                                name: "Darwin",
                            },
                        }),
                    }}
                />
            </body>
        </html>
    );
}
