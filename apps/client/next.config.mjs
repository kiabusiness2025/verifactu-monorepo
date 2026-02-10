import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL === "1";

const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "..", ".."),
  outputFileTracingExcludes: {
    "*": [
      "**/node_modules/@opentelemetry/api/**",
      "**/node_modules/client-only/**",
      "**/node_modules/server-only/**",
    ],
  },
  ...(isVercel ? {} : { output: "standalone" }),
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@verifactu/ui", "@verifactu/utils", "@verifactu/db", "@verifactu/core"],
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": __dirname,
      "@verifactu/db": path.resolve(__dirname, "../../packages/db"),
    };
    return config;
  },
};

export default nextConfig;
