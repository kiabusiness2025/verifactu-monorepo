import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL === '1';
const useStandalone = process.env.STANDALONE_BUILD === '1';

const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, '..', '..'),
  outputFileTracingExcludes: {
    '*': [
      '**/node_modules/@opentelemetry/api/**',
      '**/node_modules/client-only/**',
      '**/node_modules/server-only/**',
    ],
  },
  ...(useStandalone && !isVercel ? { output: 'standalone' } : {}),
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@verifactu/ui', '@verifactu/utils', '@verifactu/db'],
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
