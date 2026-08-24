/**
 * Renders a schema.org JSON-LD block.
 *
 * Server component on purpose: structured data must be in the initial HTML for
 * crawlers that do not execute JavaScript.
 *
 * The payload is our own data, never user input — but `<` is still escaped so a
 * stray sequence in a product description can't close the script tag early.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, "\\u003c"),
            }}
        />
    );
}
