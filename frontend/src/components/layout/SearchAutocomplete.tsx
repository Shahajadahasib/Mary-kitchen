"use client";

import api from "@/lib/api";
import { absoluteMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Search, SearchX, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type ProductSuggestion = {
    id: string;
    name: string;
    slug: string;
    base_price: string | number;
    sale_price?: string | number | null;
    category_name?: string | null;
    primary_image?: string | null;
};

/** Below this many characters we do not query — a one-letter search matches
 *  most of the catalogue, so the panel would be noise rather than help. */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;

/**
 * Wrap every occurrence of a search token in a <mark>, so the user can see
 * *why* a result matched. Splitting on a capturing group leaves the matched
 * fragments at the odd indices of the resulting array.
 */
function highlight(text: string, query: string) {
    const tokens = query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (tokens.length === 0) return text;

    const parts = text.split(new RegExp(`(${tokens.join("|")})`, "ig"));
    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <mark
                key={i}
                className="rounded-[3px] bg-brand-100 px-0.5 text-brand-800"
            >
                {part}
            </mark>
        ) : (
            <span key={i}>{part}</span>
        ),
    );
}

type Props = {
    /** `bar` is the desktop header pill; `panel` is the mobile search sheet. */
    variant?: "bar" | "panel";
    autoFocus?: boolean;
    placeholder?: string;
    /** Called after any navigation, so the header can close its menus. */
    onNavigate?: () => void;
};

/**
 * Grocery product search with a live suggestion panel.
 *
 * One component serves both the desktop header bar and the mobile sheet. They
 * previously carried two hand-maintained copies of the same 80 lines of markup,
 * which is how the mobile copy ended up without the focus handler that reopens
 * the panel after a dismissal.
 *
 * Behaviour worth knowing about:
 *  - Requests are debounced, and every superseded request is aborted, so an
 *    early response cannot land after a later one and repaint the panel with
 *    results for a prefix the user has already typed past.
 *  - A suggestion is committed on `mousedown` (the option calls
 *    `preventDefault`), not on `click` after a blur timeout. The timeout the
 *    previous version used raced the blur and dropped clicks.
 *  - Full combobox keyboard support: Up/Down move, Enter opens the active
 *    option or submits the raw query, Escape closes, Home/End jump.
 */
