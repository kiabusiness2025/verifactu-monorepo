import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    provider: 'postgresql',
    url: env('DIRECT_DATABASE_URL'),
  },
});
