/**
 * AddressAutocomplete — powered by Nominatim (OpenStreetMap).
 *
 * ✅ Completely free — no API key, no account, no credit card
 * ✅ Works for Australian addresses
 * ✅ Shows dropdown suggestions as the user types
 * ✅ Auto-fills all address fields on selection
 * ✅ Keyboard navigable (↑ ↓ Enter Escape)
 * ✅ Debounced (350ms) to stay within Nominatim fair-use policy
 */
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, Search, AlertCircle } from "lucide-react";
import type { ParsedAddress } from "@/hooks/useGooglePlaces";

// ─── Nominatim types ──────────────────────────────────────────────────────────

interface NominatimPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

// ─── State name → abbreviation ────────────────────────────────────────────────

const AU_STATE_MAP: Record<string, string> = {
  "Australian Capital Territory": "ACT",
  "New South Wales":              "NSW",
  "Northern Territory":           "NT",
  "Queensland":                   "QLD",
  "South Australia":              "SA",
  "Tasmania":                     "TAS",
  "Victoria":                     "VIC",
  "Western Australia":            "WA",
};

// ─── Parse Nominatim result → ParsedAddress ───────────────────────────────────

function parseResult(r: NominatimPlace): ParsedAddress {
  const a            = r.address;
  const address_line1 = [a.house_number, a.road].filter(Boolean).join(" ");
  const suburb       = a.suburb ?? a.neighbourhood ?? a.city ?? a.town ?? a.village ?? "";
  const stateRaw     = a.state ?? "";
  const state        = AU_STATE_MAP[stateRaw] ?? stateRaw;
  const postcode     = a.postcode ?? "";
  const country      = a.country ?? "Australia";
  const latitude     = r.lat ? parseFloat(r.lat) : null;
  const longitude    = r.lon ? parseFloat(r.lon) : null;
  return { address_line1, suburb, state, postcode, country, latitude, longitude };
}

// ─── Nominatim search function ────────────────────────────────────────────────

async function nominatimSearch(query: string): Promise<NominatimPlace[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q",              query);
  url.searchParams.set("countrycodes",   "au");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("format",         "json");
  url.searchParams.set("limit",          "6");
  url.searchParams.set("dedupe",         "1");

  const res = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "en",
      "Accept":          "application/json",
    },
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface Props {
  initialValue?: string;
  onSelect: (parsed: ParsedAddress, formatted: string) => void;
  placeholder?: string;
  error?: string;
}

export default function AddressAutocomplete({
  initialValue = "",
  onSelect,
  placeholder = "Start typing your street address...",
  error,
}: Props) {
  const [inputValue,      setInputValue]      = useState(initialValue);
  const [suggestions,     setSuggestions]     = useState<NominatimPlace[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [highlightIndex,  setHighlightIndex]  = useState(-1);
  const [fetchError,      setFetchError]      = useState<string | null>(null);
  const [focused,         setFocused]         = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const containerRef  = useRef<HTMLDivElement>(null);

  // Reset input text when initialValue changes (modal opens with a different address)
  useEffect(() => {
    setInputValue(initialValue);
    setSuggestions([]);
  }, [initialValue]);

  // ── Fetch suggestions with 350ms debounce ─────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceTimer.current);

    const q = inputValue.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const results = await nominatimSearch(q);
        setSuggestions(results);
        setShowDropdown(true); // show dropdown whether results exist or not
        setHighlightIndex(-1);
      } catch {
        setFetchError("Could not load suggestions. Check your connection.");
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceTimer.current);
  }, [inputValue]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Select a suggestion ───────────────────────────────────────────────────
  const handleSelect = useCallback((place: NominatimPlace) => {
    const parsed = parseResult(place);

    // Build a clean display string from structured fields (Option A).
    // Do NOT use place.display_name — it repeats suburb/state/postcode which
    // are already shown in the individual fields below, creating visual duplication.
    const parts: string[] = [];
    if (parsed.address_line1) parts.push(parsed.address_line1);
    if (parsed.suburb)        parts.push(parsed.suburb);
    if (parsed.state)         parts.push(parsed.state);
    if (parsed.postcode)      parts.push(parsed.postcode);
    const formatted = parts.join(", ");

    setInputValue(formatted);
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(parsed, formatted);
  }, [onSelect]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className={`relative flex items-center border rounded-lg transition-all duration-200 bg-white ${
          error
            ? "border-red-400 ring-1 ring-red-300"
            : focused
            ? "border-primary-500 ring-2 ring-primary-100"
            : "border-gray-300"
        }`}
      >
        <Search
          className={`absolute left-3 w-4 h-4 flex-shrink-0 pointer-events-none ${
            focused ? "text-primary-600" : "text-gray-400"
          }`}
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-9 pr-10 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400"
        />
        {loading && (
          <Loader2 className="absolute right-3 w-4 h-4 text-primary-500 animate-spin pointer-events-none" />
        )}
      </div>

      {/* Error (validation) */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Fetch error */}
      {fetchError && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-300" />
              No Australian addresses found — try a different search.
            </div>
          ) : (
            <ul role="listbox" className="max-h-64 overflow-y-auto">
              {suggestions.map((place, i) => {
                // Build clean display from structured address fields.
                // Avoid splitting display_name which produces inconsistent results.
                const p    = parseResult(place);
                const main = [p.address_line1, p.suburb].filter(Boolean).join(", ")
                          || place.display_name.split(", ").slice(0, 2).join(", ");
                const sub  = [p.state, p.postcode].filter(Boolean).join(" ");
                return (
                  <li
                    key={place.place_id}
                    role="option"
                    aria-selected={i === highlightIndex}
                    onClick={() => handleSelect(place)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                      i === highlightIndex
                        ? "bg-primary-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{main}</p>
                      {sub && (
                        <p className="text-xs text-gray-400 truncate">{sub}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-4 py-1.5 border-t border-gray-100 flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">Powered by</span>
            <span className="text-[10px] font-medium text-gray-500">OpenStreetMap</span>
          </div>
        </div>
      )}
    </div>
  );
}
