import Link from "next/link";
import Image from "next/image";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    product_count: number;
  };
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/products?category=${category.slug}`}
      className="flex flex-col items-center gap-2 group cursor-pointer">
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-primary-100 to-primary-50 border border-primary-100 group-hover:shadow-md transition-shadow">
        {category.image ? (
          <div className="relative w-full h-full">
            <Image src={category.image} alt={category.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🥦</div>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-700 text-center group-hover:text-primary-700 line-clamp-2">{category.name}</p>
    </Link>
  );
}
