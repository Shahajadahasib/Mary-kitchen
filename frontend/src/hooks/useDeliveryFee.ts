"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

/**
 * Delivery-fee calculation for checkout.
 *
 * Both storefronts deliver from the same physical location and share the same
 * `delivery.DeliveryZone` records, so the fee logic is identical for grocery
 * and restaurant orders — only the cart feeding it differs.
 *
 * Extracted from the grocery checkout page so the restaurant checkout does not
 * re-implement (and drift from) the same state machine.
 */

export type DeliveryFeeState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "denied"; message: string }
    | {
          status: "ok";
          fee: number;
          isFree: boolean;
          zoneName: string;
          estimatedDays: number;
          distanceKm: number;
      };

export interface DeliveryAddress {
    id: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
    [key: string]: unknown;
}

export function useDeliveryFee({
    orderType,
    addressId,
    addresses,
    subtotal,
}: {
    orderType: "delivery" | "pickup";
    addressId: string;
    addresses: DeliveryAddress[];
    subtotal: number;
}) {
    const [state, setState] = useState<DeliveryFeeState>({ status: "idle" });

    const selectedAddress = useMemo(
        () => addresses.find((a) => a.id === addressId) ?? null,
        [addresses, addressId]
    );

    // Recalculate only when the coordinates actually change, not on every
    // re-render of the address list.
    const coordKey =
        selectedAddress?.latitude && selectedAddress?.longitude
            ? `${selectedAddress.latitude}|${selectedAddress.longitude}`
            : "";

    const calculate = useCallback(
        async (addr: DeliveryAddress, orderTotal: number) => {
            if (!addr.latitude || !addr.longitude) {
                setState({
                    status: "error",
                    message:
                        "This address has no location data. Please re-save it using the address search to get an accurate delivery fee.",
                });
                return;
            }

            setState({ status: "loading" });
            try {
                const { data } = await api.post("/delivery/calculate-fee/", {
                    latitude: parseFloat(String(addr.latitude)),
                    longitude: parseFloat(String(addr.longitude)),
                    order_total: orderTotal.toFixed(2),
                });

                if (!data.available) {
                    setState({
                        status: "denied",
                        message:
                            data.reason ||
                            "Delivery is not available to this address.",
                    });
                    return;
                }

                setState({
                    status: "ok",
                    fee: parseFloat(data.fee ?? "0"),
                    isFree: data.is_free === true,
                    zoneName: data.zone_name ?? data.zone?.name ?? "",
                    estimatedDays: data.estimated_days ?? 1,
                    distanceKm: data.distance_km ?? 0,
                });
            } catch {
                setState({
                    status: "error",
                    message:
                        "Could not calculate delivery fee. Please try again.",
                });
            }
        },
        []
    );

    useEffect(() => {
        if (orderType !== "delivery" || !selectedAddress) {
            setState({ status: "idle" });
            return;
        }
        calculate(selectedAddress, subtotal);
        // coordKey stands in for selectedAddress's identity here on purpose.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderType, addressId, coordKey, subtotal, calculate]);

    /** Fee to charge, or null while it is unknown. Pickup is always free. */
    const resolvedFee =
        orderType === "pickup" ? 0 : state.status === "ok" ? state.fee : null;

    /** True when checkout may proceed as far as delivery is concerned. */
    const ready = orderType === "pickup" || state.status === "ok";

    return { state, resolvedFee, ready };
}
