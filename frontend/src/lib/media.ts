/**
 * Turn a relative media path or API-relative URL into an absolute URL for <Image src />.
 * Prefer backend `image_url` when present; use this for legacy `image` paths.
 */
export function absoluteMediaUrl(urlOrPath: string | null | undefined): string | null {
  if (urlOrPath == null || urlOrPath === "") return null;
  const s = String(urlOrPath).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  // Locally-created previews (a file the user just picked in an admin form)
  // and inlined images are already complete references — prefixing them with
  // the API origin turns a working preview into a broken one.
  if (s.startsWith("blob:") || s.startsWith("data:")) return s;
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const origin = api.replace(/\/api\/v1\/?$/i, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${origin}${path}`;
}

/**
 * True when a media URL points at a loopback address.
 *
 * This matters because `next/image` optimises on the *server*. In development
 * the API is at `http://localhost:8000`, and when the frontend runs in its own
 * container `localhost` is that container — so the optimiser's fetch is
 * refused and the route answers 500, which the browser renders as a broken
 * image. The browser itself has no such problem: on the developer's machine
 * `localhost:8000` really is the backend.
 *
 * So loopback media bypasses the optimiser and is fetched directly by the
 * browser. In production the backend returns URLs on the public domain, which
 * the optimiser can reach, so nothing changes there.
 */
export function isLoopbackMedia(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(url);
}
