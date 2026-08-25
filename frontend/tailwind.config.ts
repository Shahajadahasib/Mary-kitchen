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
        // The warm accent — the restaurant storefront's primary colour, and the
        // grocery shop's secondary (sale badges, the search button).
        //
        // This used to be a plain safety-orange (#f2820f / #e36309). Two
        // problems with it: white text on `brand-600` measured 3.47:1, under
        // the 4.5:1 AA floor for the buttons it was used on, and a pure orange
        // reads closer to fast-food signage than to a kitchen. The scale below
        // is a spiced terracotta — the hue drifts warm-golden at the light end
        // (~28°) and deep brick at the dark end (~10°), which is what keeps a
        // warm ramp from looking flat.
        //
        // Contrast against white, measured: 600 → 4.70:1, 700 → 6.48:1. Use
        // 600 or darker behind white text; 400/500 are for tints, badges on
        // dark, and decorative accents only.
        brand: {
          50: "#fef6f0",
          100: "#fde9dc",
          200: "#fbd0b6",
          300: "#f7ae86",
          400: "#f1834f",
          500: "#e85f28",
          600: "#cf4318",
          700: "#ac3316",
          800: "#8b2b18",
          900: "#722617",
          950: "#3e0f08",
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
