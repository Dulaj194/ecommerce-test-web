import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Turbopack resolves CSS @import paths from the monorepo root
      // (ecommere/) instead of frontend/node_modules. This alias forces
      // it to find tailwindcss in the correct location.
      tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
    },
  },
};

export default nextConfig;
