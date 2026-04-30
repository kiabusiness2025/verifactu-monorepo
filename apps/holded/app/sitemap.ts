import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

const routes = [
  '/conectores',
  '/conectores/docs',
  '/conectores/privacy',
  '/conectores/dpa',
  '/conectores/soporte',
  '/conectores/chatgpt',
  '/conectores/chatgpt/docs',
  '/conectores/chatgpt/privacy',
  '/conectores/chatgpt/dpa',
  '/conectores/chatgpt/soporte',
  '/conectores/claude',
  '/conectores/claude/docs',
  '/conectores/claude/privacy',
  '/conectores/claude/dpa',
  '/conectores/claude/soporte',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '/conectores' ? 'weekly' : 'monthly',
    priority: route === '/conectores' ? 1 : 0.65,
  }));
}
