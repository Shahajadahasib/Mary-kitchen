"use client";

import api from "@/lib/api";
import { absoluteMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Search, SearchX, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type Suggestion = {
    id: string;
    name: string;
    slug: string;
    base_price: string | number;
    /** Grocery only — the menu API has no sale price. */
    sale_price?: string | number | null;
    category_name?: string | null;
    primary_image?: string | null;
};

export type SearchChannel = "grocery" | "restaurant";

/**
 * Everything that differs between the two storefronts' search. Both hit the
 * same DRF `?search=` contract and return the same list shape, so only the
 * endpoint, the destinations and the wording change.
 */
const CHANNELS = {
    grocery: {
        endpoint: "/products/",
        placeholder: "Search groceries, fish, meat...",
        label: "Search products",
        itemHref: (slug: string) => `/shop/products/${slug}`,
        resultsHref: (q: string) => `/shop/products?search=${encodeURIComponent(q)}`,
        browseLabel: "Browse all products",
        emptyNoun: "products",
        priceClass: "text-primary-700",
        linkClass: "text-primary-700 hover:bg-primary-50",
        FallbackIcon: ShoppingBag,
    },
    restaurant: {
        endpoint: "/menu/",
        placeholder: "Search the menu...",
        label: "Search the menu",
        itemHref: (slug: string) => `/restaurant/${slug}`,
        resultsHref: (q: string) => `/restaurant?search=${encodeURIComponent(q)}`,
        browseLabel: "Browse the full menu",
        emptyNoun: "dishes",
        priceClass: "text-brand-700",
        linkClass: "text-brand-700 hover:bg-brand-50",
        FallbackIcon: UtensilsCrossed,
    },
} as const;

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
    /** Which catalogue to search, and where results lead. */
    channel?: SearchChannel;
    /** `bar` hides itself below md (the desktop header slot); `panel` is
     *  always visible and fills its container. */
    variant?: "bar" | "panel";
    /** `color` sits on a coloured header bar, `light` on a page background. */
    surface?: "color" | "light";
    autoFocus?: boolean;
    placeholder?: string;
    className?: string;
    /** Called after any navigation, so a header can close its menus. */
    onNavigate?: () => void;
};

/**
 * Catalogue search with a live suggestion panel, shared by both storefronts.
 *
 * One component serves the grocery header, the mobile search sheet and the
 * restaurant menu browse. They previously carried hand-maintained copies of
 * the same markup, which is how one of them ended up without the focus handler
 * that reopens the panel.
 *
 * Behaviour worth knowing about:
 *  - Requests are debounced, and every superseded request is aborted, so an
 *    early response cannot land after a later one and repaint the panel with
 *    results for a prefix the user has already typed past.
 *  - A suggestion is committed on `mousedown` (the option calls
 *    `preventDefault`), not on `click` after a blur timeout. A timeout races
 *    the blur and drops clicks.
 *  - Full combobox keyboard support: Up/Down move, Enter opens the active
 *    option or submits the raw query, Escape closes, Home/End jump.
 */
