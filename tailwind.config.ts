import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        djp: {
          navy: "#0A2540",
          yellow: "#FFC72C",
          blue: "#0066CC",
          gold: "#E5A823",
          light: "#F4F6F8",
          dark: "#061826"
        }
      }
    },
  },
  plugins: [],
};
export default config;
