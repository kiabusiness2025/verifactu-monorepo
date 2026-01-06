export default {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@verifactu/ui'],
  i18n: {
    locales: ['es'],
    defaultLocale: 'es',
  },
};
