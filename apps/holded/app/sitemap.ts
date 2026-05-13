import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

const routes = [
  '/',
  '/conectores',
  '/conectores/docs',
  '/conectores/privacy',
  '/conectores/dpa',
  '/conectores/soporte',
  '/terms',
  '/privacy',
  '/dpa',
  '/support',
  '/demo-recording',
  '/conectores/chatgpt',
  '/conectores/chatgpt/docs',
  '/conectores/chatgpt/privacy',
  '/conectores/chatgpt/terms',
  '/conectores/chatgpt/dpa',
  '/conectores/chatgpt/soporte',
  '/conectores/chatgpt/openai-review-demo',
  '/conectores/claude',
  '/conectores/claude/docs',
  '/conectores/claude/privacy',
  '/conectores/claude/terms',
  '/conectores/claude/dpa',
  '/conectores/claude/soporte',
  '/conectores/claude/demo',
];

// Paginas de alta prioridad: los dos conectores principales son la entrada
// comercial del hub. Su prioridad debe equipararse a /conectores (0.95) y no
// quedar al nivel de las paginas legales/soporte (0.65). Las paginas de demo
// tambien suben porque son CTA dentro del flujo de conversion.
const HIGH_PRIORITY_ROUTES = new Set([
  '/conectores/claude',
  '/conectores/chatgpt',
  '/conectores/claude/demo',
  '/conectores/chatgpt/openai-review-demo',
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => {
    const priority =
      route === '/'
        ? 1
        : route === '/conectores'
          ? 0.95
          : HIGH_PRIORITY_ROUTES.has(route)
            ? 0.9
            : 0.65;
    const changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] =
      route === '/' || route === '/conectores'
        ? 'weekly'
        : HIGH_PRIORITY_ROUTES.has(route)
          ? 'weekly'
          : 'monthly';
    return {
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency,
      priority,
    };
  });
}
