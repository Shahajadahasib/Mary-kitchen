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
        // A terracotta-leaning orange: hue sits near 17° rather than the 25°
        // of a plain safety-orange, which is what keeps it away from fast-food
        // signage. Saturation is deliberately high through the middle of the
        // scale — an earlier pass sat lower and read as though a little black
        // had been mixed in, which is exactly what you notice on a large field
        // like the restaurant header.
        //
        // Contrast against white: 600 → 3.47:1, 700 → 4.96:1. Small white text
        // belongs on 700; 600 is for large labels, headers and icon fills. That
        // is a deliberate trade of contrast for warmth, matching what the site
        // shipped with before the palette work.
        brand: {
          50: "#fff8f4",
          100: "#ffece1",
          200: "#ffd6bf",
          300: "#ffb894",
          400: "#fb9160",
          500: "#f56f36",
          600: "#ec5a1d",
          700: "#c4460f",
          800: "#9d3a13",
          900: "#7e3116",
          950: "#451309",
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
