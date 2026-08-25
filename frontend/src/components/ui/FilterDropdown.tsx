"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type FilterOption = {
    value: string;
    label: string;
    /** Optional trailing count, e.g. the number of dishes in a category. */
    hint?: string | number;
};

type Props = {
    /** Shown when nothing is selected, and as the control's accessible name. */
    label: string;
    options: FilterOption[];
    /** Empty string means "no filter applied". */
    value: string;
    onChange: (value: string) => void;
    /** Label for the "clear this filter" row at the top of the list. */
    allLabel: string;
    /** False for a required choice — a reporting period has no "unset" state,
     *  and offering one duplicated the first real option. */
    clearable?: boolean;
    className?: string;
};

/**
 * A single-select filter control for the menu browse toolbar.
 *
 * Replaces the horizontal chip rows the restaurant page used to carry. Those
 * worked on a wide screen but wrapped into two or three ragged rows on a
 * phone, which pushed the dish grid down and made the top of the page look
 * like a pile of pills. A dropdown occupies one fixed-height slot at every
 * width, which is what lets the toolbar stay a single row beside the search
 * field.
 *
 * Deliberately not a native <select>: the trigger has to show the *applied*
 * state (a filled pill when a filter is on) so the toolbar communicates at a
 * glance whether the grid below is filtered, and a native control cannot be
 * styled that way across browsers.
 */
export default function FilterDropdown({
    label,
    options,
    value,
    onChange,
    allLabel,
    clearable = true,
    className = "",
}: Props) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    const selected = options.find((o) => o.value === value);
    const isFiltered = Boolean(value);

    // When clearable, `allLabel` is index 0 so keyboard traversal covers the
    // clear row too.
    const rows: FilterOption[] = clearable
        ? [{ value: "", label: allLabel }, ...options]
        : options;

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const commit = (next: string) => {
        onChange(next);
        setOpen(false);
        setActiveIndex(-1);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
            return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
                setOpen(true);
                setActiveIndex(0);
                return;
            }
            setActiveIndex((i) => {
                const next = e.key === "ArrowDown" ? i + 1 : i - 1;
                return (next + rows.length) % rows.length;
            });
            return;
        }
        if ((e.key === "Enter" || e.key === " ") && open && activeIndex >= 0) {
            e.preventDefault();
            commit(rows[activeIndex].value);
        }
    };

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                className={`flex h-11 w-full items-center justify-between gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.98] ${
                    isFiltered
                        ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                        : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:ring-gray-300 hover:shadow-sm"
                }`}
            >
                <span className="truncate">
                    {selected ? selected.label : label}
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                    } ${isFiltered ? "text-white/80" : "text-gray-400"}`}
                    aria-hidden="true"
                />
            </button>

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label={label}
                    // Exactly the trigger's width — `left-0 right-0` against the
                    // relatively-positioned wrapper. An earlier `min-w` here
                    // made the panel wider than its trigger, and since these
                    // sit flush against the right edge of the container the
                    // overflow put a horizontal scrollbar on the whole page
                    // every time a dropdown opened. Long names truncate
                    // instead, which they already did in the trigger.
                    className="scrollbar-slim absolute left-0 right-0 top-full z-40 mt-2 max-h-72 animate-dropdown-in overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-2xl"
                >
                    {rows.map((opt, i) => {
                        const isSelected = opt.value === value;
                        return (
                            <li key={opt.value || "__all"} role="none">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => commit(opt.value)}
                                    onMouseEnter={() => setActiveIndex(i)}
                                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 ${
                                        i === activeIndex ? "bg-brand-50" : ""
                                    } ${
                                        isSelected
                                            ? "font-semibold text-brand-700"
                                            : "text-gray-700"
                                    }`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {isSelected ? (
                                        <Check
                                            className="h-4 w-4 shrink-0 text-brand-600"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        opt.hint != null && (
                                            <span className="shrink-0 text-xs text-gray-400">
                                                {opt.hint}
                                            </span>
                                        )
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
