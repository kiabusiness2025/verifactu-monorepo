const isVercel = process.env.VERCEL === '1';

const nextConfig = {
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

// Workflow integration will be handled by Workflow DevKit plugin
// The "use workflow" and "use step" directives are processed automatically
// when workflow package is installed and configured in package.json

export default nextConfig;
