import VisitTracker from "@/components/analytics/VisitTracker";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/layout/ScrollToTop";

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <ScrollToTop />
            <VisitTracker />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
