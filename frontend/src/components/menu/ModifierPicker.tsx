"use client";

import { formatCurrency } from "@/lib/utils";
import type { ModifierGroup } from "@/types/menu";

/**
 * Renders a dish's modifier groups and reports the current selection upward.
 *
 * Client-side enforcement here is UX only — `apps.menu.services.
 * validate_and_snapshot_modifiers` re-validates every selection on both
 * cart-add and checkout, so this can never be the only gate.
 */

export interface ModifierSelection {
    /** group id -> chosen modifier ids */
    [groupId: string]: string[];
}

/** Groups default-selected where the backend marked an option `is_default`. */
export function initialSelection(groups: ModifierGroup[]): ModifierSelection {
    const selection: ModifierSelection = {};
    for (const group of groups) {
        const defaults = group.options
            .filter((o) => o.is_default)
            .map((o) => o.id);
        // A single-choice group can only carry one default.
        selection[group.id] =
            group.selection_type === "single" ? defaults.slice(0, 1) : defaults;
    }
    return selection;
}

/** Flatten the per-group selection into the id list the cart API expects. */
export function selectedModifierIds(selection: ModifierSelection): string[] {
    return Object.values(selection).flat();
}

/** Sum of every chosen option's price_delta. */
export function selectionPriceDelta(
    groups: ModifierGroup[],
    selection: ModifierSelection
): number {
    let total = 0;
    for (const group of groups) {
        const chosen = selection[group.id] ?? [];
        for (const option of group.options) {
            if (chosen.includes(option.id)) total += Number(option.price_delta);
        }
    }
    return total;
}

/**
 * First unmet requirement, or null when the selection is valid.
 * Mirrors the backend's checks so the message matches what it would say.
 */
export function selectionError(
    groups: ModifierGroup[],
    selection: ModifierSelection
): string | null {
    for (const group of groups) {
        const count = (selection[group.id] ?? []).length;

        if (group.is_required && count < Math.max(group.min_select, 1)) {
            return `Please choose an option for "${group.name}".`;
        }
        if (count < group.min_select) {
            return `"${group.name}" needs at least ${group.min_select} selection${
                group.min_select > 1 ? "s" : ""
            }.`;
        }
        if (group.max_select != null && count > group.max_select) {
            return `"${group.name}" allows at most ${group.max_select} selection${
                group.max_select > 1 ? "s" : ""
            }.`;
        }
    }
    return null;
}

function groupRule(group: ModifierGroup): string {
    if (group.selection_type === "single") {
        return group.is_required ? "Choose 1" : "Choose up to 1";
    }
    if (group.max_select != null && group.min_select > 0) {
        return `Choose ${group.min_select}–${group.max_select}`;
    }
    if (group.max_select != null) return `Choose up to ${group.max_select}`;
    if (group.min_select > 0) return `Choose at least ${group.min_select}`;
    return "Optional";
}

export default function ModifierPicker({
    groups,
    selection,
    onChange,
}: {
    groups: ModifierGroup[];
    selection: ModifierSelection;
    onChange: (next: ModifierSelection) => void;
}) {
    const toggle = (group: ModifierGroup, optionId: string) => {
        const current = selection[group.id] ?? [];

        if (group.selection_type === "single") {
            // Re-clicking the chosen option clears it, but only if optional.
            const next =
                current[0] === optionId && !group.is_required ? [] : [optionId];
            onChange({ ...selection, [group.id]: next });
            return;
        }

        const isSelected = current.includes(optionId);
        if (
            !isSelected &&
            group.max_select != null &&
            current.length >= group.max_select
        ) {
            return; // at the cap — ignore rather than silently dropping another choice
        }
        onChange({
            ...selection,
            [group.id]: isSelected
                ? current.filter((id) => id !== optionId)
                : [...current, optionId],
        });
    };

    return (
        <div className="space-y-6">
            {groups.map((group) => {
                const chosen = selection[group.id] ?? [];
                const atCap =
                    group.selection_type === "multiple" &&
                    group.max_select != null &&
                    chosen.length >= group.max_select;

                return (
                    <fieldset key={group.id}>
                        <legend className="flex w-full items-baseline justify-between gap-3 mb-2">
                            <span className="font-semibold text-gray-900">
                                {group.name}
                                {group.is_required && (
                                    <span className="ml-1.5 text-xs font-medium text-red-600">
                                        Required
                                    </span>
                                )}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                {groupRule(group)}
                            </span>
                        </legend>

                        <div className="space-y-2">
                            {group.options.map((option) => {
                                const isSelected = chosen.includes(option.id);
                                const disabled = atCap && !isSelected;
                                const delta = Number(option.price_delta);

                                return (
                                    <label
                                        key={option.id}
                                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                            isSelected
                                                ? "border-brand-500 bg-brand-50"
                                                : "border-gray-200 bg-white hover:border-gray-300"
                                        } ${
                                            disabled
                                                ? "opacity-50 cursor-not-allowed"
                                                : "cursor-pointer"
                                        }`}
                                    >
                                        <input
                                            type={
                                                group.selection_type === "single"
                                                    ? "radio"
                                                    : "checkbox"
                                            }
                                            name={group.id}
                                            checked={isSelected}
                                            disabled={disabled}
                                            onChange={() => toggle(group, option.id)}
                                            className="h-4 w-4 accent-brand-600"
                                        />
                                        <span className="flex-1 text-sm text-gray-800">
                                            {option.name}
                                        </span>
                                        {delta !== 0 && (
                                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                                {delta > 0 ? "+" : "−"}
                                                {formatCurrency(Math.abs(delta))}
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                );
            })}
        </div>
    );
}
