/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output tracing for Vercel
  // output: 'standalone',
  // Production configuration
  poweredByHeader: false,
  compress: true,
  // Clear cache and rebuild - v1.0.1
  onDemandEntries: {
    maxInactiveAge: 1000,
    pagesBufferLength: 2,
  },
};
export default nextConfig;