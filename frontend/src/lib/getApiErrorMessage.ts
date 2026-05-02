/** Best-effort message from axios / DRF error responses. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const res = (err as { response?: { data?: unknown } })?.response;
  const data = res?.data;
  if (!data || typeof data !== "object") return fallback;

  const d = data as Record<string, unknown>;

  if (typeof d.message === "string" && d.message.trim()) return d.message;

  if (typeof d.detail === "string" && d.detail.trim()) return d.detail;
  if (Array.isArray(d.detail) && d.detail.length > 0) {
    const first = d.detail[0];
    if (typeof first === "string") return first;
  }

  if (Array.isArray(d.non_field_errors) && d.non_field_errors.length > 0) {
    const first = d.non_field_errors[0];
    if (typeof first === "string") return first;
  }

  return fallback;
}
