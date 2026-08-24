/**
 * schema.org payload builders.
 *
 * Split per storefront: the root previously emitted a `GroceryStore` block on
 * every page, so restaurant pages told search engines they were a grocery shop.
 * Each business now describes itself, and the root carries only what is true of
 * both.
 */
import {
    BUSINESS,
    OPENING_HOURS,
    SERVICE_AREAS,
    SITE_URL,
    canonical,
} from "./seo";

const postalAddress = {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.addressLocality,
    addressRegion: BUSINESS.addressRegion,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.addressCountry,
};

const geo = {
    "@type": "GeoCoordinates",
    latitude: BUSINESS.latitude,
    longitude: BUSINESS.longitude,
};

const areaServed = SERVICE_AREAS.map((name) => ({
    "@type": "City",
    name,
    containedInPlace: {
        "@type": "State",
        name: "Northern Territory",
    },
}));

/** True of the whole site — safe to emit on every page. */
export function organizationSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BUSINESS.name,
        legalName: BUSINESS.legalName,
        url: SITE_URL,
        telephone: BUSINESS.telephone,
        email: BUSINESS.email,
        address: postalAddress,
        logo: `${SITE_URL}/android-chrome-512x512.png`,
        areaServed,
    };
}

/** Enables the sitelinks search box for the grocery catalogue. */
export function websiteSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: BUSINESS.name,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE_URL}/shop/products?search={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };
}

/** The grocery storefront. Was previously emitted site-wide. */
export function grocerySchema() {
    return {
        "@context": "https://schema.org",
        "@type": "GroceryStore",
        "@id": `${SITE_URL}/shop#grocerystore`,
        name: `${BUSINESS.name} — Grocery Shop`,
        description:
            "Darwin's local grocery and food marketplace. Fresh fish, seafood, meats, vegetables, rice and African grocery staples delivered across Darwin NT.",
        url: canonical("/shop"),
        telephone: BUSINESS.telephone,
        email: BUSINESS.email,
        address: postalAddress,
        geo,
        openingHoursSpecification: OPENING_HOURS,
        priceRange: BUSINESS.priceRange,
        currenciesAccepted: "AUD",
        paymentAccepted: "Credit Card, Debit Card",
        hasMap: BUSINESS.mapsUrl,
        areaServed,
        parentOrganization: { "@id": `${SITE_URL}/#organization` },
        makesOffer: {
            "@type": "Offer",
            description: "Fresh grocery delivery across Darwin NT",
            areaServed: "Darwin, Northern Territory, Australia",
        },
    };
}

/** The restaurant storefront. v1 is takeaway + delivery only — no dine-in. */
export function restaurantSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "@id": `${SITE_URL}/restaurant#restaurant`,
        name: `${BUSINESS.name} Restaurant`,
        description:
            "Home-style cooked meals made to order in Darwin NT. Order online for takeaway from Winnellie or delivery across Darwin.",
        url: canonical("/restaurant"),
        telephone: BUSINESS.telephone,
        email: BUSINESS.email,
        address: postalAddress,
        geo,
        openingHoursSpecification: OPENING_HOURS,
        priceRange: BUSINESS.priceRange,
        currenciesAccepted: "AUD",
        paymentAccepted: "Credit Card, Debit Card",
        servesCuisine: ["African", "Home-style", "Seafood"],
        hasMenu: canonical("/restaurant"),
        hasMap: BUSINESS.mapsUrl,
        areaServed,
        parentOrganization: { "@id": `${SITE_URL}/#organization` },
        // v1 ordering is takeaway + delivery; dine-in was deliberately deferred.
        acceptsReservations: false,
        hasDeliveryMethod: [
            "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
            "http://purl.org/goodrelations/v1#DeliveryModePickUp",
        ],
    };
}

export interface BreadcrumbEntry {
    name: string;
    path: string;
}

export function breadcrumbSchema(entries: BreadcrumbEntry[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: entries.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: e.name,
            item: canonical(e.path),
        })),
    };
}

export function productSchema({
    name,
    description,
    image,
    price,
    slug,
    inStock,
    ratingValue,
    reviewCount,
}: {
    name: string;
    description: string;
    image: string | null;
    price: string | number;
    slug: string;
    inStock: boolean;
    ratingValue?: number | null;
    reviewCount?: number | null;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        description,
        ...(image ? { image: [image] } : {}),
        offers: {
            "@type": "Offer",
            url: canonical(`/shop/products/${slug}`),
            priceCurrency: "AUD",
            price: String(price),
            availability: inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: { "@id": `${SITE_URL}/#organization` },
        },
        // Only emitted when real ratings exist — fabricating these is a
        // structured-data violation, not a shortcut.
        ...(ratingValue && reviewCount
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: String(ratingValue),
                      reviewCount: String(reviewCount),
                  },
              }
            : {}),
    };
}

export function menuItemSchema({
    name,
    description,
    image,
    price,
    slug,
    dietaryTags,
}: {
    name: string;
    description: string;
    image: string | null;
    price: string | number;
    slug: string;
    dietaryTags?: string[];
}) {
    const RESTRICTIONS: Record<string, string> = {
        vegan: "https://schema.org/VeganDiet",
        vegetarian: "https://schema.org/VegetarianDiet",
        gluten_free: "https://schema.org/GlutenFreeDiet",
        halal: "https://schema.org/HalalDiet",
    };
    const restrictions = (dietaryTags ?? [])
        .map((t) => RESTRICTIONS[t])
        .filter(Boolean);

    return {
        "@context": "https://schema.org",
        "@type": "MenuItem",
        name,
        description,
        ...(image ? { image: [image] } : {}),
        url: canonical(`/restaurant/${slug}`),
        offers: {
            "@type": "Offer",
            priceCurrency: "AUD",
            price: String(price),
            availability: "https://schema.org/InStock",
        },
        ...(restrictions.length
            ? { suitableForDiet: restrictions }
            : {}),
    };
}
