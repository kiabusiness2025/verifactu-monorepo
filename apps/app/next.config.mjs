const isVercel = process.env.VERCEL === '1';

export default {
  ...(isVercel ? {} : { output: 'standalone' }),
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@verifactu/ui', '@verifactu/utils'],
  i18n: {
    locales: ['es'],
    defaultLocale: 'es',
  },
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
        {
          key: 'Service-Worker-Allowed',
          value: '/',
        },
      ],
    },
  ],
};
