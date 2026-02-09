import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0e14",
        fog: "#e7e4df",
        ember: "#ff6b3d",
        sky: "#7dd3fc",
        moss: "#6ee7b7",
        dusk: "#1f2937"
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui"],
        body: ["var(--font-body)", "system-ui"]
      },
      backgroundImage: {
        "mesh": "radial-gradient(circle at 20% 20%, rgba(255,107,61,0.25), transparent 35%), radial-gradient(circle at 80% 0%, rgba(125,211,252,0.35), transparent 40%), radial-gradient(circle at 50% 80%, rgba(110,231,183,0.25), transparent 45%)"
      },
      boxShadow: {
        glow: "0 0 40px rgba(255,107,61,0.25)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