export default function SearchAutocomplete({
    channel = "grocery",
    variant = "bar",
    surface = "color",
    autoFocus = false,
    placeholder,
    className = "",
    onNavigate,
}: Props) {
    const router = useRouter();
    const listboxId = useId();
    const cfg = CHANNELS[channel];

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    /** The query the current `suggestions` belong to. The empty state keys off
     *  this so "no matches" cannot flash while an older result set is still up. */
    const [settledQuery, setSettledQuery] = useState("");

    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
                const res = await api.get(cfg.endpoint, {
                    params: { search: trimmed, page_size: MAX_SUGGESTIONS },
                    signal: controller.signal,
                });
                const results: Suggestion[] = res.data?.results ?? res.data ?? [];
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
    }, [trimmed, isSearchable, cfg.endpoint]);

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
        router.push(cfg.resultsHref(trimmed));
        setQuery("");
        close();
        onNavigate?.();
    }, [trimmed, router, close, onNavigate, cfg]);

    const goToItem = useCallback(
        (item: Suggestion) => {
            router.push(cfg.itemHref(item.slug));
            setQuery("");
            close();
            onNavigate?.();
        },
        [router, close, onNavigate, cfg],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const active = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
        if (active) goToItem(active);
        else if (trimmed) goToResults();
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

    const { FallbackIcon } = cfg;

    // The field is a pill. On a coloured header it is a near-opaque white
    // plate so it belongs to the bar; on a page background it needs a real
    // border instead, or it dissolves into the surrounding grey.
    const shell =
        surface === "color"
            ? "bg-white/95 ring-1 ring-inset ring-white/25 focus-within:bg-white focus-within:ring-2 focus-within:ring-white"
            : "bg-white ring-1 ring-inset ring-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-brand-400 hover:ring-gray-300";

    return (
        <div
            ref={rootRef}
            className={`relative ${
                variant === "bar" ? "hidden w-full max-w-2xl flex-1 md:block" : "w-full"
            } ${className}`}
        >
            <form onSubmit={handleSubmit} role="search" className="flex w-full">
                <div
                    className={`group flex w-full items-center gap-2 rounded-full py-1 pl-4 pr-1 transition-all duration-200 ${shell}`}
                >
                    <Search
                        className="h-[18px] w-[18px] shrink-0 text-gray-400 transition-colors duration-200 group-focus-within:text-brand-600"
                        strokeWidth={2.25}
                        aria-hidden="true"
                    />
                    <input
                        ref={inputRef}
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
                        placeholder={placeholder ?? cfg.placeholder}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={cfg.label}
                        role="combobox"
                        aria-expanded={showPanel}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={activeOptionId}
                        className="min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 placeholder-gray-400 outline-none"
                    />

                    {loading && (
                        <Loader2
                            className="h-4 w-4 shrink-0 animate-spin text-brand-500"
                            aria-hidden="true"
                        />
                    )}

                    {query && !loading && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => {
                                setQuery("");
                                close();
                                inputRef.current?.focus();
                            }}
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                    )}

                    <button
                        type="submit"
                        aria-label="Search"
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95 sm:px-4"
                    >
                        <Search className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        <span className="hidden text-sm sm:inline">Search</span>
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
                <div className="absolute left-0 right-0 top-full z-50 mt-2 animate-dropdown-in overflow-hidden rounded-2xl border border-gray-100 bg-white text-gray-800 shadow-2xl">
                    <ul
                        id={listboxId}
                        role="listbox"
                        aria-label="Suggestions"
                        className="scrollbar-slim max-h-[60vh] overflow-y-auto p-1.5"
                    >
                        {loading && suggestions.length === 0
                            ? Array.from({ length: 3 }).map((_, i) => (
                                  <li
                                      key={i}
                                      className="flex items-center gap-3 px-2.5 py-2.5"
                                      aria-hidden="true"
                                  >
                                      <div className="skeleton h-11 w-11 rounded-xl" />
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
                                              onClick={() => goToItem(item)}
                                              onMouseEnter={() => setActiveIndex(i)}
                                              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150 ${
                                                  active ? "bg-brand-50" : "bg-white"
                                              }`}
                                          >
                                              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/70">
                                                  {image ? (
                                                      <Image
                                                          src={image}
                                                          alt=""
                                                          fill
                                                          className="object-cover"
                                                          sizes="44px"
                                                      />
                                                  ) : (
                                                      <FallbackIcon
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
                                                  <p
                                                      className={`text-sm font-bold ${cfg.priceClass}`}
                                                  >
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
                                    No {cfg.emptyNoun} match &ldquo;{trimmed}&rdquo;
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    Try a shorter word, or browse everything
                                    we have.
                                </p>
                            </li>
                        )}
                    </ul>

                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={goToResults}
                        className={`flex w-full items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/70 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${cfg.linkClass}`}
                    >
                        <span className="truncate">
                            {suggestions.length > 0
                                ? `See all results for “${trimmed}”`
                                : cfg.browseLabel}
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
