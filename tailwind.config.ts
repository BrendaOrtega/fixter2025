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
        bannerOne: "url('/bannerCursos.png')",
        bannerHome: "url('/bannerHome.png')",
        heroHome: "url('/HeroHome.svg')",
        hero: "url('/hero.png')",
        heroMobile: "url('/hero-mobile.png')",
        animationsBanner: "url('/bannerAnimations.svg')",
        animationsBannerMobile: "url('/bannerAnimationsMobile.svg')",
        planet: "url('/planet.png')",
        author: "url('/author.svg')",
        heroCourses: "url('/heroCourses.svg')",
        heroProfile: "url('/heroProfile.svg')",
        postbg: "url('/postbg.png')",
        bloob: "url('/bloob.svg')",
        avatar: "url('/avatar-default.png')",
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
      keyframes: {
        shine: {
          "0%": { "background-position": "100%" },
          "100%": { "background-position": "-100%" },
        },
        scroll: {
          to: {
            transform: "translate(calc(-50% - 0.5rem))",
          },
        },
        rotate: {
          "0%": { rotate: "0deg" },
          "25%": { rotate: "6deg" },
          "50%": { rotate: "0deg" },
          "75%": { rotate: "-6deg" },
          "100%": { rotate: "0deg" },
        },
      },
      animation: {
        rotate: "rotate 4s infinite linear",
        shine: "shine 5s linear infinite",
        scroll:
          "scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
} satisfies Config;
