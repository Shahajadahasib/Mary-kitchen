/** Normalize DRF / Django REST validation errors into { fieldKey: string }. */
export function parseApiFieldErrors(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object") return {};

  const out: Record<string, string> = {};
  const obj = data as Record<string, unknown>;

  const push = (field: string, value: unknown) => {
    if (value == null) return;
    if (typeof value === "string" && value.trim()) {
      out[field] = value;
      return;
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string") out[field] = first;
      else if (first && typeof first === "object" && "string" in first && typeof (first as { string: unknown }).string === "string") {
        out[field] = (first as { string: string }).string;
      }
    }
  };

  push("non_field_errors", obj.non_field_errors);
  push("detail", obj.detail);

  for (const [key, value] of Object.entries(obj)) {
    if (key === "success" || key === "message" || key === "errors") continue;
    if (key === "non_field_errors" || key === "detail") continue;
    push(key, value);
  }

  return out;
}
