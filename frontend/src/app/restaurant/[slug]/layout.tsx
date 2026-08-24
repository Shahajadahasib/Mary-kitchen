import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, menuItemSchema } from "@/lib/schema";
import { canonical, fetchForSeo, metaDescription } from "@/lib/seo";

/**
 * Per-dish metadata and structured data. Same pattern as the product detail
 * layout: the page is a client component, so the co-located server layout does
 * the fetching and owns `generateMetadata`.
 */

interface SeoDish {
    name: string;
    slug: string;
    description?: string | null;
    base_price: string | number;
    dietary_tags?: string[];
    prep_time_minutes?: number | null;
    category?: { name?: string; slug?: string } | null;
    images?: { image: string }[];
}

async function getDish(slug: string) {
    return fetchForSeo<SeoDish>(`/menu/${slug}/`);
}

export async function generateMetadata({
    params,
}: {
    params: { slug: string };
}): Promise<Metadata> {
    const dish = await getDish(params.slug);
    const path = `/restaurant/${params.slug}`;

    if (!dish) {
        return { alternates: { canonical: canonical(path) } };
    }

    const title = `${dish.name} — Takeaway & Delivery in Darwin NT`;
    const description = metaDescription(
        dish.description,
        `Order ${dish.name} from Mary Ben's Kitchen Restaurant. Takeaway from Winnellie or delivered across Darwin NT.`
    );
    const image = dish.images?.[0]?.image;

    return {
        title,
        description,
        alternates: { canonical: canonical(path) },
        openGraph: {
            type: "website",
            url: canonical(path),
            title,
            description,
            ...(image ? { images: [{ url: image, alt: dish.name }] } : {}),
        },
    };
}

export default async function DishDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const dish = await getDish(params.slug);

    return (
        <>
            {dish && (
                <>
                    <JsonLd
                        data={menuItemSchema({
                            name: dish.name,
                            description: metaDescription(dish.description, dish.name),
                            image: dish.images?.[0]?.image ?? null,
                            price: dish.base_price,
                            slug: params.slug,
                            dietaryTags: dish.dietary_tags,
                        })}
                    />
                    <JsonLd
                        data={breadcrumbSchema([
                            { name: "Home", path: "/" },
                            { name: "Restaurant", path: "/restaurant" },
                            ...(dish.category?.slug
                                ? [
                                      {
                                          name: dish.category.name ?? "Category",
                                          path: `/restaurant?category=${dish.category.slug}`,
                                      },
                                  ]
                                : []),
                            { name: dish.name, path: `/restaurant/${params.slug}` },
                        ])}
                    />
                </>
            )}
            {children}
        </>
    );
}
