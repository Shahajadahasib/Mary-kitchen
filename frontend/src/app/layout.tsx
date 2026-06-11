import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
    title: {
        default: "Mary Ben's Kitchen | Fresh Groceries Delivered in Darwin NT",
        template: "%s | Mary Ben's Kitchen Darwin",
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
        "grocery Darwin NT",
    ],
    authors: [{ name: "Mary Ben's Kitchen" }],
    creator: "Mary Ben's Kitchen",
    metadataBase: new URL("https://marybenskitchen.com"),
    openGraph: {
        type: "website",
        locale: "en_AU",
        url: "https://marybenskitchen.com",
        siteName: "Mary Ben's Kitchen",
        title: "Mary Ben's Kitchen | Fresh Groceries Delivered in Darwin NT",
        description:
            "Darwin's local grocery & food marketplace. Fresh fish, meats, vegetables, rice and more delivered to your door.",
        images: [
            {
                url: "/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "Mary Ben's Kitchen — Fresh Groceries Darwin NT",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Mary Ben's Kitchen | Fresh Groceries Darwin NT",
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
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    alternates: {
        canonical: "https://marybenskitchen.com",
    },
    verification: {
        google: "lwQKYR1HIHSiQ0P5G6tp489wO-I4lENYaKEtjBcm_-o",
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
            <head>
                {/* Local Business Structured Data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "GroceryStore",
                            name: "Marybens Kitchen",
                            description:
                                "Darwin's local grocery & food marketplace. Fresh fish, meats, vegetables and more.",
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
                            openingHoursSpecification: [
                                {
                                    "@type": "OpeningHoursSpecification",
                                    dayOfWeek: [
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                    ],
                                    opens: "09:00",
                                    closes: "17:00",
                                },
                                {
                                    "@type": "OpeningHoursSpecification",
                                    dayOfWeek: ["Saturday"],
                                    opens: "10:00",
                                    closes: "15:00",
                                },
                            ],
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
                            hasMap: "https://maps.google.com/?q=8/63+Winnellie+Rd+Winnellie+NT+0820",
                        }),
                    }}
                />
            </head>
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
