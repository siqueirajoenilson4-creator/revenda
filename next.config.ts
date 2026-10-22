import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Volta a uma aba já vista sem esperar o servidor (as gravações limpam esse cache).
    staleTimes: { dynamic: 30 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
