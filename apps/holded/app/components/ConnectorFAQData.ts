export type FaqItem = {
  q: string;
  a: string;
};

export function buildFaqs(aiName: string, provider: string): FaqItem[] {
  return [
    {
      q: `¿${provider} guarda mis datos de Holded cuando uso el conector?`,
      a: `Las credenciales de Holded nunca llegan a ${aiName}: se guardan cifradas en servidores de Verifactu Business. Para responder, el conector envía a ${aiName} únicamente los fragmentos necesarios dentro de la conversación. El uso de las respuestas y del historial se rige también por las condiciones de ${provider}. Detalles completos en la página de Privacidad y DPA específicos del conector ${aiName}.`,
    },
    {
      q: '¿Funciona con cualquier plan de Holded?',
      a: 'Funciona con cuentas de Holded que tengan la API disponible y permisos suficientes. Normalmente necesitas un plan de pago de Holded y rol Owner o Administrador para generar la API key. El conector hoy cubre facturación, contactos y contabilidad; las consultas sólo devuelven datos si esos módulos están activos en tu cuenta.',
    },
    {
      q: '¿Qué relación tiene el conector con la obligación VeriFactu/AEAT?',
      a: 'El conector es un canal de consulta y borrador en lenguaje natural — no emite facturas, no firma, no envía a la AEAT y no genera registros SIF. El cumplimiento VeriFactu lo sigue gestionando Holded de forma nativa. Crear un borrador en Holded vía conector NO equivale a emitirlo: el borrador queda en estado borrador hasta que tú lo apruebes manualmente en Holded.',
    },
    {
      q: '¿Necesito ser desarrollador para instalarlo?',
      a: `No. Necesitas generar una API key en Holded y pegarla en el flujo seguro de Verifactu. El primer alta tarda menos de 2 minutos y la documentación paso a paso está en /conectores/${aiName.toLowerCase()}/docs.`,
    },
    {
      q: '¿Qué significa "beta" o "acceso controlado"? ¿Es estable?',
      a: 'El conector está operativo y se usa contra cuentas reales de Holded. "Acceso controlado" significa que la incorporación se monitoriza durante el lanzamiento para garantizar calidad y soporte. Si detectas un comportamiento inesperado, escríbenos a soporte@verifactu.business y lo revisamos en menos de 24 h hábiles.',
    },
    {
      q: '¿Cuánto va a costar cuando termine el lanzamiento?',
      a: 'Mientras dure la fase de lanzamiento el conector es gratuito sin límites. Al cerrar la beta habrá un plan gratuito permanente con un tope mensual de consultas y planes de pago para uso intensivo o multi-cuenta. Los usuarios del beta mantendrán condiciones preferentes — te avisaremos con al menos 30 días de antelación antes de cualquier cambio.',
    },
    {
      q: '¿Qué pasa con mis datos si dejo de usar el conector?',
      a: `Puedes revocar el acceso desde dos sitios: (1) tu cuenta de Holded — sección de integraciones, eliminas el token de Verifactu — y (2) tu cuenta de ${aiName} — sección de conectores, eliminas el conector Holded. Tras la revocación, las credenciales se borran en menos de 24 h de nuestros servidores y ${aiName} pierde acceso instantáneamente.`,
    },
    {
      q: '¿Puedo conectar varias cuentas de Holded a la vez?',
      a: `En la versión actual del conector cada usuario de ${aiName} se vincula a una única cuenta de Holded, aislada del resto de cuentas. Si gestionas varias empresas en Holded distintas, hoy necesitas alternar la conexión. Para uso simultáneo multi-cuenta — típico de asesorías y despachos — escríbenos a soporte@verifactu.business y te explicamos cómo encajarlo.`,
    },
    {
      q: '¿Funciona en inglés u otros idiomas?',
      a: `Sí. Aunque la documentación está en español, ${aiName} puede recibir prompts y responder en cualquier idioma que soporte (inglés, catalán, francés, alemán, portugués...). El conector traduce internamente las llamadas a Holded, así que puedes preguntarle en inglés y obtener respuestas con datos en euros y formato español sin tocar nada.`,
    },
    {
      q: '¿Qué hago si algo no responde como espero?',
      a: 'Tres vías de soporte: chat de soporte (asistente guiado en ventana independiente), formulario autenticado vinculado a tu cuenta de Holded, o email directo a soporte@verifactu.business. Para incidencias urgentes el email es la vía más rápida — tiempo de respuesta medio en beta: menos de 4 h hábiles.',
    },
  ];
}

export function getFaqJsonLd(aiName: string, provider: string) {
  const faqs = buildFaqs(aiName, provider);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}
