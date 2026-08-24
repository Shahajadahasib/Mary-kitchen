import { FileText } from "lucide-react";

export const metadata = { title: "Terms of Service | Mary Kitchen" };

const sections = [
    {
        title: "1. Acceptance of Terms",
        content: [
            "By accessing or using Mary Kitchen's website and services, you agree to be bound by these Terms of Service.",
            "If you do not agree to these terms, please do not use our services.",
            "We reserve the right to update these terms at any time. Continued use of the service constitutes acceptance.",
        ],
    },
    {
        title: "2. Ordering & Payment",
        content: [
            "All orders are subject to availability at the time of checkout.",
            "Prices displayed are in Australian Dollars (AUD) and include GST.",
            "Payment must be made in full at the time of ordering via our secure Stripe payment gateway.",
            "We reserve the right to cancel any order if payment cannot be processed or if a product is unavailable.",
            "You will receive an email confirmation once your order is placed.",
        ],
    },
    {
        title: "3. Delivery & Collection",
        content: [
            "Delivery is available within a 25 km radius of our Winnellie store.",
            "Delivery times are estimates only and may vary due to traffic or demand.",
            "You must be available to receive your delivery at the nominated address.",
            "Click & Collect orders must be picked up within 24 hours of the ready notification.",
            "Mary Kitchen is not responsible for orders left unattended after successful delivery.",
        ],
    },
    {
        title: "4. Refund & Returns Policy",
        content: [
            "If you receive a damaged, incorrect, or spoiled item, please contact us within 24 hours with a photo.",
            "Refunds or replacements are offered at our discretion for eligible claims.",
            "Change-of-mind refunds are not available for perishable food items once packed.",
            "Non-perishable items may be returned within 7 days in their original, unopened condition.",
            "Delivery fees are non-refundable once an order has been dispatched.",
        ],
    },
    {
        title: "5. User Responsibilities",
        content: [
            "You must provide accurate and current information when creating an account.",
            "You are responsible for maintaining the security of your account credentials.",
            "You must not use the platform for any unlawful purpose.",
            "You must not submit false reviews or impersonate other users.",
            "Any abuse of the platform may result in account suspension or termination.",
        ],
    },
    {
        title: "6. Product Information",
        content: [
            "We make every effort to ensure product descriptions and images are accurate.",
            "Actual product packaging and weight may vary slightly from images displayed.",
            "Nutritional information, where provided, is for general guidance only.",
            "Customers with allergies should contact us before ordering.",
        ],
    },
    {
        title: "7. Limitation of Liability",
        content: [
            "Mary Kitchen's liability is limited to the value of the order placed.",
            "We are not liable for indirect, incidental, or consequential losses.",
            "We do not guarantee uninterrupted access to the website.",
        ],
    },
    {
        title: "8. Governing Law",
        content: [
            "These terms are governed by the laws of the Northern Territory, Australia.",
            "Any disputes shall be resolved in the courts of the Northern Territory.",
            "For questions, contact us at: hello@marykitchen.com.au",
        ],
    },
];

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-primary-700 text-white py-16">
                <div className="container-xl text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3">
                        Terms of Service
                    </h1>
                    <p className="text-primary-100">
                        Last updated: January 2026
                    </p>
                </div>
            </div>

            <div className="container-xl py-14">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <p className="text-gray-600 leading-relaxed">
                            These Terms of Service govern your use of Mary
                            Kitchen&apos;s website and services. Please read
                            them carefully before placing an order. These terms
                            apply to all users of the site.
                        </p>
                    </div>

                    {sections.map((section) => (
                        <div
                            key={section.title}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7"
                        >
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                {section.title}
                            </h2>
                            <ul className="space-y-2">
                                {section.content.map((item, i) => (
                                    <li
                                        key={i}
                                        className="text-sm text-gray-600 leading-relaxed flex items-start gap-2"
                                    >
                                        <span className="text-primary-500 mt-1 flex-shrink-0">
                                            •
                                        </span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
