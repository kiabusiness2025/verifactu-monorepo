import './config.js';
import { createApp, startServer } from './app.js';

const app = createApp();

// Standalone (Railway, local, `node dist/index.js`): abrimos el listener.
// En Vercel se importa el `export default` y la plataforma lo envuelve como
// funcion serverless — alli NO se hace listen (Vercel inyecta VERCEL=1).
if (!process.env.VERCEL) {
  startServer(app);
}

export default app;
