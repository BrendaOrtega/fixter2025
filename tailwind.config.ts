import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          100: "#DAE8E5",
          500: "#85DDCB",
          700: "#37AB93",
          800: "#186656",
          900: "#19262A",
        },
        background: "#0E1317",
        colorOutline: "#2C3944",
        colorParagraph: "#B7B9BA",
        backface: "#182128",
        colorCaption: "#8D9194",
        surface: "#2C3944",
      },
      backgroundImage: {
        stars: "url('/stars.png')",
        card: "url('/card.png')",
        bannerOne: "url('/Banner.svg')",
        hero: "url('/hero.png')",
      },
      fontFamily: {
        sans: [
          '"Inter"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
