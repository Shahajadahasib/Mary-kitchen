import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // Height-based variant for laptops with little vertical room, so the
        // single-screen hub can shed padding instead of growing a scrollbar.
        short: { raw: "(max-height: 720px)" },
      },
      colors: {
        // The warm accent — the restaurant storefront's primary colour, and
        // the grocery shop's secondary (sale badges, the search button).
        //
        // A terracotta-leaning orange: hue sits around 17° rather than the 25°
        // of the plain safety-orange this replaced, which is what separates it
        // from fast-food signage, while the lightness stays high enough that
        // large fields of it — the restaurant header, the hero — read warm and
        // appetising rather than brick.
        //
        // Contrast against white, measured: 600 → 3.87:1, 700 → 5.55:1. Put
        // white text below ~18px on 700 or darker; 600 is for larger labels,
        // icon-only fills and accents. 400/500 are tints and decoration only.
        brand: {
          50: "#fff7f1",
          100: "#ffebdd",
          200: "#fed4b8",
          300: "#fbb488",
          400: "#f78d55",
          500: "#f06a2e",
          600: "#dd5620",
          700: "#b93f14",
          800: "#963517",
          900: "#7a2e17",
          950: "#431308",
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
      keyframes: {
        "badge-pop": {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "60%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "dropdown-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Hovering the notification bell rings it. Rotation only — the icon
        // pivots about its top edge (`origin-top`), so the clapper swings.
        "bell-swing": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(12deg)" },
          "40%": { transform: "rotate(-10deg)" },
          "60%": { transform: "rotate(6deg)" },
          "80%": { transform: "rotate(-4deg)" },
        },
      },
      animation: {
        "badge-pop": "badge-pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "dropdown-in": "dropdown-in 160ms cubic-bezier(0.22, 1, 0.36, 1)",
        "bell-swing": "bell-swing 600ms ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
