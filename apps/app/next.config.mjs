const isVercel = process.env.VERCEL === '1';

export default {
  ...(isVercel ? {} : { output: 'standalone' }),
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@verifactu/ui'],
  i18n: {
    locales: ['es'],
    defaultLocale: 'es',
  },
};
