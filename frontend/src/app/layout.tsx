import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
    title: {
        default: "Mary Ben's Kitchen | Fresh Groceries Delivered in Darwin NT",
        template: "%s | Mary Ben's Kitchen Darwin",
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    description:
        "Darwin's local grocery & food marketplace. Fresh fish, meats, vegetables, rice and more delivered to your door in Darwin NT, Australia.",
    keywords: [
        // Primary Darwin keywords
        "grocery delivery Darwin",
        "grocery delivery Darwin NT",
        "food delivery Darwin NT",
        "online grocery Darwin",
        "Darwin grocery store",
        "Darwin NT grocery",
        // Product keywords
        "fresh fish Darwin",
        "fresh fish delivery Darwin",
        "fresh meat Darwin NT",
        "vegetables Darwin",
        "African food Darwin",
        "African grocery Darwin NT",
        "rice delivery Darwin",
        "seafood Darwin NT",
        // Suburb keywords
        "grocery delivery Winnellie",
        "grocery delivery Palmerston",
        "grocery delivery Casuarina",
        "grocery delivery Nightcliff",
        "grocery delivery Stuart Park",
        // Store name
        "Marybens Kitchen",
        "Mary Bens Kitchen Darwin",
        "Mary Kitchen Darwin",
        // Long tail
        "fresh food delivery Darwin Australia",
        "same day grocery delivery Darwin",
        "next day delivery Darwin NT",
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
        google: "ITgkbC6xr62PlRoWNDQcgj3aB0NjwIq1cdLbCKssxyI",
    },
    category: "grocery",
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
                            telephone: "+61415365680",
                            email: "darwindsfood@gmail.com",
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
                                "Seafood",
                                "Meat",
                                "Vegetables",
                                "Rice",
                                "Grains",
                                "African Food",
                            ],
                            priceRange: "$$",
                            areaServed: {
                                "@type": "City",
                                name: "Darwin",
                                containedIn: "Northern Territory, Australia",
                            },
                            hasMap: "https://maps.google.com/?q=8/63+Winnellie+Rd+Winnellie+NT+0820",
                            offers: {
                                "@type": "Offer",
                                description:
                                    "Fresh grocery delivery across Darwin NT",
                                areaServed:
                                    "Darwin, Northern Territory, Australia",
                            },
                        }),
                    }}
                />

                {/* Delivery Service Schema */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "DeliveryEvent",
                            name: "Grocery Delivery Darwin NT",
                            description:
                                "Same day and next day grocery delivery across Darwin NT",
                            location: {
                                "@type": "Place",
                                address: {
                                    "@type": "PostalAddress",
                                    addressLocality: "Darwin",
                                    addressRegion: "NT",
                                    addressCountry: "AU",
                                },
                            },
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
