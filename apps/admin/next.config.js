const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@verifactu/ui', '@verifactu/utils', '@verifactu/auth', '@verifactu/integrations', '@verifactu/db'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': __dirname,
    }
    return config
  },
}

module.exports = nextConfig
