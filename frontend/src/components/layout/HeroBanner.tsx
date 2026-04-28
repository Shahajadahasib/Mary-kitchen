import Link from "next/link";
import { ArrowRight, Truck } from "lucide-react";

export default function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
      }} />
      <div className="container-xl py-14 relative">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 w-fit mb-5 text-sm font-medium">
            <Truck className="w-4 h-4 text-brand-300" />
            <span>Fast delivery across Darwin NT</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
            Fresh Groceries &<br />
            <span className="text-brand-300">Food Delivered</span>
          </h1>
          <p className="text-lg text-primary-100 mb-8 max-w-lg">
            Shop fresh fish, quality meats, vegetables, rice, and more. Quality products from Darwin's local food marketplace.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/products" className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-lg">
              Shop Now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/products?category=fish-seafood" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-3 rounded-xl transition-colors border border-white/20">
              Fresh Fish Today
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
