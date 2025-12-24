/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output tracing for Vercel
  output: 'standalone',
  // Production configuration
  poweredByHeader: false,
  compress: true,
};
export default nextConfig;