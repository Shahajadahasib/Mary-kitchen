import Link from "next/link";
import { MapPin, Phone, Clock, ExternalLink, ShoppingBag, UtensilsCrossed, Leaf, Users, Package, Truck } from "lucide-react";

const BUSINESS = {
  name: "Mary Ben's Kitchen",
  tagline: "Jollof Rice Specialists",
  rating: 4.5,
  reviewCount: 145,
  priceRange: "$20–$40",
  cuisine: "West African",
  addressStreet: "8/63 Winnellie Rd",
  addressLocality: "Winnellie NT 0820",
  phone: "0449 529 923",
  hours: { status: "Closed now", next: "Opens 11:00 AM Wednesday" },
  services: [
    { label: "All-you-can-eat", icon: UtensilsCrossed },
    { label: "Outdoor seating", icon: Users },
    { label: "Vegetarian options", icon: Leaf },
    { label: "Order collection", icon: Package },
    { label: "Order delivery", icon: Truck },
  ],
  mapsUrl: "https://maps.google.com/?q=8%2F63+Winnellie+Rd+Winnellie+NT+0820",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= Math.floor(rating);
        const half = !filled && s === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <svg key={s} className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            {filled ? (
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" />
            ) : half ? (
              <>
                <defs>
                  <linearGradient id={`half-${s}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#e5e7eb" />
                  </linearGradient>
                </defs>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={`url(#half-${s})`} stroke="#f59e0b" strokeWidth="1" />
              </>
            ) : (
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1" />
            )}
          </svg>
        );
      })}
    </div>
  );
}

export default function RestaurantInfo() {
  return (
    <section className="bg-white border-t border-b border-gray-100 py-12">
      <div className="container-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{BUSINESS.name}</h2>
                <p className="text-primary-700 font-medium">{BUSINESS.tagline}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={BUSINESS.rating} />
                    <span className="font-bold text-gray-800">{BUSINESS.rating}</span>
                    <span className="text-sm text-gray-500">({BUSINESS.reviewCount} Google reviews)</span>
                  </div>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-600">{BUSINESS.priceRange}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-600">{BUSINESS.cuisine}</span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Services</h3>
              <div className="flex flex-wrap gap-2">
                {BUSINESS.services.map(({ label, icon: Icon }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium border border-primary-100">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Phone className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Phone</p>
                  <a href={`tel:${BUSINESS.phone}`} className="text-sm text-primary-700 hover:underline font-medium">{BUSINESS.phone}</a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Clock className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Hours</p>
                  <p className="text-sm font-semibold text-red-500">{BUSINESS.hours.status}</p>
                  <p className="text-xs text-gray-500">{BUSINESS.hours.next}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href={BUSINESS.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-primary-700 text-primary-700 hover:bg-primary-700 hover:text-white rounded-lg font-semibold text-sm transition-all"
              >
                <MapPin className="w-4 h-4" /> Get Directions
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`tel:${BUSINESS.phone}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 rounded-lg font-semibold text-sm transition-all"
              >
                <Phone className="w-4 h-4" /> Call Now
              </a>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-semibold text-sm transition-all"
              >
                <ShoppingBag className="w-4 h-4" /> Order Now
              </Link>
            </div>
          </div>

          {/* Right — Map */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-full min-h-64">
              <iframe
                title="Mary Kitchen Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3717.5!2d130.8456!3d-12.4634!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDI3JzQ4LjIiUyAxMzDCsDUwJzQ0LjIiRQ!5e0!3m2!1sen!2sau!4v1600000000000!5m2!1sen!2sau"
                width="100%"
                height="100%"
                style={{ minHeight: "280px", border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
