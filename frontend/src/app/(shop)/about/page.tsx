import { Heart, Leaf, MapPin, ShoppingBag, Truck } from "lucide-react";

export const metadata = { title: "About Us | Mary Kitchen" };

const values = [
    {
        icon: Leaf,
        title: "Fresh Daily",
        desc: "Every product is sourced fresh — from local farms, fish markets and trusted suppliers across the Territory.",
    },
    {
        icon: Truck,
        title: "Fast Delivery",
        desc: "Darwin-wide same-day and next-day delivery. We bring the market to your door, fast.",
    },
    {
        icon: Heart,
        title: "Community First",
        desc: "We're a local Darwin business, built to serve our multicultural community with the food they love.",
    },
    {
        icon: MapPin,
        title: "Darwin Local",
        desc: "Born and raised in Darwin NT. We understand the unique tastes and needs of the Top End community.",
    },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-primary-700 text-white py-10 sm:py-16">
                <div className="container-xl px-4 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl mb-4">
                        <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                        About Mary Kitchen
                    </h1>
                    <p className="text-primary-100 text-sm sm:text-lg max-w-2xl mx-auto">
                        Darwin's local grocery & food marketplace — bringing
                        fresh, diverse food to your door.
                    </p>
                </div>
            </div>

            <div className="container-xl px-4 py-10 sm:py-14 space-y-12 sm:space-y-16">
                {/* Story */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Our Story
                    </h2>
                    <div className="prose prose-gray text-gray-600 space-y-4 text-base leading-relaxed">
                        <p>
                            Mary Kitchen started as a small dream — to make it
                            easier for Darwin's diverse community to access the
                            fresh, authentic ingredients they grew up with.
                            Founded in Winnellie, NT, we quickly grew from a
                            local specialty food supplier into a full-service
                            grocery and food marketplace.
                        </p>
                        <p>
                            Our founder, Mary Ben, a Jollof Rice specialist with
                            deep roots in West African cuisine, noticed a gap in
                            Darwin's market: it was hard to find high-quality
                            African, Asian, and Pacific Island ingredients
                            without travelling far or paying excessive prices.
                            She set out to fix that.
                        </p>
                        <p>
                            Today, Mary Kitchen serves hundreds of Darwin
                            families every week — delivering everything from
                            fresh fish and tropical vegetables to specialty
                            spices and dry goods — with the warmth and
                            reliability of a local family business.
                        </p>
                    </div>
                </div>

                {/* Values */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                        What We Stand For
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center"
                            >
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 rounded-xl mb-4">
                                    <Icon className="w-6 h-6 text-primary-700" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">
                                    {title}
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mission */}
                <div className="bg-primary-700 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold mb-3">
                        Our Mission
                    </h2>
                    <p className="text-primary-100 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        To make fresh, quality, culturally-diverse food
                        accessible to every Darwin household — with honest
                        prices, fast delivery, and the personal touch of a local
                        business that genuinely cares.
                    </p>
                </div>
            </div>
        </div>
    );
}
