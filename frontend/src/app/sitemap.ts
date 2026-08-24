import { MetadataRoute } from "next";

const baseUrl = "https://marybenskitchen.com";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    const routes: Array<{
        path: string;
        changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
        priority: number;
    }> = [
        // Hub
        { path: "", changeFrequency: "weekly", priority: 1 },
        // Grocery storefront
        { path: "/shop", changeFrequency: "daily", priority: 0.9 },
        { path: "/shop/products", changeFrequency: "daily", priority: 0.9 },
        { path: "/shop/products/deals", changeFrequency: "daily", priority: 0.8 },
        { path: "/shop/about", changeFrequency: "monthly", priority: 0.7 },
        { path: "/shop/contact", changeFrequency: "monthly", priority: 0.7 },
        { path: "/shop/delivery", changeFrequency: "monthly", priority: 0.6 },
        // Restaurant storefront — menu detail routes land in Phase 4.
        { path: "/restaurant", changeFrequency: "daily", priority: 0.9 },
    ];

    return routes.map(({ path, changeFrequency, priority }) => ({
        url: `${baseUrl}${path}`,
        lastModified,
        changeFrequency,
        priority,
    }));
}
