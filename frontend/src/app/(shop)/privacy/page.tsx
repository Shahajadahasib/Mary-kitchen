import { Shield } from "lucide-react";

export const metadata = { title: "Privacy Policy | Mary Kitchen" };

const sections = [
    {
        title: "1. Information We Collect",
        content: [
            "Personal identification information: name, email address, phone number, and delivery address when you register or place an order.",
            "Payment information: processed securely through Stripe. We do not store card numbers on our servers.",
            "Order history and cart data to improve your shopping experience.",
            "Device and browser information (IP address, browser type) for security and analytics.",
        ],
    },
    {
        title: "2. How We Use Your Information",
        content: [
            "To process and fulfil your orders, including delivery notifications.",
            "To send transactional emails (order confirmation, delivery updates).",
            "To respond to customer service enquiries.",
            "To improve our website, products, and services.",
            "To comply with legal obligations under Australian law.",
        ],
    },
    {
        title: "3. Payment Security",
        content: [
            "All payments are processed by Stripe, a PCI-DSS Level 1 certified payment provider.",
            "Mary Kitchen never stores your full credit card details on our systems.",
            "All payment data is encrypted using TLS/SSL technology.",
            "Stripe's privacy policy governs how your payment information is handled: stripe.com/privacy.",
        ],
    },
    {
        title: "4. Sharing Your Information",
        content: [
            "We do not sell, rent, or trade your personal data to third parties.",
            "We may share data with trusted service providers (delivery partners, email services) strictly to fulfil your order.",
            "We may disclose data if required by law or a court order.",
        ],
    },
    {
        title: "5. Cookies",
        content: [
            "We use cookies to maintain your session and shopping cart.",
            "Analytics cookies (anonymous) help us understand how visitors use the site.",
            "You can disable cookies in your browser settings, but some features may not work correctly.",
        ],
    },
    {
        title: "6. Data Retention",
        content: [
            "We retain your account data for as long as your account is active.",
            "Order history is retained for 7 years for accounting and tax compliance.",
            "You may request deletion of your personal data at any time by contacting us.",
        ],
    },
    {
        title: "7. Your Rights",
        content: [
            "Access: You may request a copy of all personal data we hold about you.",
            "Correction: You can update your personal information from your account profile.",
            "Deletion: You can request account deletion by contacting hello@marykitchen.com.au.",
            "Portability: You may request your data in a machine-readable format.",
        ],
    },
    {
        title: "8. Contact",
        content: [
            "For privacy-related enquiries, contact us at: hello@marykitchen.com.au",
            "Mary Kitchen, 8/63 Winnellie Rd, Winnellie NT 0820, Australia.",
        ],
    },
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-primary-700 text-white py-16">
                <div className="container-xl text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
                    <p className="text-primary-100">
                        Last updated: January 2026
                    </p>
                </div>
            </div>

            <div className="container-xl py-14">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
                        <p className="text-gray-600 leading-relaxed">
                            Mary Kitchen (&quot;we&quot;, &quot;us&quot;,
                            &quot;our&quot;) is committed to protecting your
                            privacy. This policy explains how we collect, use,
                            and safeguard your personal information when you use
                            our website and services. By using Mary Kitchen, you
                            agree to the terms of this policy.
                        </p>
                    </div>

                    <div className="space-y-6">
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
        </div>
    );
}
