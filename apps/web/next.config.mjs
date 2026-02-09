import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allowedOrigins = (process.env.NEXT_SERVER_ACTIONS_ALLOWED_ORIGINS ?? (process.env.NODE_ENV === "production" ? "" : "localhost:3000"))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@botghost/shared"],
  experimental: {
    serverActions: { allowedOrigins },
    externalDir: true
  },
  webpack: (config) => {
    config.resolve.alias["@botghost/shared"] = path.resolve(__dirname, "../../packages/shared/src");
    return config;
  }
};

export default nextConfig;

