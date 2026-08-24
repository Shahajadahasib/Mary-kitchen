import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/schema";
import { SITE_URL } from "@/lib/seo";

/**
 * Brand-level defaults only.
 *
 * This layout wraps BOTH storefronts and the hub, so anything grocery-specific
 * belongs in `shop/layout.tsx`, not here. Each segment overrides title,
 * description and canonical; the template below supplies the suffix.
 */
export const metadata: Metadata = {
    title: {
        default: "Mary Ben's Kitchen | Grocery Shop & Restaurant in Darwin NT",
        template: "%s | Mary Ben's Kitchen Darwin",
    },
    description:
        "Mary Ben's Kitchen in Darwin NT — a grocery shop delivering fresh fish, meat and pantry staples, and a restaurant cooking home-style meals for takeaway and delivery.",
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    authors: [{ name: "Mary Ben's Kitchen" }],
    creator: "Mary Ben's Kitchen",
    metadataBase: new URL(SITE_URL),
    openGraph: {
        type: "website",
        locale: "en_AU",
        url: SITE_URL,
        siteName: "Mary Ben's Kitchen",
        images: [
            {
                url: "/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "Mary Ben's Kitchen — Darwin NT",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
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
    alternates: { canonical: SITE_URL },
    verification: {
        google: "ITgkbC6xr62PlRoWNDQcgj3aB0NjwIq1cdLbCKssxyI",
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
                {/* Site-wide only. The GroceryStore schema that used to live
                    here now lives in shop/layout.tsx, and the restaurant has
                    its own Restaurant schema — emitting GroceryStore on a
                    restaurant page told search engines the wrong business. */}
                <JsonLd data={organizationSchema()} />
                <JsonLd data={websiteSchema()} />
            </head>
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
