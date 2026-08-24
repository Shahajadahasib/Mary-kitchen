import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, productSchema } from "@/lib/schema";
import { canonical, fetchForSeo, metaDescription } from "@/lib/seo";

/**
 * Per-product metadata and structured data.
 *
 * The page itself is a client component, so it cannot export `generateMetadata`.
 * A co-located server layout can — and it can fetch the product server-side,
 * which is why this exists rather than converting the page. Without it every
 * product in the catalogue shared one generic title.
 */

interface SeoProduct {
    name: string;
    slug: string;
    description?: string | null;
    short_description?: string | null;
    base_price: string | number;
    sale_price?: string | number | null;
    is_in_stock?: boolean;
    average_rating?: number | null;
    review_count?: number | null;
    category?: { name?: string; slug?: string } | null;
    images?: { image: string }[];
}

async function getProduct(slug: string) {
    return fetchForSeo<SeoProduct>(`/products/${slug}/`);
}

export async function generateMetadata({
    params,
}: {
    params: { slug: string };
}): Promise<Metadata> {
    const product = await getProduct(params.slug);
    const path = `/shop/products/${params.slug}`;

    // The API may be unreachable at build time — fall back to something honest
    // rather than failing the build.
    if (!product) {
        return { alternates: { canonical: canonical(path) } };
    }

    const title = `${product.name} — Buy Online in Darwin NT`;
    const description = metaDescription(
        product.short_description || product.description,
        `Buy ${product.name} online from Mary Ben's Kitchen. Fresh groceries delivered across Darwin NT.`
    );
    const image = product.images?.[0]?.image;

    return {
        title,
        description,
        alternates: { canonical: canonical(path) },
        openGraph: {
            type: "website",
            url: canonical(path),
            title,
            description,
            ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
        },
    };
}

export default async function ProductDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const product = await getProduct(params.slug);

    return (
        <>
            {product && (
                <>
                    <JsonLd
                        data={productSchema({
                            name: product.name,
                            description: metaDescription(
                                product.short_description || product.description,
                                product.name
                            ),
                            image: product.images?.[0]?.image ?? null,
                            price: product.sale_price ?? product.base_price,
                            slug: params.slug,
                            inStock: product.is_in_stock !== false,
                            ratingValue: product.average_rating,
                            reviewCount: product.review_count,
                        })}
                    />
                    <JsonLd
                        data={breadcrumbSchema([
                            { name: "Home", path: "/" },
                            { name: "Grocery Shop", path: "/shop" },
                            { name: "Products", path: "/shop/products" },
                            ...(product.category?.slug
                                ? [
                                      {
                                          name: product.category.name ?? "Category",
                                          path: `/shop/products?category=${product.category.slug}`,
                                      },
                                  ]
                                : []),
                            { name: product.name, path: `/shop/products/${params.slug}` },
                        ])}
                    />
                </>
            )}
            {children}
        </>
    );
}
