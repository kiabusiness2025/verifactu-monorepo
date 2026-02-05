/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@verifactu/ui', '@verifactu/utils', '@verifactu/auth', '@verifactu/integrations', '@verifactu/db'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  i18n: {
    locales: ['es-ES'],
    defaultLocale: 'es-ES',
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
