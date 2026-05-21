/**
 * Bloque de ayuda reutilizable para el campo "API key de Holded".
 *
 * Pensado para usuarios que no conocen Holded: explica en lenguaje llano qué
 * es una API key y los pasos exactos para generarla, sin sacar al usuario del
 * formulario (es un `<details>` desplegable, sin JS). Se usa en los
 * formularios de conexión de ambos conectores (Claude y ChatGPT).
 */

const HOLDED_API_KEY_HELP_URL =
  'https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded';

type Accent = 'amber' | 'emerald';

const ACCENT_TEXT: Record<Accent, string> = {
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
};

export function HoldedApiKeyHelp({ accent = 'amber' }: { accent?: Accent }) {
  const accentText = ACCENT_TEXT[accent];
  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-600">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-2 font-semibold ${accentText}`}
      >
        <span>¿Qué es la API key y de dónde la saco?</span>
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-2.5 space-y-2.5">
        <p>
          Es una <strong>clave que autoriza esta conexión a leer tu Holded</strong> — como una
          contraseña solo para esta integración. No es tu contraseña de Holded y puedes anularla
          cuando quieras desde Holded.
        </p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Entra en tu cuenta de Holded.</li>
          <li>
            Abre <strong>Configuración</strong> (arriba a la derecha).
          </li>
          <li>
            Ve a <strong>Integraciones → API</strong>.
          </li>
          <li>
            Pulsa <strong>Nueva API key</strong>, cópiala y pégala aquí.
          </li>
        </ol>
        <a
          href={HOLDED_API_KEY_HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-block font-semibold underline underline-offset-2 ${accentText}`}
        >
          Guía oficial de Holded, con capturas →
        </a>
      </div>
    </details>
  );
}
