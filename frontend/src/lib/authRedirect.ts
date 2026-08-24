/**
 * Post-authentication redirect handling.
 *
 * Auth (`/login`, `/register`, `/verify-email`) is shared by both storefronts
 * and lives at the top level, so it cannot assume where to send a user back to.
 * Callers attach a `?next=` param naming the path they came from; the auth
 * pages honour it and fall back to the hub.
 */

/** Query-param name carrying the post-auth destination. */
export const NEXT_PARAM = "next";

/** Where users land when there is no usable `next`. */
export const DEFAULT_POST_AUTH_PATH = "/";

/**
 * Accept only same-origin, absolute-from-root paths.
 *
 * Rejects anything that could leave the site: absolute URLs
 * (`https://evil.test`), protocol-relative (`//evil.test`), backslash variants
 * that some browsers normalise to `//`, and paths that don't start with `/`.
 * Also rejects the auth pages themselves so a redirect can't loop.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim();
  if (!value.startsWith("/")) return null;
  // Normalise backslashes before the protocol-relative check.
  if (/^[/\\]{2,}/.test(value)) return null;
  if (value.includes("\\")) return null;

  // Strip a stray leading "/./" and reject any traversal attempt.
  if (value.includes("..")) return null;

  const path = value.split(/[?#]/)[0];
  const AUTH_PATHS = ["/login", "/register", "/verify-email", "/forgot-password"];
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return null;

  return value;
}

/** Read and validate the `next` param from a search string or params object. */
export function resolveNextPath(
  params: URLSearchParams | { get(key: string): string | null } | null
): string {
  return safeNextPath(params?.get(NEXT_PARAM) ?? null) ?? DEFAULT_POST_AUTH_PATH;
}

/**
 * Build a link to an auth page that returns to `from` afterwards.
 * Pass the current pathname (plus search, if it matters).
 */
export function authHref(
  authPath: "/login" | "/register",
  from: string | null | undefined
): string {
  const next = safeNextPath(from);
  return next
    ? `${authPath}?${NEXT_PARAM}=${encodeURIComponent(next)}`
    : authPath;
}
