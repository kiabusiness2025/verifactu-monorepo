# PWA - Progressive Web App

Verifactu Business está configurado como una **Progressive Web App (PWA)**, lo que permite instalarla como una aplicación nativa en dispositivos móviles y de escritorio.

## Características PWA

✅ **Instalable**: Se puede instalar en dispositivos como una app nativa
✅ **Offline**: Funciona sin conexión con contenido cacheado  
✅ **Notificaciones**: Soporte para notificaciones push
✅ **Rápido**: Carga instantánea gracias al service worker
✅ **Responsive**: Adaptado a móvil, tablet y escritorio

## Cómo instalar

### 📱 En Android (Chrome/Edge)

1. Abre https://app.verifactu.business en Chrome
2. Verás un banner de instalación o toca el menú (⋮)
3. Selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"
4. La app se instalará como cualquier otra aplicación

### 🍎 En iOS (Safari)

1. Abre https://app.verifactu.business en Safari
2. Toca el botón de compartir (□↑)
3. Desplázate y selecciona "Añadir a pantalla de inicio"
4. Personaliza el nombre y toca "Añadir"

### 💻 En escritorio (Chrome/Edge)

1. Abre https://app.verifactu.business
2. Busca el icono de instalación (+) en la barra de direcciones
3. Haz clic en "Instalar" cuando aparezca el diálogo
4. La app se abrirá en su propia ventana

## Configuración técnica

### Archivos principales

```
apps/app/
├── public/
│   ├── manifest.json          # Configuración PWA
│   ├── sw.js                  # Service Worker
│   ├── android-chrome-*.png   # Iconos Android
│   └── apple-touch-icon.png   # Icono iOS
├── app/
│   ├── layout.tsx             # Meta tags PWA
│   └── offline/page.tsx       # Página offline
└── components/
    └── PWARegistration.tsx    # Registro del SW
```

### Service Worker (sw.js)

**Estrategias de caché:**
- **API calls**: Network First (intenta red, fallback a caché)
- **Static assets**: Cache First (caché primero, fallback a red)
- **Páginas**: Cache con fallback a /offline

**Caches:**
- `verifactu-static-v1`: Recursos estáticos (HTML, CSS, JS)
- `verifactu-dynamic-v1`: Contenido dinámico (API responses)

### Manifest.json

```json
{
  "name": "Verifactu Business - Gestión Empresarial",
  "short_name": "Verifactu",
  "start_url": "/dashboard?source=pwa",
  "display": "standalone",
  "theme_color": "#0060F0",
  "background_color": "#ffffff"
}
```

## Desarrollo

### Probar PWA localmente

1. Ejecutar en producción mode:
```bash
npm run build
npm run start
```

2. Abrir Chrome DevTools → Application → Service Workers
3. Verificar que el SW esté registrado
4. Probar modo offline

### Limpiar caché

```javascript
// En DevTools Console
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
```

### Actualizar versión

Cuando cambies el SW, incrementa la versión en `sw.js`:

```javascript
const CACHE_NAME = 'verifactu-v2'; // <- Incrementar
```

## Testing

### Lighthouse Audit

1. Abrir Chrome DevTools → Lighthouse
2. Seleccionar "Progressive Web App"
3. Generar reporte
4. **Target**: Score > 90

### PWA Builder

Usa [PWABuilder.com](https://www.pwabuilder.com/) para:
- Validar manifest.json
- Probar service worker
- Generar packages para tiendas (Microsoft Store, etc.)

## Despliegue

### Vercel

Las PWA se despliegan automáticamente. Verifica:

1. `manifest.json` sea accesible en `/manifest.json`
2. `sw.js` se sirva con headers correctos
3. HTTPS esté habilitado (requisito PWA)

### Headers necesarios

```javascript
// next.config.mjs
headers: async () => [
  {
    source: '/sw.js',
    headers: [
      {
        key: 'Service-Worker-Allowed',
        value: '/',
      },
    ],
  },
]
```

## Troubleshooting

### Service Worker no se registra

- Verifica que estés en HTTPS (o localhost)
- Revisa DevTools → Console por errores
- Confirma que `sw.js` sea accesible

### Botón de instalación no aparece

- Espera 5 segundos (delay intencional)
- Verifica `beforeinstallprompt` event en console
- Comprueba que no esté instalado ya

### App no funciona offline

- Verifica que el SW esté activo
- Revisa DevTools → Application → Cache Storage
- Confirma estrategias de caché en `sw.js`

### Cambios no se reflejan

- Incrementa versión de caché en `sw.js`
- Force-refresh (Ctrl+Shift+R / Cmd+Shift+R)
- DevTools → Application → Clear storage

## Referencias

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev PWA](https://web.dev/progressive-web-apps/)
- [Workbox (Google)](https://developers.google.com/web/tools/workbox)
