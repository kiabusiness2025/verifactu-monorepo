/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@verifactu/ui'],
  // Skip linting during builds
  eslint: { ignoreDuringBuilds: true },
  // Production configuration
  poweredByHeader: false,
  compress: true,
  // Clear cache and rebuild - v1.0.1
  onDemandEntries: {
    maxInactiveAge: 1000,
    pagesBufferLength: 2,
  },
  // Webpack configuration para manejar dependencias opcionales
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@opentelemetry/instrumentation-winston');
    }
    return config;
  },
};
export default nextConfig;