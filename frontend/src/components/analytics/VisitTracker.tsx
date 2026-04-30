"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";

const VISIT_TRACKED_KEY = "mary_kitchen_visit_tracked";

export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(VISIT_TRACKED_KEY)) return;
    const sessionId = getOrCreateSessionId();

    api
      .post("/analytics/visit/", { session_id: sessionId })
      .then(() => sessionStorage.setItem(VISIT_TRACKED_KEY, "1"))
      .catch(() => {
        // Analytics should never interrupt the storefront.
      });
  }, []);

  return null;
}
