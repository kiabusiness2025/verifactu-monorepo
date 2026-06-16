# IsaakConnecting — Animación de espera orbital

Componente de loading que muestra el avatar de Isaak en el centro de un sistema solar animado. Se usa en todas las integraciones mientras se cargan datos o se procesa una conexión.

## Uso

```tsx
import { IsaakConnecting } from '@/app/components/IsaakConnecting';

// Básico — centrado en su contenedor
{
  isLoading && <IsaakConnecting />;
}

// Con clase extra para posicionar
<IsaakConnecting className="my-8" />;
```

## Dónde está activo

| Archivo                                                 | Contexto                                  |
| ------------------------------------------------------- | ----------------------------------------- |
| `app/(workspace)/integrations/IntegrationsV1Client.tsx` | Carga inicial del hub V1 (solo Holded)    |
| `app/(workspace)/integrations/IntegrationsClient.tsx`   | Carga del catálogo completo de conectores |

## Diseño

- **Hub central**: avatar `isaak-avatar-2.png` circular con halo pulsante en azul Isaak
- **Anillo interior**: 8 puntos (4 grandes + 4 pequeños) orbitando en sentido horario, período 22 s
- **Anillo exterior**: 12 puntos (6 grandes + 6 pequeños) orbitando en sentido antihorario, período 34 s
- **Spokes**: 8 líneas de puntos animadas desde el hub hacia fuera, `stroke-dashoffset` con período 8 s
- **Fondo**: grid de puntos radial + glow azul suave

## Archivo fuente del preview standalone

`d:\isaak-main\isaak-conectando.html` — preview local sin servidor Next.js (usa `isaak-avatar.png` en la misma carpeta).

## Assets

| Asset        | Ruta en `public/`                  |
| ------------ | ---------------------------------- |
| Avatar Isaak | `/Personalidad/isaak-avatar-2.png` |

## Ajustar velocidad

Las duraciones de animación están como constantes en el bloque `<style>` interno del componente:

```
ic-ring-i  → ic-spin-cw  22s   (interior, horario)
ic-ring-o  → ic-spin-ccw 34s   (exterior, antihorario)
ic-hr      → ic-hub-ring  5s   (pulso del halo)
ic-dash    →              8s   (flujo de spokes)
```

Para hacerlo más lento, aumenta esos valores. Para más rápido, redúcelos.
