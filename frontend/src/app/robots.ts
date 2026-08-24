import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/admin/",
                // Grocery storefront — private/transactional routes.
                "/shop/checkout/",
                "/shop/orders/",
                "/shop/profile/",
                "/shop/notifications/",
                "/shop/cart/",
                // Restaurant storefront — same shape, filled in by Phase 4.
                "/restaurant/checkout/",
                "/restaurant/orders/",
                "/restaurant/cart/",
            ],
        },
        sitemap: "https://marybenskitchen.com/sitemap.xml",
    };
}
