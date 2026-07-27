import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#03254C",
        navyDeep: "#021A38",
        teal: "#00F5D4",
        blush: "#FF8FA3",
      },
      fontFamily: {
        display: ["var(--font-poppins)"],
        body: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
};
export default config;
