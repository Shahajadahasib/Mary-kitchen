import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mary Kitchen – Fresh Groceries & Food | Darwin NT",
  description:
    "Order fresh groceries, fish, meat, and more online. Fast delivery across Darwin NT. Mary Kitchen – your local food marketplace.",
  keywords: "groceries, food, delivery, Darwin, NT, fish, meat, vegetables",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
