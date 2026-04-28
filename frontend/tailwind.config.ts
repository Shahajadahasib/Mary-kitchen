import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef9ee",
          100: "#fef0d3",
          200: "#fcdea5",
          300: "#f9c56d",
          400: "#f5a032",
          500: "#f2820f",
          600: "#e36309",
          700: "#bc4909",
          800: "#963a10",
          900: "#793110",
          950: "#411606",
        },
        primary: {
          DEFAULT: "#1a6b3c",
          50: "#f0fdf5",
          100: "#dcfce8",
          200: "#bbf7d2",
          300: "#86efad",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#1a6b3c",
          800: "#166534",
          900: "#14532d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
