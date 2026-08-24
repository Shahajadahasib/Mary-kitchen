/**
 * Shared SEO constants and helpers.
 *
 * The site serves two businesses from one domain, so most SEO values are
 * per-storefront rather than global. Keep the canonical origin in one place —
 * three canonicals silently rotted when the grocery shop moved to /shop.
 */

export const SITE_URL = "https://marybenskitchen.com";

/** Build an absolute canonical URL from a site-relative path. */
export function canonical(path = ""): string {
    if (!path || path === "/") return SITE_URL;
    return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The physical premises — both storefronts trade from the same address. */
export const BUSINESS = {
    name: "Mary Ben's Kitchen",
    legalName: "Mary Ben's Kitchen",
    telephone: "+61415365680",
    email: "darwindsfood@gmail.com",
    streetAddress: "8/63 Winnellie Rd",
    addressLocality: "Winnellie",
    addressRegion: "NT",
    postalCode: "0820",
    addressCountry: "AU",
    latitude: -12.4634,
    longitude: 130.8456,
    priceRange: "$$",
    mapsUrl:
        "https://maps.google.com/?q=8/63+Winnellie+Rd+Winnellie+NT+0820",
} as const;

export const OPENING_HOURS = [
    {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
    },
    {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens: "10:00",
        closes: "15:00",
    },
] as const;

/** Suburbs the business delivers to — used for local `areaServed` markup. */
export const SERVICE_AREAS = [
    "Darwin",
    "Winnellie",
    "Palmerston",
    "Casuarina",
    "Nightcliff",
    "Stuart Park",
    "Parap",
    "Coconut Grove",
    "Berrimah",
    "Marrara",
] as const;

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Fetch JSON from the public API for metadata/sitemap generation.
 *
 * Returns null instead of throwing: these run at build time, when the backend
 * may not be reachable, and a missing description must never fail the build.
 */
export async function fetchForSeo<T>(
    path: string,
    revalidateSeconds = 3600
): Promise<T | null> {
    try {
        // revalidateSeconds === 0 means "never serve a cached copy". The sitemap
        // needs this: Next reuses its fetch cache across builds, so a cached
        // empty catalogue from a build where the API was down would otherwise
        // stick around and keep publishing an incomplete sitemap.
        const res = await fetch(`${API_URL}${path}`, {
            ...(revalidateSeconds === 0
                ? { cache: "no-store" as const }
                : { next: { revalidate: revalidateSeconds } }),
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

/** Trim copy to a sensible meta-description length on a word boundary. */
export function metaDescription(
    text: string | null | undefined,
    fallback: string,
    max = 158
): string {
    const clean = (text ?? "").replace(/\s+/g, " ").trim();
    if (!clean) return fallback;
    if (clean.length <= max) return clean;
    return `${clean.slice(0, clean.lastIndexOf(" ", max))}…`;
}
