import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Fresh Groceries & Food Products",
    description:
        "Shop fresh fish, meats, vegetables, rice and grains online. Delivered across Darwin NT Australia.",
};

const ProductsLayout = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};

export default ProductsLayout;
