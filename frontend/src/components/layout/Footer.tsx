"use client";

import Link from "next/link";
import { ShoppingBag, MapPin, Phone, Mail, Shield } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const SHOP_LINKS = [
  { label: "All Products", href: "/products" },
  { label: "Fish & Seafood", href: "/products?category=fish-seafood" },
  { label: "Meat & Poultry", href: "/products?category=meat-poultry" },
  { label: "Vegetables", href: "/products?category=vegetables" },
  { label: "Rice & Grains", href: "/products?category=rice-grains" },
];

const ACCOUNT_LINKS_GUEST = [
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
];

const ACCOUNT_LINKS_AUTH = [
  { label: "My Orders", href: "/orders" },
  { label: "My Profile", href: "/profile" },
  { label: "Wishlist", href: "/profile#wishlist" },
];

const INFO_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Delivery Info", href: "/delivery" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact Us", href: "/contact" },
];

export default function Footer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // hasHydrated prevents a SSR/client mismatch: render guest links on both
  // server and first client paint, then swap once localStorage is read.
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accountLinks =
    hasHydrated && isAuthenticated ? ACCOUNT_LINKS_AUTH : ACCOUNT_LINKS_GUEST;

  return (
    <footer className="bg-gray-900 text-gray-300 pt-14 pb-6 mt-auto">
      <div className="container-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Column 1 — Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <ShoppingBag className="w-6 h-6 text-primary-400" /> Mary Kitchen
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              Your local Darwin grocery & food marketplace. Fresh products delivered to your door.
            </p>
            <div className="space-y-2.5 text-sm">
              <p className="flex items-start gap-2 text-gray-400">
                <MapPin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                8/63 Winnellie Rd, Winnellie NT 0820
              </p>
              <a href="tel:0449529923" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-primary-400" /> 0449 529 923
              </a>
              <a href="mailto:hello@marykitchen.com.au" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-primary-400" /> hello@marykitchen.com.au
              </a>
            </div>
          </div>

          {/* Column 2 — Shop */}
          <div>
            <h3 className="font-semibold text-white mb-4">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Account */}
          <div>
            <h3 className="font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-2.5 text-sm">
              {accountLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Information */}
          <div>
            <h3 className="font-semibold text-white mb-4">Information</h3>
            <ul className="space-y-2.5 text-sm">
              {INFO_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Mary Kitchen. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>Secure payments by</span>
            <span className="font-bold text-white">Stripe</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
