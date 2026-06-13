import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Fresh Groceries & Food Products Darwin NT",
    description:
        "Shop fresh fish, seafood, meats, vegetables, rice and grains online. Fast delivery across Darwin NT, Palmerston, Casuarina and surrounding suburbs.",
    alternates: {
        canonical: "https://marybenskitchen.com/products",
    },
};

const ProductsLayout = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};

export default ProductsLayout;
