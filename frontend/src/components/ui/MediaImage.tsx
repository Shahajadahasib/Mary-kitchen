import Image, { type ImageProps } from "next/image";
import { absoluteMediaUrl, isLoopbackMedia } from "@/lib/media";

type Props = Omit<ImageProps, "src"> & {
  /** A backend media path or URL. Renders nothing when null/empty. */
  src: string | null | undefined;
};

/**
 * `next/image` for anything served by the Django backend.
 *
 * Two things every backend image needs, in one place rather than at fifteen
 * call sites: the path is resolved against the API origin, and images on a
 * loopback origin skip the optimiser — see `isLoopbackMedia` for why they have
 * to. Callers that render a placeholder when there is no image should keep
 * doing their own null check; this returns null as a backstop.
 */
export default function MediaImage({ src, alt, ...rest }: Props) {
  const resolved = absoluteMediaUrl(src);
  if (!resolved) return null;
  return (
    <Image
      {...rest}
      src={resolved}
      alt={alt}
      unoptimized={isLoopbackMedia(resolved)}
    />
  );
}
