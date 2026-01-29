/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@verifactu/ui', '@verifactu/utils', '@verifactu/auth', '@verifactu/integrations'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  i18n: {
    locales: ['es-ES'],
    defaultLocale: 'es-ES',
  },
}

module.exports = nextConfig
