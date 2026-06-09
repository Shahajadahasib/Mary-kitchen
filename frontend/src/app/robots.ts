import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin/", "/checkout/", "/orders/", "/profile/"],
        },
        sitemap: "https://marybenskitchen.com/sitemap.xml",
    };
}
