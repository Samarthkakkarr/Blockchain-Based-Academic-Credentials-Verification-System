/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        ink: {
          DEFAULT: "#14213D",
          light: "#2B3A5C",
          muted: "#5B6B8C",
        },
        seal: {
          DEFAULT: "#0F5C52",
          light: "#E4F0EE",
          dark: "#0A3F38",
        },
        rule: "#E3E0D6",
        amber: {
          DEFAULT: "#B45309",
          light: "#FBEBD9",
        },
        danger: {
          DEFAULT: "#9F1D22",
          light: "#FBE7E6",
        },
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 33, 61, 0.06), 0 1px 0 rgba(20, 33, 61, 0.04)",
      },
    },
  },
  plugins: [],
};
