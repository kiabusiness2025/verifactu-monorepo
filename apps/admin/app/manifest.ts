import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Verifactu Admin',
    short_name: 'Verifactu Admin',
    description: 'Panel interno para observar usuarios, tenants y actividad operativa de Verifactu.',
    start_url: '/panel',
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
