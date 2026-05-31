/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode using the 'class' strategy
  theme: {
    extend: {
      colors: {
        border: "#8B8B8B",
        input: "transparent",
        ring: "#D4AF37",
        background: "#0B0B0B",
        foreground: "#F5F5F5",
        primary: {
          DEFAULT: "#D4AF37", // Luxury Gold
          foreground: "#0B0B0B",
        },
        secondary: {
          DEFAULT: "#1A1A1A",
          foreground: "#F5F5F5",
        },
        destructive: {
          DEFAULT: "#d4183d",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1A1A1A",
          foreground: "#C0C0C0",
        },
        accent: {
          DEFAULT: "#6E4B1F",
          foreground: "#F5F5F5",
        },
        popover: {
          DEFAULT: "#1A1A1A",
          foreground: "#F5F5F5",
        },
        card: {
          DEFAULT: "#1A1A1A",
          foreground: "#F5F5F5",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "soft-float": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)", opacity: "0.75" },
          "50%": { transform: "translate3d(0, -12px, 0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "soft-float": "soft-float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}