export default function SearchAutocomplete({
    variant = "bar",
    autoFocus = false,
    placeholder = "Search groceries, fish, meat...",
    onNavigate,
}: Props) {
    const router = useRouter();
    const listboxId = useId();

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    /** The query the current `suggestions` belong to. The empty state keys off
     *  this so "no matches" cannot flash while an older result set is still up. */
    const [settledQuery, setSettledQuery] = useState("");

    const rootRef = useRef<HTMLDivElement>(null);

    const trimmed = query.trim();
    const isSearchable = trimmed.length >= MIN_QUERY;

    // ── Fetch: debounced and abortable ──────────────────────────────────────
    useEffect(() => {
        if (!isSearchable) {
            setSuggestions([]);
            setSettledQuery("");
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);

        const timer = window.setTimeout(async () => {
            try {
                const res = await api.get("/products/", {
                    params: { search: trimmed, page_size: MAX_SUGGESTIONS },
                    signal: controller.signal,
                });
                const results: ProductSuggestion[] =
                    res.data?.results ?? res.data ?? [];
                setSuggestions(results.slice(0, MAX_SUGGESTIONS));
                setSettledQuery(trimmed);
                setActiveIndex(-1);
                setOpen(true);
            } catch {
                // An aborted request is the expected outcome for every
                // keystroke but the last — not a failure worth reporting.
                if (controller.signal.aborted) return;
                setSuggestions([]);
                setSettledQuery(trimmed);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [trimmed, isSearchable]);

    // ── Dismiss on outside click ────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const close = useCallback(() => {
        setOpen(false);
        setActiveIndex(-1);
    }, []);

    const goToResults = useCallback(() => {
        if (!trimmed) return;
        router.push(`/shop/products?search=${encodeURIComponent(trimmed)}`);
        setQuery("");
        close();
        onNavigate?.();
    }, [trimmed, router, close, onNavigate]);

    const goToProduct = useCallback(
        (item: ProductSuggestion) => {
            router.push(`/shop/products/${item.slug}`);
            setQuery("");
            close();
            onNavigate?.();
        },
        [router, close, onNavigate],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const active = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
        if (active) goToProduct(active);
        else goToResults();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            close();
            return;
        }

        if (suggestions.length === 0) return;

        if (!open) {
            // Down-arrow re-opens a panel the user dismissed with Escape.
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % suggestions.length);
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
                break;
            case "Home":
                e.preventDefault();
                setActiveIndex(0);
                break;
            case "End":
                e.preventDefault();
                setActiveIndex(suggestions.length - 1);
                break;
            case "Tab":
                close();
                break;
        }
    };

    const showEmptyState =
        open &&
        !loading &&
        isSearchable &&
        settledQuery === trimmed &&
        suggestions.length === 0;

    const showPanel =
        open && isSearchable && (loading || suggestions.length > 0 || showEmptyState);

    const activeOptionId =
        activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

    return (
        <div
            ref={rootRef}
            className={
                variant === "panel"
                    ? "relative w-full"
                    : "relative hidden w-full max-w-2xl flex-1 md:block"
            }
        >
            <form onSubmit={handleSubmit} role="search" className="flex w-full">
                {/* A translucent white plate rather than a hard white box, so
                    the field belongs to the coloured header instead of looking
                    punched out of it. */}
                <div
                    className={`group flex w-full items-center gap-2 rounded-xl bg-white/95 pl-3 shadow-sm ring-1 ring-inset ring-white/25 transition duration-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-white ${
                        showPanel ? "rounded-b-none" : ""
                    }`}
                >
                    <Search
                        className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-focus-within:text-brand-600"
                        aria-hidden="true"
                    />
                    <input
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus={autoFocus}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => {
                            if (isSearchable) setOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        type="search"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Search products"
                        role="combobox"
                        aria-expanded={showPanel}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={activeOptionId}
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-gray-900 placeholder-gray-400 outline-none [&::-webkit-search-cancel-button]:appearance-none"
                    />
                    {loading && (
                        <Loader2
                            className="h-4 w-4 shrink-0 animate-spin text-brand-500"
                            aria-hidden="true"
                        />
                    )}
                    <button
                        type="submit"
                        aria-label="Search"
                        className="m-1 flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </form>

            {/* Live region, so a screen reader hears the result count change
                without the panel having to steal focus. */}
            <span className="sr-only" role="status" aria-live="polite">
                {showPanel && !loading
                    ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}`
                    : ""}
            </span>

            {showPanel && (
                <div className="absolute left-0 right-0 top-full z-50 animate-dropdown-in overflow-hidden rounded-b-xl border border-t-0 border-gray-100 bg-white text-gray-800 shadow-2xl">
                    <ul
                        id={listboxId}
                        role="listbox"
                        aria-label="Product suggestions"
                        className="scrollbar-slim max-h-[60vh] overflow-y-auto"
                    >
                        {loading && suggestions.length === 0
                            ? Array.from({ length: 3 }).map((_, i) => (
                                  <li
                                      key={i}
                                      className="flex items-center gap-3 px-3 py-2.5"
                                      aria-hidden="true"
                                  >
                                      <div className="skeleton h-11 w-11 rounded-lg" />
                                      <div className="flex-1 space-y-2">
                                          <div className="skeleton h-3 w-2/3" />
                                          <div className="skeleton h-3 w-1/4" />
                                      </div>
                                  </li>
                              ))
                            : suggestions.map((item, i) => {
                                  const image = absoluteMediaUrl(item.primary_image);
                                  const price = item.sale_price ?? item.base_price;
                                  const onSale =
                                      item.sale_price != null &&
                                      Number(item.sale_price) < Number(item.base_price);
                                  const active = i === activeIndex;

                                  return (
                                      <li key={item.id} role="none">
                                          <button
                                              type="button"
                                              id={`${listboxId}-opt-${i}`}
                                              role="option"
                                              aria-selected={active}
                                              // Commit before the input's blur
                                              // can tear the panel down.
                                              onMouseDown={(e) => e.preventDefault()}
                                              onClick={() => goToProduct(item)}
                                              onMouseEnter={() => setActiveIndex(i)}
                                              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                                  active ? "bg-brand-50" : "bg-white"
                                              }`}
                                          >
                                              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200/70">
                                                  {image ? (
                                                      <Image
                                                          src={image}
                                                          alt=""
                                                          fill
                                                          className="object-cover"
                                                          sizes="44px"
                                                      />
                                                  ) : (
                                                      <ShoppingBag
                                                          className="absolute inset-0 m-auto h-5 w-5 text-gray-300"
                                                          aria-hidden="true"
                                                      />
                                                  )}
                                              </div>

                                              <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-medium text-gray-900">
                                                      {highlight(item.name, trimmed)}
                                                  </p>
                                                  {item.category_name && (
                                                      <p className="truncate text-xs text-gray-500">
                                                          {item.category_name}
                                                      </p>
                                                  )}
                                              </div>

                                              <div className="shrink-0 text-right">
                                                  <p className="text-sm font-bold text-primary-700">
                                                      {formatCurrency(price)}
                                                  </p>
                                                  {onSale && (
                                                      <p className="text-[11px] text-gray-400 line-through">
                                                          {formatCurrency(item.base_price)}
                                                      </p>
                                                  )}
                                              </div>
                                          </button>
                                      </li>
                                  );
                              })}

                        {showEmptyState && (
                            <li className="px-4 py-8 text-center" role="none">
                                <SearchX
                                    className="mx-auto mb-2 h-7 w-7 text-gray-300"
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                />
                                <p className="text-sm font-medium text-gray-700">
                                    No products match &ldquo;{trimmed}&rdquo;
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    Try a shorter word, or browse the full
                                    catalogue.
                                </p>
                            </li>
                        )}
                    </ul>

                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={goToResults}
                        className="flex w-full items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/70 px-4 py-2.5 text-left text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
                    >
                        <span className="truncate">
                            {suggestions.length > 0
                                ? `See all results for “${trimmed}”`
                                : "Browse all products"}
                        </span>
                        <span aria-hidden="true" className="shrink-0">
                            →
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
