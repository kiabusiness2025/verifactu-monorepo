/** @type {import('next').NextConfig} */
const nextConfig = {
  // Asegurar que usa App Router
  experimental: {},
  // Output tracing para Vercel
  output: 'standalone',
  // Configuración para producción
  poweredByHeader: false,
  compress: true,
};
export default nextConfig;