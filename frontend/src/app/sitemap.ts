import { MetadataRoute } from "next";
import { SITE_URL, fetchForSeo } from "@/lib/seo";

/**
 * Sitemap covering both storefronts and their full catalogues.
 *
 * Previously this was eight hardcoded URLs, so not one product or dish was
 * discoverable through it. It now enumerates the live catalogue.
 *
 * Every fetch is best-effort: the backend is often unreachable during a build,
 * and a missing catalogue must degrade to the static routes rather than fail
 * the build. `fetchForSeo` already swallows errors and returns null.
 */

type Paginated<T> = { results?: T[]; next?: string | null } | T[];

interface CatalogueEntry {
    slug: string;
    updated_at?: string;
}

/** Walk a paginated list endpoint, with a hard page cap as a safety net. */
async function collectSlugs(
    basePath: string,
    maxPages = 20
): Promise<CatalogueEntry[]> {
    const out: CatalogueEntry[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
        const sep = basePath.includes("?") ? "&" : "?";
        // Uncached: the sitemap must reflect the catalogue as it is now.
        const data = await fetchForSeo<Paginated<CatalogueEntry>>(
            `${basePath}${sep}page=${page}`,
            0
        );
        if (!data) break;

        const rows = Array.isArray(data) ? data : (data.results ?? []);
        out.push(...rows.filter((r) => r?.slug));

        const hasNext = !Array.isArray(data) && Boolean(data.next);
        if (!hasNext || rows.length === 0) break;
    }

    return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
        // Grocery storefront
        { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${SITE_URL}/shop/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${SITE_URL}/shop/products/deals`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
        { url: `${SITE_URL}/shop/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
        { url: `${SITE_URL}/shop/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
        { url: `${SITE_URL}/shop/delivery`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
        { url: `${SITE_URL}/shop/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
        { url: `${SITE_URL}/shop/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
        // Restaurant storefront
        { url: `${SITE_URL}/restaurant`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ];

    const [products, dishes, productCategories, menuCategories] =
        await Promise.all([
            collectSlugs("/products/"),
            collectSlugs("/menu/"),
            collectSlugs("/products/categories/"),
            collectSlugs("/menu/categories/"),
        ]);

    const dated = (value?: string) => (value ? new Date(value) : now);

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
        url: `${SITE_URL}/shop/products/${p.slug}`,
        lastModified: dated(p.updated_at),
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    const dishRoutes: MetadataRoute.Sitemap = dishes.map((d) => ({
        url: `${SITE_URL}/restaurant/${d.slug}`,
        lastModified: dated(d.updated_at),
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    // Category listings are filtered views of the catalogue — useful landing
    // pages for "<category> Darwin" searches, but lower priority than items.
    const productCategoryRoutes: MetadataRoute.Sitemap = productCategories.map(
        (c) => ({
            url: `${SITE_URL}/shop/products?category=${c.slug}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.6,
        })
    );

    const menuCategoryRoutes: MetadataRoute.Sitemap = menuCategories.map((c) => ({
        url: `${SITE_URL}/restaurant?category=${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
    }));

    return [
        ...staticRoutes,
        ...productRoutes,
        ...dishRoutes,
        ...productCategoryRoutes,
        ...menuCategoryRoutes,
    ];
}
