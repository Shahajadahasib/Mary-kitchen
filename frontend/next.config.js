/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            { protocol: "http", hostname: "localhost", port: "8000" },
            { protocol: "http", hostname: "127.0.0.1", port: "8000" },
            { protocol: "https", hostname: "marybenskitchen.com" },
            { protocol: "https", hostname: "*.amazonaws.com" },
            { protocol: "https", hostname: "*.s3.amazonaws.com" },
        ],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // The grocery storefront moved from / to /shop when the restaurant was
    // added and the root became a hub page. These redirects cover links that
    // are already out in the world and cannot be rewritten: order-tracking URLs
    // in emails already sent, `action_url` values stored on existing
    // notifications rows, admin-entered banner `link` values, and customer
    // bookmarks. New links are generated correctly by core/frontend_urls.py.
    //
    // Note "/" is deliberately absent — it now serves the hub, not the shop.
    async redirects() {
        const movedSegments = [
            "products",
            "cart",
            "checkout",
            "orders",
            "profile",
            "notifications",
            "about",
            "contact",
            "delivery",
            "privacy",
            "terms",
        ];

        return movedSegments.flatMap((segment) => [
            {
                source: `/${segment}`,
                destination: `/shop/${segment}`,
                permanent: true,
            },
            {
                source: `/${segment}/:path*`,
                destination: `/shop/${segment}/:path*`,
                permanent: true,
            },
        ]);
    },
};

module.exports = nextConfig;
