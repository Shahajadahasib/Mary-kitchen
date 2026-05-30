import { Truck, Package, MapPin, Clock, DollarSign, CheckCircle } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Delivery Info | Mary Kitchen" };

const zones = [
  { name: "Darwin CBD & Surrounds", radius: "0–10 km", fee: "$30.00", time: "Same day / 4–8 hrs" },
  { name: "Palmerston & Suburbs", radius: "10–18 km", fee: "$40.00", time: "Same day / 8–12 hrs" },
  { name: "Outer Darwin Area", radius: "18–25 km", fee: "$50.00", time: "Next day" },
];

export default function DeliveryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-700 text-white py-16">
        <div className="container-xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Delivery Information</h1>
          <p className="text-primary-100 text-lg">Everything you need to know about how we get your order to you.</p>
        </div>
      </div>

      <div className="container-xl py-14 space-y-12">
        {/* Delivery Zones */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary-700" /> Delivery Zones
          </h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-primary-50">
                <tr>
                  {["Zone", "Radius from Store", "Delivery Fee", "Estimated Time"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-semibold text-primary-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {zones.map((z) => (
                  <tr key={z.name} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">{z.name}</td>
                    <td className="px-5 py-4 text-gray-600">{z.radius}</td>
                    <td className="px-5 py-4 font-semibold text-primary-700">{z.fee}</td>
                    <td className="px-5 py-4 text-gray-600">{z.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> We currently deliver within a 25 km radius of our Winnellie store.
          </p>
        </div>

        {/* Delivery vs Pickup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Home Delivery</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                "Order online and we deliver to your door",
                "Real-time order tracking",
                "Minimum order value: $80",
                "Delivery fee based on zone (see table above)",
                "Available 7 days a week",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Click & Collect (Pickup)</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                "Order online, pick up in-store — always free",
                "Ready within 1–2 hours of ordering",
                "Pick up from: 8/63 Winnellie Rd, Winnellie NT",
                "No minimum order for pickup",
                "Great for large or heavy orders",
                "Open Mon–Sun 9:00 AM – 5:00 PM",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Fees */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-7">
          <h3 className="font-bold text-amber-900 text-lg flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5" /> Delivery Fee Policy
          </h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>• Delivery fee is calculated at checkout based on your delivery address.</li>
            <li>• Orders over <strong>$100</strong> receive <strong>free delivery</strong> within all zones.</li>
            <li>• Delivery fees are non-refundable once your order has been dispatched.</li>
          </ul>
        </div>

        <div className="text-center">
          <p className="text-gray-500 mb-4">Ready to order?</p>
          <Link href="/products" className="btn-primary inline-flex items-center gap-2">
            <Truck className="w-4 h-4" /> Shop Now
          </Link>
        </div>
      </div>
    </div>
  );
}
