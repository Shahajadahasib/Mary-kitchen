"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The filter band above an admin list.
 *
 * One card, one flex row, one set of control heights. The routes each had
 * their own arrangement before — some tucked the filters inside the table card
 * behind a border, one floated them loose above it, one wrapped them in a
 * `<form>` with a submit button while its neighbour searched as you typed.
 * Children are laid out left to right and wrap to a column on small screens.
 */
export function AdminToolbar({ children }: { children: ReactNode }) {
    return (
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {children}
            </div>
        </div>
    );
}

type SearchProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Accessible name — distinct per page, since several may share a screen. */
    label?: string;
    className?: string;
};

/**
 * The admin search field: a pill with an inset icon and a clear button.
 *
 * Matches the storefront's search treatment rather than the plain
 * `.input-field` box these used to be, so the two halves of the product read
 * as one system.
 */
export function AdminSearchInput({
    value,
    onChange,
    placeholder = "Search…",
    label = "Search",
    className = "",
}: SearchProps) {
    return (
        <div
            className={`group relative flex h-11 items-center gap-2 rounded-full bg-white pl-4 pr-1 ring-1 ring-inset ring-gray-200 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-400 hover:ring-gray-300 ${className}`}
        >
            <Search
                className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-focus-within:text-brand-600"
                strokeWidth={2.25}
                aria-hidden="true"
            />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            {value && (
                <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => onChange("")}
                    className="mr-2 grid h-6 w-6 shrink-0 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}
