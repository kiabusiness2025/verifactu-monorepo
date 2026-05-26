// Help content for each integration provider.
// Shown in /integrations/ayuda/[provider] and as inline help in connector cards.

export type ProviderHelp = {
  name: string;
  logo: string;
  category: string;
  tagline: string;
  apiKeySteps: string[];
  whatIsaakSyncs: string[];
  faq: { q: string; a: string }[];
  docsUrl: string;
};

export const PROVIDER_HELP: Record<string, ProviderHelp> = {
  holded: {
    name: 'Holded',
    logo: '🟠',
    category: 'Software de gestión (ERP)',
    tagline:
      'Conecta tu cuenta de Holded para que Isaak acceda a tus facturas, contactos y contabilidad.',
    apiKeySteps: [
      'Inicia sesión en tu cuenta de Holded (app.holded.com).',
      'Ve a Configuración (icono ⚙️ inferior izquierda).',
      'Selecciona "Integraciones" → "API".',
      'Haz clic en "Generar clave API".',
      'Copia la clave y pégala en el campo de Isaak.',
    ],
    whatIsaakSyncs: [
      'Facturas emitidas y recibidas',
      'Contactos (clientes y proveedores)',
      'Productos y servicios',
      'Asientos contables',
      'Estado de liquidaciones y vencimientos',
    ],
    faq: [
      {
        q: '¿Qué permisos necesita la API key?',
        a: 'Holded solo ofrece claves con acceso completo a la cuenta. Isaak usa el acceso de forma de solo-lectura salvo para las acciones que tú apruebes.',
      },
      {
        q: '¿Puedo revocar el acceso en cualquier momento?',
        a: 'Sí. Desde Holded → Configuración → API puedes regenerar o eliminar la clave. En Isaak haz clic en "Desconectar".',
      },
    ],
    docsUrl: 'https://developers.holded.com/',
  },

  hotelgest: {
    name: 'HotelGest',
    logo: '🏨',
    category: 'PMS hotelero',
    tagline:
      'Conecta tu PMS HotelGest para que Isaak acceda a reservas, ocupación y facturación hotelera.',
    apiKeySteps: [
      'Inicia sesión en tu panel de HotelGest.',
      'Ve a Configuración → Integraciones → API.',
      'Genera una nueva clave de acceso.',
      'Copia la clave y pégala en Isaak.',
    ],
    whatIsaakSyncs: [
      'Reservas activas y canceladas',
      'Facturación por estancia',
      'Indicadores: ocupación, ADR, RevPAR',
      'Clientes y empresas',
    ],
    faq: [
      {
        q: '¿Afecta la integración a mi operativa en HotelGest?',
        a: 'No. Isaak solo lee datos, nunca modifica reservas ni facturación en HotelGest.',
      },
    ],
    docsUrl: 'https://www.hotelgest.com/integraciones',
  },

  revo: {
    name: 'Revo XEF',
    logo: '🍽️',
    category: 'TPV para hostelería',
    tagline: 'Conecta Revo XEF para acceder a ventas, tickets y datos de tu restaurante o bar.',
    apiKeySteps: [
      'Inicia sesión en el panel de Revo (back office web).',
      'Ve a Configuración → Integraciones externas.',
      'Genera o copia tu token de acceso.',
      'Pégalo en el campo de Isaak.',
    ],
    whatIsaakSyncs: [
      'Ventas diarias por terminal',
      'Tickets y comandas',
      'Productos y categorías',
      'Métodos de pago',
    ],
    faq: [
      {
        q: '¿Necesito una cuenta de desarrollador en Revo?',
        a: 'Sí, necesitas acceso al back office web con permisos de administración para generar el token.',
      },
    ],
    docsUrl: 'https://developer.revo.works',
  },

  loyverse: {
    name: 'Loyverse',
    logo: '🏪',
    category: 'TPV en la nube',
    tagline: 'Conecta Loyverse para acceder a ventas, inventario y clientes de tu tienda.',
    apiKeySteps: [
      'Inicia sesión en Loyverse Back Office (r.loyverse.com).',
      'Ve a Configuración → Acceso API.',
      'Haz clic en "Crear token".',
      'Dale un nombre (ej. "Isaak"), selecciona los permisos de lectura y guarda.',
      'Copia el token generado y pégalo en Isaak.',
    ],
    whatIsaakSyncs: [
      'Ventas y recibos',
      'Inventario y productos',
      'Clientes del programa de fidelidad',
      'Métodos de pago y caja',
    ],
    faq: [
      {
        q: '¿Qué permisos debo seleccionar al crear el token?',
        a: 'Selecciona al menos: Receipts (lectura), Items (lectura), Customers (lectura). Isaak no necesita permisos de escritura.',
      },
    ],
    docsUrl: 'https://developer.loyverse.com/docs/',
  },

  woocommerce: {
    name: 'WooCommerce',
    logo: '🛍️',
    category: 'E-commerce (WordPress)',
    tagline: 'Conecta tu tienda WooCommerce para que Isaak acceda a pedidos, clientes y productos.',
    apiKeySteps: [
      'Accede al escritorio de WordPress de tu tienda.',
      'Ve a WooCommerce → Ajustes → Avanzado → API REST.',
      'Haz clic en "Añadir clave".',
      'Pon una descripción (ej. "Isaak"), selecciona el usuario y en Permisos elige "Lectura".',
      'Haz clic en "Generar clave API".',
      'Copia el Consumer Key y el Consumer Secret.',
      'En Isaak, pégalos juntos con el formato: ConsumerKey:ConsumerSecret',
    ],
    whatIsaakSyncs: [
      'Pedidos y estados',
      'Clientes registrados',
      'Productos y variaciones',
      'Ingresos y métricas de tienda',
    ],
    faq: [
      {
        q: '¿Por qué tengo que pegar Consumer Key y Secret juntos?',
        a: 'WooCommerce usa autenticación Basic (usuario:contraseña). Isaak los combina internamente — tú solo los pegas una vez.',
      },
      {
        q: '¿Funciona con WooCommerce alojado en cualquier hosting?',
        a: 'Sí, siempre que la tienda tenga SSL (HTTPS) y la API REST de WooCommerce esté activada.',
      },
    ],
    docsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
  },

  prestashop: {
    name: 'PrestaShop',
    logo: '🛒',
    category: 'E-commerce',
    tagline: 'Conecta tu tienda PrestaShop para acceder a pedidos, clientes y catálogo.',
    apiKeySteps: [
      'Accede al panel de administración de PrestaShop.',
      'Ve a Parámetros avanzados → Servicio web.',
      'Activa el servicio web si no está habilitado.',
      'Haz clic en "Añadir nueva clave".',
      'Pon una descripción (ej. "Isaak") y activa los permisos GET en Customers, Orders, Products.',
      'Guarda y copia la clave generada.',
      'Pégala en Isaak.',
    ],
    whatIsaakSyncs: [
      'Pedidos y estados',
      'Clientes',
      'Catálogo de productos',
      'Facturas de pedidos',
    ],
    faq: [
      {
        q: '¿Qué versión de PrestaShop es compatible?',
        a: 'PrestaShop 1.7 o superior con el módulo Webservice activado.',
      },
    ],
    docsUrl: 'https://devdocs.prestashop-project.org/8/webservice/',
  },

  mindbody: {
    name: 'Mindbody',
    logo: '🏋️',
    category: 'Gestión de centros deportivos y wellness',
    tagline: 'Conecta Mindbody para acceder a reservas, ventas y clientes de tu centro.',
    apiKeySteps: [
      'Inicia sesión en Mindbody Business.',
      'Ve al menú superior → Integrations → API Management.',
      'Solicita o copia tu API key de acceso.',
      'Necesitarás también tu Site ID (número de tu negocio en Mindbody).',
      'En Isaak, pega la API key en el formato: APIKey:SiteID',
    ],
    whatIsaakSyncs: [
      'Reservas y clases',
      'Ventas y pagos',
      'Clientes y membresías',
      'Métricas de asistencia',
    ],
    faq: [
      {
        q: '¿Necesito un plan específico de Mindbody para usar la API?',
        a: 'Sí, el acceso a la API pública de Mindbody requiere un plan Elevate o superior.',
      },
    ],
    docsUrl: 'https://developers.mindbodyonline.com/',
  },

  stripe: {
    name: 'Stripe',
    logo: '💳',
    category: 'Plataforma de pagos',
    tagline: 'Conecta Stripe para que Isaak acceda a tus cobros, suscripciones y payouts.',
    apiKeySteps: [
      'Inicia sesión en dashboard.stripe.com.',
      'En el menú lateral ve a Developers → API keys.',
      'Copia la "Secret key" que empieza por sk_live_…',
      'Pégala en Isaak. (Nunca compartas la secret key públicamente.)',
    ],
    whatIsaakSyncs: [
      'Cobros y pagos recibidos',
      'Suscripciones activas y canceladas',
      'Payouts a tu cuenta bancaria',
      'Clientes y métodos de pago',
      'Balance disponible y pendiente',
    ],
    faq: [
      {
        q: '¿Debo usar la live key o la test key?',
        a: 'Para datos reales usa la sk_live_… Si quieres probar la integración primero, puedes usar sk_test_…',
      },
      {
        q: '¿Puedo usar una restricted key en vez de la secret key?',
        a: 'Sí. En Stripe → Developers → API keys → Create restricted key, selecciona lectura en Charges, Subscriptions y Balance. Es más seguro.',
      },
    ],
    docsUrl: 'https://stripe.com/docs/api',
  },

  redsys: {
    name: 'Redsys',
    logo: '🏧',
    category: 'Gateway bancario español',
    tagline:
      'Conecta Redsys para acceder a tus transacciones bancarias procesadas por el gateway español.',
    apiKeySteps: [
      'Contacta con tu banco para obtener acceso al portal de Redsys (SIS).',
      'En el portal SIS ve a Configuración → Datos del comercio.',
      'Copia tu Número de Comercio (Fuc) y Clave Secreta de firma.',
      'En Isaak pega el formato: FUC:ClaveSecreta',
    ],
    whatIsaakSyncs: [
      'Transacciones procesadas',
      'Pagos con tarjeta y Bizum',
      'Devoluciones y anulaciones',
      'Liquidaciones a tu cuenta',
    ],
    faq: [
      {
        q: '¿Qué es el Número de Comercio (FUC)?',
        a: 'Es el identificador de tu comercio en Redsys, asignado por tu banco adquirente al contratar el TPV virtual.',
      },
      {
        q: '¿Redsys tiene entorno de pruebas?',
        a: 'Sí, en sis-t.redsys.es. Para producción usa sis.redsys.es.',
      },
    ],
    docsUrl: 'https://pagosonline.redsys.es/desarrolladores.html',
  },

  gocardless: {
    name: 'GoCardless',
    logo: '🔄',
    category: 'Débito directo SEPA',
    tagline:
      'Conecta GoCardless para gestionar cobros recurrentes por domiciliación bancaria SEPA.',
    apiKeySteps: [
      'Inicia sesión en manage.gocardless.com.',
      'Ve a Developers (icono </> en el menú lateral).',
      'Haz clic en "Create access token".',
      'Dale un nombre (ej. "Isaak"), selecciona permisos de lectura y crea el token.',
      'Copia el token y pégalo en Isaak.',
    ],
    whatIsaakSyncs: [
      'Pagos realizados y pendientes',
      'Mandatos SEPA activos',
      'Suscripciones de cobro recurrente',
      'Payouts y liquidaciones',
      'Clientes y cuentas bancarias',
    ],
    faq: [
      {
        q: '¿GoCardless ofrece también Open Banking?',
        a: 'GoCardless tenía un servicio de datos bancarios (Bankdata) que cerró para nuevos registros. En Isaak usamos Enable Banking para la lectura de cuentas bancarias. GoCardless solo se usa aquí para pagos por débito directo.',
      },
    ],
    docsUrl: 'https://developer.gocardless.com/api-reference/',
  },

  paypal: {
    name: 'PayPal',
    logo: '🅿️',
    category: 'Pagos online',
    tagline: 'Conecta PayPal para acceder a tus transacciones, facturas y balances.',
    apiKeySteps: [
      'Ve a developer.paypal.com e inicia sesión con tu cuenta de PayPal de negocio.',
      'Ve a Apps & Credentials.',
      'Selecciona el modo "Live" (para datos reales).',
      'Haz clic en "Create App" o selecciona una app existente.',
      'Copia el "Client ID" y el "Client Secret".',
      'En Isaak, pégalos con el formato: ClientID:ClientSecret',
    ],
    whatIsaakSyncs: [
      'Transacciones recibidas y enviadas',
      'Facturas PayPal',
      'Balance de la cuenta',
      'Historial de payouts',
    ],
    faq: [
      {
        q: '¿Necesito una cuenta de negocio de PayPal?',
        a: 'Sí. Las cuentas personales no tienen acceso a la API REST. Necesitas una cuenta Business o Premier.',
      },
    ],
    docsUrl: 'https://developer.paypal.com/api/rest/',
  },

  mollie: {
    name: 'Mollie',
    logo: '💶',
    category: 'Pagos europeos',
    tagline: 'Conecta Mollie para acceder a pagos, suscripciones y métodos de pago europeos.',
    apiKeySteps: [
      'Inicia sesión en my.mollie.com.',
      'Ve a Developers → API keys.',
      'Copia la "Live API key" que empieza por live_…',
      'Pégala en Isaak.',
    ],
    whatIsaakSyncs: [
      'Pagos recibidos (tarjeta, iDEAL, Bizum, SEPA…)',
      'Suscripciones y mandatos',
      'Devoluciones',
      'Balance y liquidaciones',
    ],
    faq: [
      {
        q: '¿Puedo usar la test API key para probar?',
        a: 'Sí. La test key empieza por test_… Solo verás datos de prueba. Para datos reales usa la live key.',
      },
    ],
    docsUrl: 'https://docs.mollie.com',
  },

  sumup: {
    name: 'SumUp',
    logo: '📲',
    category: 'TPV y pagos para pymes',
    tagline: 'Conecta SumUp para acceder a tus cobros presenciales y ventas.',
    apiKeySteps: [
      'Ve a developer.sumup.com e inicia sesión.',
      'En "My Apps" crea una nueva aplicación o selecciona una existente.',
      'Ve a la sección de credenciales y genera un Access Token personal.',
      'Copia el token y pégalo en Isaak.',
    ],
    whatIsaakSyncs: [
      'Transacciones y cobros',
      'Recibos emitidos',
      'Historial de payouts',
      'Balance de cuenta',
    ],
    faq: [
      {
        q: '¿Necesito una cuenta de desarrollador separada?',
        a: 'No. Puedes acceder a developer.sumup.com con las mismas credenciales de tu cuenta SumUp de negocio.',
      },
    ],
    docsUrl: 'https://developer.sumup.com/api',
  },

  paylands: {
    name: 'Paylands',
    logo: '🌐',
    category: 'Gateway español',
    tagline:
      'Conecta Paylands para acceder a tus pagos procesados con Bizum y otros métodos españoles.',
    apiKeySteps: [
      'Inicia sesión en el Dashboard de Paylands.',
      'Ve a Configuración → API.',
      'Copia tu API key de producción.',
      'Pégala en Isaak.',
    ],
    whatIsaakSyncs: [
      'Pagos y transacciones',
      'Pagos Bizum',
      'Devoluciones y cancelaciones',
      'Liquidaciones',
    ],
    faq: [
      {
        q: '¿Paylands es compatible con Bizum?',
        a: 'Sí. Paylands tiene integración nativa con Bizum, ideal para negocios españoles.',
      },
    ],
    docsUrl: 'https://docs.paylands.com/en/reference/',
  },
};
