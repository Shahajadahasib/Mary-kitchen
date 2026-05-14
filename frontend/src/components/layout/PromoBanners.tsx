"use client";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  location: string;
  size: "small" | "medium" | "large" | "extra_large";
}

function fetchBanners(location: string): Promise<Banner[]> {
  return api.get("/banners/", { params: { location } }).then((r) => {
    const data = r.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  });
}

const SIZE_CLASSES: Record<string, string> = {
  small: "h-24 sm:h-32",
  medium: "h-36 sm:h-44 md:h-52",
  large: "h-52 sm:h-64 md:h-80",
  extra_large: "h-64 sm:h-80 md:h-[420px]",
};

function BannerCard({ banner, hero }: { banner: Banner; hero?: boolean }) {
  const heightClass = hero
    ? (SIZE_CLASSES[banner.size] ?? SIZE_CLASSES.large)
    : (SIZE_CLASSES[banner.size] ?? SIZE_CLASSES.medium);

  const inner = (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 ${heightClass}`}>
      <Image
        src={banner.image}
        alt={banner.title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={hero}
      />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center px-6 md:px-10">
          {banner.title && (
            <h3 className={`font-bold text-white drop-shadow ${hero ? "text-2xl md:text-4xl" : "text-lg md:text-xl"}`}>
              {banner.title}
            </h3>
          )}
          {banner.subtitle && (
            <p className={`text-white/90 mt-1 drop-shadow ${hero ? "text-sm md:text-base" : "text-xs md:text-sm"}`}>
              {banner.subtitle}
            </p>
          )}
          {banner.link && (
            <span className="mt-3 inline-block bg-white text-primary-700 text-xs font-semibold px-4 py-1.5 rounded-full w-fit">
              Shop Now
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (banner.link) {
    return (
      <Link href={banner.link} className="block w-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function HeroBanners() {
  const { data: banners = [] } = useQuery({
    queryKey: ["banners", "hero"],
    queryFn: () => fetchBanners("hero"),
    staleTime: 5 * 60 * 1000,
  });

  if (banners.length === 0) return null;

  return (
    <section className="container-xl pt-6">
      <div className="space-y-3">
        {banners.map((b) => (
          <BannerCard key={b.id} banner={b} hero />
        ))}
      </div>
    </section>
  );
}

export function PromoBanners({ location }: { location: "top" | "middle" | "bottom" }) {
  const { data: banners = [] } = useQuery({
    queryKey: ["banners", location],
    queryFn: () => fetchBanners(location),
    staleTime: 5 * 60 * 1000,
  });

  if (banners.length === 0) return null;

  return (
    <section className="container-xl py-4">
      <div className={`grid gap-4 ${banners.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {banners.map((b) => (
          <BannerCard key={b.id} banner={b} />
        ))}
      </div>
    </section>
  );
}
