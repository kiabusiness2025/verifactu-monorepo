import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CreditCard,
  Dumbbell,
  Hotel,
  Landmark,
  Package,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';

export type SetupStep = {
  step: number;
  title: string;
  body: string;
  note?: string;
};

export type SyncedItem = {
  label: string;
  desc: string;
};

export type FaqItem = {
  q: string;
  a: string;
};

export type ConnectorHelp = {
  slug: string;
  name: string;
  sector: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  authLabel: string;
  setupSteps: SetupStep[];
  syncedItems: SyncedItem[];
  faq: FaqItem[];
  officialDocs?: string;
};

export const connectorHelpData: ConnectorHelp[] = [
  // ─── ERP ────────────────────────────────────────────────────────────────
  {
    slug: 'holded',
    name: 'Holded',
    sector: 'ERP / Contabilidad',
    icon: Building2,
    tagline: 'Facturación, contabilidad y gastos de Holded en tiempo real',
    description:
      'Holded es el ERP de referencia para pymes españolas. Isaak se conecta vía API key para leer facturas, gastos, tesorería, contactos y contabilidad — y convierte esos datos en asesoramiento fiscal proactivo.',
    authLabel: 'API key de Holded',
    setupSteps: [
      {
        step: 1,
        title: 'Accede a tu cuenta Holded',
        body: 'Inicia sesión en app.holded.com. Necesitas ser administrador de la cuenta para generar una API key.',
      },
      {
        step: 2,
        title: 'Ve a Configuración → Integraciones → API',
        body: 'En el panel lateral, haz clic en el icono de ajustes (⚙) situado en la parte inferior izquierda. Luego elige "Integraciones" y abre la pestaña "API".',
        note: 'Si la API key no existe todavía, haz clic en "Generar API key". Solo existe una key activa por cuenta.',
      },
      {
        step: 3,
        title: 'Copia la API key',
        body: 'La key es una cadena hexadecimal de 40 caracteres. Haz clic en el icono de copiar para guardarla en el portapapeles.',
      },
      {
        step: 4,
        title: 'Pégala en Isaak',
        body: 'En Isaak → Integraciones → Holded → campo "API key". Haz clic en "Guardar y conectar". Isaak verificará la clave y empezará la sincronización.',
      },
    ],
    syncedItems: [
      {
        label: 'Facturas emitidas y recibidas',
        desc: 'Todas las facturas del ejercicio, con estado de cobro, vencimientos y datos del cliente.',
      },
      {
        label: 'Gastos y compras',
        desc: 'Gastos registrados con IVA soportado y cuenta contable asignada.',
      },
      {
        label: 'Contactos y clientes',
        desc: 'Clientes y proveedores con NIF, dirección fiscal y condiciones de pago.',
      },
      {
        label: 'Tesorería',
        desc: 'Movimientos de cuentas bancarias y saldos registrados en Holded.',
      },
      {
        label: 'Proyectos y presupuestos',
        desc: 'Estado de proyectos, presupuestos enviados y facturación asociada a cada uno.',
      },
      {
        label: 'Productos y catálogo',
        desc: 'Inventario, precios de venta y configuración de IVA por producto.',
      },
    ],
    faq: [
      {
        q: '¿Puedo conectar varias cuentas Holded?',
        a: 'Sí. Con el Modo Asesoría (plan Pro o Business) puedes gestionar múltiples cuentas Holded para distintos clientes o empresas desde un solo panel de Isaak.',
      },
      {
        q: '¿Cada cuánto se actualizan los datos?',
        a: 'Isaak obtiene los datos en tiempo real cuando haces una consulta en el chat. Para alertas proactivas (vencimientos, anomalías), la sincronización ocurre cada hora.',
      },
      {
        q: '¿Qué pasa si regenero mi API key en Holded?',
        a: 'Si generas una nueva key en Holded, la anterior queda invalidada. Tendrás que actualizar la key en Isaak → Integraciones → Holded antes de que pase 1 hora.',
      },
      {
        q: '¿Isaak puede crear facturas o registrar gastos en Holded?',
        a: 'Actualmente Isaak solo lee datos de Holded. La escritura bidireccional (crear facturas, registrar gastos desde el chat) está en el roadmap.',
      },
    ],
    officialDocs: 'https://developers.holded.com/docs',
  },

  {
    slug: 'hotelgest',
    name: 'HotelGest',
    sector: 'Hoteles y alojamientos',
    icon: Hotel,
    tagline: 'Reservas, RevPAR y modelo 303 hotelero desde HotelGest',
    description:
      'HotelGest es el PMS de referencia para hoteles independientes y pequeñas cadenas. Isaak lee reservas, ocupación, facturación e IVA hostelero (10%) y prepara el modelo 303 trimestral automáticamente.',
    authLabel: 'API key de HotelGest',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al dashboard de HotelGest',
        body: 'Inicia sesión con tu usuario de administrador en el panel de control de HotelGest.',
      },
      {
        step: 2,
        title: 'Ve a Configuración → API',
        body: 'En el menú principal, accede a la sección de Configuración y busca el apartado de integraciones o API. Encontrarás tu API key o la opción de generarla.',
        note: 'Si no ves la sección API, contacta con el soporte de HotelGest para activar el acceso a la API en tu plan.',
      },
      {
        step: 3,
        title: 'Copia tu API key',
        body: 'Copia la API key de tu cuenta. Guárdala en un lugar seguro — equivale a una contraseña de acceso a tus datos.',
      },
      {
        step: 4,
        title: 'Conéctala en Isaak',
        body: 'En Isaak → Integraciones → HotelGest → pega tu API key y haz clic en "Guardar". Isaak importará las reservas de los últimos 30 días para empezar.',
      },
    ],
    syncedItems: [
      {
        label: 'Reservas y ocupación',
        desc: 'Reservas confirmadas, canceladas y en lista de espera, con canal de origen y tarifa.',
      },
      {
        label: 'Facturación de alojamiento',
        desc: 'Facturas emitidas, estancias facturadas e IVA al 10% (hostelería).',
      },
      {
        label: 'RevPAR y ADR',
        desc: 'Ingresos por habitación disponible y tarifa media diaria en tiempo real.',
      },
      {
        label: 'Cobros pendientes',
        desc: 'Facturas sin cobrar con días vencidos y datos del cliente.',
      },
      {
        label: 'Canales de distribución',
        desc: 'Desglose de ingresos por canal: directo, Booking, Expedia, agencias.',
      },
    ],
    faq: [
      {
        q: '¿Funciona Isaak con varias propiedades en HotelGest?',
        a: 'Sí. Isaak agrega los datos de todos tus hoteles HotelGest en una sola conversación y puedes compararlos entre sí.',
      },
      {
        q: '¿Qué IVA aplica Isaak para hostelería?',
        a: 'Isaak aplica automáticamente el tipo reducido del 10% para alojamiento hostelero y el 10% para restauración. Si hay servicios con IVA general (21%), se desglosan por separado.',
      },
      {
        q: '¿Necesito también Holded si ya tengo HotelGest?',
        a: 'No es obligatorio. Isaak funciona perfectamente con solo HotelGest. Holded añade la capa de contabilidad formal (libro mayor, asientos), pero para las operaciones diarias no es necesario.',
      },
    ],
    officialDocs: 'https://www.hotelgest.com',
  },

  {
    slug: 'revo-xef',
    name: 'Revo XEF',
    sector: 'Restaurantes y hostelería',
    icon: UtensilsCrossed,
    tagline: 'Cierres de caja, IVA al 10% y modelo 303 para tu restaurante',
    description:
      'Revo XEF es el TPV de referencia para restaurantes en España. Isaak lee cierres de caja diarios, ventas por servicio (almuerzo, cena, barra), tipos de IVA y prepara el modelo 303 trimestral del sector hostelero.',
    authLabel: 'API key de Revo',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al dashboard de Revo',
        body: 'Inicia sesión en backoffice.revo.works con tu cuenta de administrador.',
      },
      {
        step: 2,
        title: 'Ve a Configuración → Integraciones',
        body: 'En el menú lateral, busca "Configuración" → "Integraciones" o "API". Revo genera una API key específica para integraciones de terceros.',
        note: 'Si no encuentras la sección, contacta con el soporte de Revo para activar el acceso API en tu cuenta.',
      },
      {
        step: 3,
        title: 'Copia tu API key',
        body: 'Copia la API key. Es una cadena alfanumérica única para tu cuenta.',
      },
      {
        step: 4,
        title: 'Conéctala en Isaak',
        body: 'En Isaak → Integraciones → Revo XEF → pega la key y selecciona el local o cadena que quieres conectar. Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      {
        label: 'Cierres de caja diarios',
        desc: 'Total de ventas, desglose por método de pago y diferencias de caja.',
      },
      {
        label: 'Ventas por servicio',
        desc: 'Desayuno, almuerzo, cena, barra — ingresos desglosados por turno y tipo de servicio.',
      },
      {
        label: 'IVA hostelero',
        desc: 'IVA al 10% (alimentos y bebidas) y 21% (alcohol) calculado automáticamente desde el ticket.',
      },
      {
        label: 'Pedidos y comandas',
        desc: 'Número de comensales, ticket medio y productos más vendidos.',
      },
      {
        label: 'Reservas de sala',
        desc: 'Ocupación de mesas y reservas si Revo tiene módulo de reservas activo.',
      },
    ],
    faq: [
      {
        q: '¿Funciona con múltiples locales Revo?',
        a: 'Sí. Puedes conectar varios locales y Isaak los agrega en una sola vista. Compara el rendimiento entre locales y obtén el IVA consolidado de toda la cadena.',
      },
      {
        q: '¿Con qué versión de Revo es compatible?',
        a: 'Isaak es compatible con Revo XEF (la versión para restaurantes). No es compatible con Revo RETAIL en este momento.',
      },
      {
        q: '¿Cada cuánto se sincronizan los datos?',
        a: 'Isaak importa los cierres del día anterior cada mañana. Los datos del día en curso se obtienen en tiempo real cuando preguntas al chat.',
      },
    ],
    officialDocs: 'https://www.revo.works',
  },

  {
    slug: 'loyverse',
    name: 'Loyverse',
    sector: 'Retail y TPV',
    icon: Zap,
    tagline: 'Ventas, inventario y modelo 303 para tiendas con Loyverse',
    description:
      'Loyverse es el TPV en la nube más usado por pequeños comercios. Isaak lee ventas, inventario y empleados para preparar el IVA repercutido y el modelo 303 desde los datos reales de caja.',
    authLabel: 'Access token de Loyverse',
    setupSteps: [
      {
        step: 1,
        title: 'Accede a tu cuenta Loyverse',
        body: 'Inicia sesión en loyverse.com con tu cuenta de propietario o administrador.',
      },
      {
        step: 2,
        title: 'Ve a Cuenta → Acceso a la API',
        body: 'En la esquina superior derecha, haz clic en tu nombre de usuario → "Cuenta". En el menú lateral, busca "Acceso a la API" y haz clic en "Generar nuevo token".',
      },
      {
        step: 3,
        title: 'Pon un nombre descriptivo y genera el token',
        body: 'Escribe un nombre como "Isaak" para identificarlo, selecciona los permisos de lectura (ventas, inventario, empleados) y haz clic en "Crear".',
        note: 'El token solo se muestra una vez. Cópialo inmediatamente y guárdalo en un lugar seguro.',
      },
      {
        step: 4,
        title: 'Pégalo en Isaak',
        body: 'En Isaak → Integraciones → Loyverse → campo "Access token". Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      {
        label: 'Ventas y recibos',
        desc: 'Todas las ventas del TPV con producto, cantidad, precio e IVA.',
      },
      { label: 'Inventario', desc: 'Stock actual, alertas de mínimo y coste de mercancías.' },
      {
        label: 'Devoluciones',
        desc: 'Recibos anulados y devoluciones con impacto en el IVA repercutido.',
      },
      {
        label: 'Empleados y turnos',
        desc: 'Rendimiento por empleado, turnos trabajados y ventas atribuidas.',
      },
      {
        label: 'Clientes (si tienes programa de fidelidad)',
        desc: 'Visitas, puntos acumulados y ticket medio por cliente.',
      },
    ],
    faq: [
      {
        q: '¿Con cuántos puntos de venta es compatible?',
        a: 'Isaak conecta con todos los establecimientos asociados a tu cuenta Loyverse. Los datos se agregan automáticamente.',
      },
      {
        q: '¿Qué tipo de IVA aplica Loyverse?',
        a: 'Isaak lee la configuración de impuestos que tengas en Loyverse (IVA al 21%, 10% o 4%). Asegúrate de tener los productos configurados con el tipo de IVA correcto en Loyverse.',
      },
    ],
    officialDocs: 'https://developer.loyverse.com',
  },

  {
    slug: 'woocommerce',
    name: 'WooCommerce',
    sector: 'E-commerce',
    icon: ShoppingCart,
    tagline: 'Ventas online, IVA intracomunitario y devoluciones de WooCommerce',
    description:
      'WooCommerce es la plataforma e-commerce más usada en WordPress. Isaak se conecta vía REST API para leer pedidos, devoluciones, IVA por país y preparar la declaración trimestral.',
    authLabel: 'Consumer Key + Consumer Secret de WooCommerce',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al panel de WordPress',
        body: 'Inicia sesión en tutienda.com/wp-admin con tu usuario de administrador.',
      },
      {
        step: 2,
        title: 'Ve a WooCommerce → Ajustes → Avanzado → REST API',
        body: 'En el menú lateral de WordPress, haz clic en "WooCommerce" → "Ajustes" → pestaña "Avanzado" → subtab "REST API". Haz clic en "Añadir clave".',
      },
      {
        step: 3,
        title: 'Crea una clave con permisos de lectura',
        body: 'Pon "Isaak" como descripción, selecciona tu usuario, elige "Lectura" como permisos y haz clic en "Generar clave API".',
        note: 'El Consumer Secret solo se muestra una vez. Cópialo inmediatamente junto con el Consumer Key.',
      },
      {
        step: 4,
        title: 'Introduce ambas claves en Isaak',
        body: 'En Isaak → Integraciones → WooCommerce → introduce la URL de tu tienda, el Consumer Key y el Consumer Secret. Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      { label: 'Pedidos y ventas', desc: 'Todos los pedidos con estado, importe, cliente e IVA.' },
      {
        label: 'Devoluciones y reembolsos',
        desc: 'Pedidos devueltos con impacto en el IVA repercutido del trimestre.',
      },
      {
        label: 'IVA por país (OSS)',
        desc: 'IVA de ventas intracomunitarias desglosado por país para la declaración OSS.',
      },
      { label: 'Productos y stock', desc: 'Catálogo, precio de coste y niveles de inventario.' },
      {
        label: 'Clientes',
        desc: 'Base de clientes con país de facturación para clasificación fiscal.',
      },
    ],
    faq: [
      {
        q: '¿Es compatible con WooCommerce Subscriptions?',
        a: 'Sí. Isaak lee también los pagos recurrentes de WooCommerce Subscriptions y los consolida con el resto de ventas.',
      },
      {
        q: '¿Cómo gestiona Isaak el IVA intracomunitario (OSS)?',
        a: 'Isaak detecta automáticamente las ventas a clientes de la UE y las desglosa por país para facilitar la declaración OSS trimestral.',
      },
      {
        q: '¿Necesito WooCommerce.com o solo el plugin de WordPress?',
        a: 'Solo necesitas el plugin de WooCommerce en tu WordPress. No es necesaria ninguna suscripción adicional de WooCommerce.com.',
      },
    ],
    officialDocs: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
  },

  {
    slug: 'prestashop',
    name: 'PrestaShop',
    sector: 'E-commerce',
    icon: ShoppingCart,
    tagline: 'Pedidos, IVA y facturación electrónica de tu tienda PrestaShop',
    description:
      'PrestaShop es la plataforma e-commerce de referencia en España. Isaak se conecta vía Webservice API para leer pedidos, devoluciones, múltiples tipos de IVA y generar la facturación electrónica.',
    authLabel: 'Webservice Key de PrestaShop',
    setupSteps: [
      {
        step: 1,
        title: 'Activa el Webservice de PrestaShop',
        body: 'En el panel de administración (tutienda.com/admin), ve a Parámetros Avanzados → Webservice. Activa el webservice si no lo está.',
      },
      {
        step: 2,
        title: 'Crea una nueva clave de webservice',
        body: 'Haz clic en "Añadir nueva clave de webservice". Pon "Isaak" como descripción y activa los permisos GET (lectura) para: orders, order_details, customers, products, tax_rules, invoices.',
      },
      {
        step: 3,
        title: 'Genera y copia la clave',
        body: 'Haz clic en "Generar" para crear la clave automáticamente. Copia la cadena de 32 caracteres alfanuméricos en mayúsculas.',
        note: 'Si usas SSL, asegúrate de que la URL de tu tienda sea https:// o el webservice puede no funcionar.',
      },
      {
        step: 4,
        title: 'Configúrala en Isaak',
        body: 'En Isaak → Integraciones → PrestaShop → introduce la URL de tu tienda y la Webservice Key. Isaak verificará la conexión.',
      },
    ],
    syncedItems: [
      {
        label: 'Pedidos y estados',
        desc: 'Pedidos nuevos, en preparación, enviados y entregados, con importe e IVA.',
      },
      {
        label: 'Notas de crédito (devoluciones)',
        desc: 'Devoluciones parciales y totales con impacto en el IVA del trimestre.',
      },
      {
        label: 'Múltiples tipos de IVA',
        desc: 'IVA al 21%, 10% y 4% desglosados por producto y categoría.',
      },
      {
        label: 'Facturas generadas',
        desc: 'Facturas en PDF generadas por PrestaShop vinculadas a cada pedido.',
      },
      {
        label: 'Clientes y países',
        desc: 'Clientes con país de facturación para clasificación OSS de ventas intracomunitarias.',
      },
    ],
    faq: [
      {
        q: '¿Con qué versiones de PrestaShop es compatible Isaak?',
        a: 'Isaak es compatible con PrestaShop 1.7 y 8.x. Si usas una versión anterior, contacta con soporte.',
      },
      {
        q: '¿Necesito instalar algún módulo en PrestaShop?',
        a: 'No. La integración usa el Webservice nativo de PrestaShop, sin módulos adicionales.',
      },
      {
        q: '¿Funciona con múltiples tiendas (multistore)?',
        a: 'De momento Isaak se conecta a una tienda (shop) por integración. El soporte multistore está en el roadmap.',
      },
    ],
    officialDocs: 'https://devdocs.prestashop-project.org/8/webservice/',
  },

  {
    slug: 'mindbody',
    name: 'Mindbody',
    sector: 'Gimnasios y wellness',
    icon: Dumbbell,
    tagline: 'Membresías, clases e IVA de servicios deportivos con Mindbody',
    description:
      'Mindbody es la plataforma de gestión para centros deportivos, spas y estudios. Isaak lee membresías, reservas de clases e ingresos para calcular el IVA de servicios deportivos (10%) y preparar el modelo 303.',
    authLabel: 'Staff Username + Password + Site ID de Mindbody',
    setupSteps: [
      {
        step: 1,
        title: 'Localiza el Site ID de tu negocio',
        body: 'El Site ID es el número de identificación de tu negocio en Mindbody. Lo encontrarás en la URL de tu Mindbody (ejemplo: verifactu.mindbodyonline.com → el ID suele estar en la URL o en Ajustes → Información del negocio).',
      },
      {
        step: 2,
        title: 'Prepara las credenciales de staff',
        body: 'Crea un usuario de tipo "Staff" en Mindbody con permisos de lectura de informes y clases. Anota el username y la contraseña.',
        note: 'Te recomendamos crear un usuario específico llamado "Isaak Integración" para mantener el control de accesos.',
      },
      {
        step: 3,
        title: 'Conéctalo en Isaak',
        body: 'En Isaak → Integraciones → Mindbody → introduce el Site ID, el Staff Username y la contraseña. Isaak usará OAuth para autorizar el acceso de forma segura.',
      },
    ],
    syncedItems: [
      {
        label: 'Membresías activas',
        desc: 'Membresías vigentes, renovaciones y bajas del mes.',
      },
      {
        label: 'Reservas de clases',
        desc: 'Ocupación por clase, instructor y horario.',
      },
      {
        label: 'Ingresos y pagos',
        desc: 'Cobros de membresías, paquetes de clases y sesiones individuales.',
      },
      {
        label: 'IVA servicios deportivos',
        desc: 'IVA al 10% para servicios deportivos calculado automáticamente desde los cobros de Mindbody.',
      },
      {
        label: 'Nuevos socios',
        desc: 'Altas del mes vs bajas, para análisis de retención y previsión fiscal.',
      },
    ],
    faq: [
      {
        q: '¿Con qué versión de Mindbody es compatible Isaak?',
        a: 'Isaak usa la API v6 de Mindbody, compatible con todos los planes actuales (Starter, Accelerate, Ultimate).',
      },
      {
        q: '¿Qué IVA aplica Mindbody en España?',
        a: 'Los servicios deportivos en España tributan al 10% de IVA reducido (gimnasios, piscinas, artes marciales). Isaak aplica este tipo automáticamente si tu negocio es un centro deportivo. Algunas actividades de bienestar o belleza pueden ser al 21% — consulta con tu asesor.',
      },
    ],
    officialDocs: 'https://developers.mindbodyonline.com',
  },

  // ─── Pagos ───────────────────────────────────────────────────────────────
  {
    slug: 'stripe',
    name: 'Stripe',
    sector: 'Pasarela de pagos',
    icon: CreditCard,
    tagline: 'Cobros, suscripciones y reembolsos de Stripe en tu modelo 303',
    description:
      'Stripe es la pasarela de pagos más usada por startups y empresas digitales. Isaak lee cobros, suscripciones, reembolsos y liquidaciones para consolidar tu IVA repercutido y preparar el modelo 303.',
    authLabel: 'Secret Key de Stripe',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al Stripe Dashboard',
        body: 'Inicia sesión en dashboard.stripe.com. Asegúrate de estar en el modo "Live" (no Test) para datos reales.',
      },
      {
        step: 2,
        title: 'Ve a Developers → API keys',
        body: 'En el menú lateral izquierdo, haz clic en "Developers" (o "Desarrolladores") → "API keys".',
      },
      {
        step: 3,
        title: 'Copia la Secret key',
        body: 'En el apartado "Standard keys", haz clic en "Reveal live key" junto a la "Secret key". La key empieza por sk_live_...',
        note: 'Nunca uses la key de pruebas (sk_test_...) para datos reales. Isaak necesita la sk_live_ para acceder a tus cobros.',
      },
      {
        step: 4,
        title: 'Pégala en Isaak',
        body: 'En Isaak → Integraciones → Stripe → campo "Secret key". Haz clic en "Guardar y conectar". Isaak importará los últimos 90 días de cobros.',
      },
    ],
    syncedItems: [
      {
        label: 'Pagos y cobros',
        desc: 'Todos los cobros exitosos con importe, cliente y método de pago.',
      },
      {
        label: 'Suscripciones',
        desc: 'Suscripciones activas, renovaciones y cancelaciones del período.',
      },
      {
        label: 'Reembolsos',
        desc: 'Devoluciones parciales o totales con impacto en el IVA del trimestre.',
      },
      {
        label: 'Transferencias y liquidaciones',
        desc: 'Cuándo y cuánto te ha ingresado Stripe en tu cuenta bancaria.',
      },
      {
        label: 'Tax (IVA de Stripe)',
        desc: 'Si usas Stripe Tax, Isaak importa el IVA calculado por Stripe por país.',
      },
    ],
    faq: [
      {
        q: '¿Puedo usar una Restricted Key en lugar de la Secret Key?',
        a: 'Sí. Para mayor seguridad, puedes crear una Restricted Key en Dashboard → Developers → API keys → "Create restricted key" con permisos de solo lectura sobre charges, customers, subscriptions y payouts.',
      },
      {
        q: '¿Isaak funciona con Stripe Connect (marketplace)?',
        a: 'De momento Isaak se conecta a tu cuenta principal de Stripe. El soporte para cuentas Connect (plataformas marketplace) está en el roadmap.',
      },
      {
        q: '¿Cómo gestiona Isaak el IVA en Stripe si vendo a clientes en distintos países?',
        a: 'Isaak detecta la dirección de facturación del cliente y aplica las reglas de IVA correspondientes (OSS para ventas intracomunitarias, B2B reverse charge, etc.).',
      },
    ],
    officialDocs: 'https://docs.stripe.com/api',
  },

  {
    slug: 'mollie',
    name: 'Mollie',
    sector: 'Pasarela de pagos',
    icon: CreditCard,
    tagline: 'Cobros, reembolsos y liquidaciones de Mollie en tu contabilidad',
    description:
      'Mollie es la pasarela de pagos europea más usada por e-commerce y SaaS. Isaak lee cobros, liquidaciones y reembolsos para consolidar el IVA repercutido y cuadrar con tu contabilidad.',
    authLabel: 'Live API key de Mollie',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al Mollie Dashboard',
        body: 'Inicia sesión en my.mollie.com. Asegúrate de estar en el modo "Live" (no Test).',
      },
      {
        step: 2,
        title: 'Ve a Developers → API keys',
        body: 'En el menú lateral, haz clic en "Developers" → "API keys". Verás las API keys de Live y de Test.',
      },
      {
        step: 3,
        title: 'Copia la Live API key',
        body: 'La Live API key empieza por live_... Haz clic en el icono de copiar junto a ella.',
        note: 'No uses la clave de pruebas (test_...). Isaak solo funciona con la clave live para acceder a datos reales.',
      },
      {
        step: 4,
        title: 'Pégala en Isaak',
        body: 'En Isaak → Integraciones → Mollie → campo "API key". Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      { label: 'Pagos y cobros', desc: 'Pagos exitosos con método de pago, importe e IVA.' },
      {
        label: 'Reembolsos',
        desc: 'Devoluciones totales y parciales con impacto en el IVA.',
      },
      {
        label: 'Liquidaciones (settlements)',
        desc: 'Transferencias que Mollie realiza a tu cuenta bancaria y su composición.',
      },
      {
        label: 'Suscripciones de Mollie',
        desc: 'Cobros recurrentes y mandatos activos.',
      },
    ],
    faq: [
      {
        q: '¿Mollie emite facturas que Isaak pueda leer?',
        a: 'Mollie genera facturas de sus comisiones (settlement invoices), no facturas de ventas. Isaak lee los settlement invoices para calcular el gasto de comisiones. Las facturas de ventas a tus clientes las gestiona tu ERP (Holded, WooCommerce, etc.).',
      },
    ],
    officialDocs: 'https://docs.mollie.com',
  },

  {
    slug: 'paypal',
    name: 'PayPal',
    sector: 'Pasarela de pagos',
    icon: CreditCard,
    tagline: 'Cobros de PayPal, IVA internacional y diferencias de cambio',
    description:
      'PayPal es la pasarela más usada para cobros internacionales. Isaak lee transacciones, reembolsos y conversiones de divisa para calcular el IVA de tus ventas y gestionar las diferencias de cambio.',
    authLabel: 'Client ID + Secret de la app PayPal',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al PayPal Developer Dashboard',
        body: 'Ve a developer.paypal.com/dashboard e inicia sesión con tu cuenta de PayPal Business.',
      },
      {
        step: 2,
        title: 'Crea una app en "My Apps & Credentials"',
        body: 'En la pestaña "My Apps & Credentials", asegúrate de estar en "Live" (no Sandbox). Haz clic en "Create App", ponle el nombre "Isaak" y selecciona "Merchant".',
      },
      {
        step: 3,
        title: 'Copia el Client ID y el Secret',
        body: 'Una vez creada la app, verás el Client ID y podrás "Show" el Client Secret. Copia ambos. Activa los permisos: Transaction Search y Reporting.',
        note: 'El Secret solo se puede ver en este momento. Si lo pierdes, tendrás que regenerarlo.',
      },
      {
        step: 4,
        title: 'Introdúcelos en Isaak',
        body: 'En Isaak → Integraciones → PayPal → introduce el Client ID y el Client Secret. Selecciona "Live" como entorno y haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      { label: 'Transacciones y cobros', desc: 'Pagos recibidos con importe, moneda y cliente.' },
      { label: 'Reembolsos', desc: 'Devoluciones con impacto en el IVA del período.' },
      {
        label: 'Conversiones de divisa',
        desc: 'Diferencias de cambio EUR/USD y otras monedas para la contabilidad.',
      },
      {
        label: 'Comisiones de PayPal',
        desc: 'Comisiones descontadas por PayPal en cada transacción (gasto deducible).',
      },
    ],
    faq: [
      {
        q: '¿Qué diferencia hay entre PayPal Personal y Business?',
        a: 'Isaak se conecta solo a cuentas PayPal Business, que tienen acceso a la API de transacciones. Las cuentas Personal no permiten integración con APIs de terceros.',
      },
      {
        q: '¿Cómo trata Isaak el IVA de ventas en dólares (USD)?',
        a: 'Isaak convierte los importes al cambio EUR/USD del día de la transacción para calcular el IVA en euros. Las diferencias de cambio se registran como ingreso o gasto financiero.',
      },
    ],
    officialDocs: 'https://developer.paypal.com/docs/api/overview/',
  },

  {
    slug: 'redsys',
    name: 'Redsys',
    sector: 'Pasarela de pagos (TPV Virtual)',
    icon: CreditCard,
    tagline: 'Cobros de TPV Virtual Redsys con IVA desglosado automáticamente',
    description:
      'Redsys procesa el 90% del e-commerce español. Isaak se conecta a tu TPV Virtual bancario (BBVA, Santander, CaixaBank, etc.) para leer cobros, Bizum y operaciones SEPA con IVA desglosado.',
    authLabel: 'Código de comercio (FUC) + Terminal + Clave secreta',
    setupSteps: [
      {
        step: 1,
        title: 'Localiza tus credenciales de TPV Virtual',
        body: 'Tu banco te habrá proporcionado al contratar el TPV Virtual: el Código de Comercio (FUC, 9 dígitos), el número de Terminal y la Clave Secreta de cifrado.',
        note: 'Si no recuerdas las credenciales, contacta con el servicio empresas de tu banco y pide las credenciales del TPV Virtual para integraciones.',
      },
      {
        step: 2,
        title: 'Accede al panel de Redsys (opcional)',
        body: 'Puedes consultar tus transacciones en el portal de Redsys: comercios.redsys.es. Aquí también puedes generar notificaciones (webhooks) para tiempo real.',
      },
      {
        step: 3,
        title: 'Introdúcelos en Isaak',
        body: 'En Isaak → Integraciones → Redsys → introduce el Código de Comercio, número de Terminal y Clave Secreta. Selecciona el entorno (Producción).',
      },
    ],
    syncedItems: [
      {
        label: 'Cobros con tarjeta',
        desc: 'Transacciones aprobadas con importe, hora y referencia de la operación.',
      },
      { label: 'Cobros Bizum', desc: 'Pagos Bizum procesados a través de Redsys.' },
      { label: 'Devoluciones', desc: 'Anulaciones y devoluciones de cargo.' },
      {
        label: 'Liquidaciones bancarias',
        desc: 'Importes liquidados por el banco a tu cuenta, menos comisiones.',
      },
    ],
    faq: [
      {
        q: '¿Isaak funciona con cualquier banco que use Redsys?',
        a: 'Sí. Redsys es la red de pagos compartida por BBVA, Santander, CaixaBank, Sabadell, Bankinter y la mayoría de bancos españoles. Isaak funciona con el TPV Virtual de cualquiera de ellos.',
      },
      {
        q: '¿Qué diferencia hay entre Redsys y el TPV físico del banco?',
        a: 'Redsys procesa los pagos tanto del TPV Virtual (e-commerce) como del TPV físico (datáfono en tienda). Isaak lee ambos tipos si están asociados al mismo Código de Comercio.',
      },
    ],
    officialDocs: 'https://pagosonline.redsys.es',
  },

  {
    slug: 'paylands',
    name: 'Paylands',
    sector: 'Pasarela de pagos',
    icon: CreditCard,
    tagline: 'Pagos con Bizum nativo y tarjeta en España vía Paylands',
    description:
      'Paylands es un gateway español con Bizum nativo especialmente orientado al mercado español. Isaak lee transacciones, liquidaciones y cálculo de IVA en tiempo real para negocios que operan en España.',
    authLabel: 'API key de Paylands',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al dashboard de Paylands',
        body: 'Inicia sesión en el panel de control de Paylands con tu cuenta de merchant.',
      },
      {
        step: 2,
        title: 'Ve a Configuración → API',
        body: 'En el menú de configuración, busca la sección de API o integraciones. Ahí encontrarás tu API key de producción.',
        note: 'Asegúrate de usar la clave de producción (live), no la de test, para datos reales.',
      },
      {
        step: 3,
        title: 'Copia la API key',
        body: 'Copia la API key. Guárdala en un lugar seguro.',
      },
      {
        step: 4,
        title: 'Pégala en Isaak',
        body: 'En Isaak → Integraciones → Paylands → campo "API key". Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      {
        label: 'Pagos con tarjeta y Bizum',
        desc: 'Transacciones aprobadas con importe y referencia.',
      },
      { label: 'Liquidaciones', desc: 'Abonos a tu cuenta bancaria y comisiones descontadas.' },
      { label: 'Devoluciones', desc: 'Cargo-backs y devoluciones con impacto fiscal.' },
    ],
    faq: [
      {
        q: '¿Paylands funciona con WooCommerce y PrestaShop?',
        a: 'Sí, Paylands tiene plugins nativos para ambas plataformas. Isaak puede leer los datos de Paylands independientemente de la plataforma e-commerce que uses.',
      },
    ],
    officialDocs: 'https://paylands.com',
  },

  {
    slug: 'gocardless',
    name: 'GoCardless',
    sector: 'Cobros por domiciliación (SEPA)',
    icon: CreditCard,
    tagline: 'Domiciliaciones SEPA, mandatos y cobros recurrentes con GoCardless',
    description:
      'GoCardless gestiona cobros recurrentes por domiciliación bancaria SEPA. Isaak lee mandatos activos, cobros procesados e impagados para la reconciliación contable y el seguimiento de tesorería.',
    authLabel: 'Access token de GoCardless',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al dashboard de GoCardless',
        body: 'Inicia sesión en dashboard.gocardless.com. Asegúrate de estar en el modo "Live".',
      },
      {
        step: 2,
        title: 'Ve a Developers → Create access token',
        body: 'En el menú lateral, haz clic en "Developers" (icono de código) → "Access tokens" → "Create token". Elige el tipo "Read-only" para mayor seguridad.',
      },
      {
        step: 3,
        title: 'Copia el access token',
        body: 'El token empieza por live_... Cópialo inmediatamente — solo se muestra una vez.',
        note: 'GoCardless cerró nuevos registros para cuentas Basic. Si no tienes cuenta, el banking con Enable Banking (BBVA, Santander, etc.) cubre casos similares.',
      },
      {
        step: 4,
        title: 'Introdúcelo en Isaak',
        body: 'En Isaak → Integraciones → GoCardless → campo "Access token". Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      {
        label: 'Mandatos SEPA activos',
        desc: 'Domiciliaciones vigentes con cliente y banco origen.',
      },
      {
        label: 'Cobros procesados',
        desc: 'Pagos cobrados con éxito con importe, fecha de valor y cliente.',
      },
      {
        label: 'Impagos y rechazos',
        desc: 'Cobros rechazados por el banco con motivo del rechazo.',
      },
      {
        label: 'Pagos diferidos (payouts)',
        desc: 'Abonos que GoCardless realiza a tu cuenta bancaria.',
      },
    ],
    faq: [
      {
        q: '¿GoCardless ya no acepta nuevos registros?',
        a: 'GoCardless cerró el registro de nuevas cuentas Basic a finales de 2025. Si ya tenías cuenta, sigue funcionando. Para nuevos proyectos de domiciliación bancaria, considera las alternativas con SEPA directo de tu banco o Stripe SEPA.',
      },
    ],
    officialDocs: 'https://developer.gocardless.com',
  },

  {
    slug: 'sumup',
    name: 'SumUp',
    sector: 'TPV físico',
    icon: CreditCard,
    tagline: 'Cobros presenciales con datáfono SumUp integrados en tu contabilidad',
    description:
      'SumUp es el TPV físico para cobros presenciales más usado por pequeños negocios en España. Isaak lee ventas, propinas y reembolsos del datáfono para cruzarlos con el cierre de caja diario.',
    authLabel: 'API key de SumUp',
    setupSteps: [
      {
        step: 1,
        title: 'Accede a tu cuenta SumUp',
        body: 'Inicia sesión en me.sumup.com con tu cuenta de merchant.',
      },
      {
        step: 2,
        title: 'Ve a Developer → Aplicaciones → Credenciales',
        body: 'En el perfil de usuario, haz clic en "Developer" o ve a me.sumup.com/developers. Crea una nueva aplicación de tipo "API" y accede a sus credenciales.',
        note: 'Si no ves la sección Developer, puede que necesites activarla contactando con el soporte de SumUp.',
      },
      {
        step: 3,
        title: 'Copia el Client ID y el Client Secret',
        body: 'Copia el Client ID y el Client Secret de tu aplicación. Isaak los usará para autenticarse con OAuth 2.0.',
      },
      {
        step: 4,
        title: 'Conéctalos en Isaak',
        body: 'En Isaak → Integraciones → SumUp → introduce el Client ID y el Client Secret. Serás redirigido brevemente a SumUp para autorizar el acceso.',
      },
    ],
    syncedItems: [
      {
        label: 'Ventas y cobros',
        desc: 'Transacciones del datáfono con producto, importe y fecha.',
      },
      { label: 'Propinas', desc: 'Propinas recibidas desglosadas del importe total.' },
      { label: 'Reembolsos', desc: 'Devoluciones procesadas en el datáfono.' },
      {
        label: 'Resumen diario',
        desc: 'Total de ventas del día para el cierre de caja.',
      },
    ],
    faq: [
      {
        q: '¿Funciona con todos los modelos de datáfono SumUp?',
        a: 'Sí. La integración es a nivel de cuenta, no de dispositivo. Todos los cobros de todos tus datáfonos SumUp aparecen consolidados en Isaak.',
      },
    ],
    officialDocs: 'https://developer.sumup.com',
  },

  // ─── CRM ─────────────────────────────────────────────────────────────────
  {
    slug: 'hubspot',
    name: 'HubSpot',
    sector: 'CRM',
    icon: Users,
    tagline: 'Pipeline de ventas y previsión fiscal trimestral desde HubSpot',
    description:
      'HubSpot es el CRM más usado por pymes en España. Isaak lee deals, contactos y empresas para cruzar el pipeline de ventas con la realidad fiscal y generar previsiones de IVA por trimestre.',
    authLabel: 'Private App Token de HubSpot',
    setupSteps: [
      {
        step: 1,
        title: 'Accede a HubSpot',
        body: 'Inicia sesión en app.hubspot.com. Necesitas permisos de administrador de la cuenta.',
      },
      {
        step: 2,
        title: 'Ve a Configuración → Integraciones → Private Apps',
        body: 'Haz clic en el icono de ajustes (⚙) en la barra superior → "Integraciones" → "Private Apps" → "Crear una private app".',
      },
      {
        step: 3,
        title: 'Configura los permisos de la app',
        body: 'Pon el nombre "Isaak" y activa estos scopes de lectura (read): crm.objects.contacts.read, crm.objects.deals.read, crm.objects.companies.read, crm.objects.line_items.read.',
        note: 'No actives permisos de escritura (write) — Isaak solo lee datos de HubSpot.',
      },
      {
        step: 4,
        title: 'Copia el access token',
        body: 'Haz clic en "Crear app" y copia el token de acceso que empieza por pat-eu1-... o pat-na1-... Haz clic en "Continuar creando" para finalizar.',
      },
      {
        step: 5,
        title: 'Pégalo en Isaak',
        body: 'En Isaak → Integraciones → HubSpot → campo "Access token". Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      { label: 'Deals y oportunidades', desc: 'Pipeline activo, valor de cada deal y etapa.' },
      { label: 'Contactos', desc: 'Nombre, empresa, email y datos de facturación.' },
      {
        label: 'Empresas (accounts)',
        desc: 'Cuentas de empresa con NIF y dirección para facturación.',
      },
      {
        label: 'Actividad de ventas',
        desc: 'Emails, llamadas y reuniones asociadas a cada deal.',
      },
      {
        label: 'Line items (productos)',
        desc: 'Productos y servicios de cada deal con precio e IVA.',
      },
    ],
    faq: [
      {
        q: '¿Puedo conectar HubSpot y Holded al mismo tiempo?',
        a: 'Sí, y es la configuración más potente. Isaak cruza los deals de HubSpot con las facturas de Holded para saber qué deals se han facturado, cuánto IVA generan y qué está pendiente de cobro.',
      },
      {
        q: '¿Qué plan de HubSpot necesito?',
        a: 'La funcionalidad de Private Apps está disponible desde el plan Free. Sin embargo, algunos campos avanzados de deals o line items pueden requerir un plan de pago de HubSpot.',
      },
    ],
    officialDocs: 'https://developers.hubspot.com/docs/api/private-apps',
  },

  {
    slug: 'salesforce',
    name: 'Salesforce',
    sector: 'CRM',
    icon: Users,
    tagline: 'Oportunidades y previsión fiscal desde tu Salesforce',
    description:
      'Salesforce es el CRM líder en empresa. Isaak lee oportunidades, cuentas y contactos para convertir tu pipeline en previsión fiscal trimestral y cruzarlo con la facturación real.',
    authLabel: 'Username + Password + Security Token',
    setupSteps: [
      {
        step: 1,
        title: 'Obtén tu Security Token de Salesforce',
        body: 'Inicia sesión en Salesforce. Haz clic en tu avatar (esquina superior derecha) → "Configuración" → en la búsqueda escribe "Token" → "Restablecer mi token de seguridad". Salesforce te enviará el token por email.',
        note: 'El token de seguridad se concatena con tu contraseña al conectar. Si cambias tu contraseña de Salesforce, necesitarás un nuevo token.',
      },
      {
        step: 2,
        title: 'Prepara tus credenciales',
        body: 'Tendrás: tu username (email de Salesforce), tu contraseña y el Security Token que recibiste por email.',
      },
      {
        step: 3,
        title: 'Conéctalos en Isaak',
        body: 'En Isaak → Integraciones → Salesforce → introduce el username, password y security token. Selecciona el entorno: "Producción" (login.salesforce.com) o "Sandbox" (test.salesforce.com).',
      },
    ],
    syncedItems: [
      {
        label: 'Oportunidades (Opportunities)',
        desc: 'Pipeline activo, probabilidad de cierre e importe esperado.',
      },
      { label: 'Cuentas (Accounts)', desc: 'Empresas cliente con datos de facturación y NIF.' },
      { label: 'Contactos', desc: 'Personas clave de cada cuenta.' },
      { label: 'Actividades y tareas', desc: 'Emails, llamadas y reuniones del equipo de ventas.' },
      {
        label: 'Products y Price Books',
        desc: 'Catálogo de productos y precios de cada oportunidad.',
      },
    ],
    faq: [
      {
        q: '¿Funciona con Salesforce Essentials?',
        a: 'Sí, Isaak es compatible con todos los planes de Salesforce (Essentials, Professional, Enterprise, Unlimited) que permiten acceso API.',
      },
      {
        q: '¿Cómo gestiona Isaak los campos personalizados de Salesforce?',
        a: 'Isaak lee los campos estándar de Salesforce (importe, stage, fecha de cierre, etc.). Los campos personalizados no se sincronizan en esta versión.',
      },
    ],
    officialDocs: 'https://developer.salesforce.com/docs/apis',
  },

  {
    slug: 'pipedrive',
    name: 'Pipedrive',
    sector: 'CRM',
    icon: Users,
    tagline: 'Deals, contactos e ingresos de Pipedrive en tu contabilidad',
    description:
      'Pipedrive es el CRM más usado por equipos de ventas en Europa. Isaak lee el pipeline, deals ganados y contactos para cruzar las ventas con la fiscalidad real.',
    authLabel: 'Personal API Token de Pipedrive',
    setupSteps: [
      {
        step: 1,
        title: 'Accede a tu perfil de Pipedrive',
        body: 'Inicia sesión en pipedrive.com y haz clic en tu nombre de usuario (esquina superior derecha) → "Personal preferences".',
      },
      {
        step: 2,
        title: 'Ve a API',
        body: 'En el menú de Personal Preferences, haz clic en la pestaña "API". Verás tu "Your personal API token".',
      },
      {
        step: 3,
        title: 'Copia el API token',
        body: 'Copia el token (cadena alfanumérica de 40 caracteres). Este token da acceso a tu cuenta con los mismos permisos que tu usuario.',
        note: 'Para mayor seguridad, considera crear un usuario "de integración" en Pipedrive con solo permisos de lectura y usar su token.',
      },
      {
        step: 4,
        title: 'Pégalo en Isaak',
        body: 'En Isaak → Integraciones → Pipedrive → campo "API token". Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      { label: 'Deals', desc: 'Pipeline con etapas, valor y probabilidad de cierre.' },
      {
        label: 'Personas y Organizaciones',
        desc: 'Contactos y empresas con datos de facturación.',
      },
      { label: 'Actividades', desc: 'Llamadas, emails y reuniones del equipo.' },
      {
        label: 'Productos de deals',
        desc: 'Productos y precios asociados a cada deal ganado.',
      },
    ],
    faq: [
      {
        q: '¿Qué plan de Pipedrive necesito para usar la API?',
        a: 'El acceso a la API de Pipedrive está disponible desde el plan Essential. La API tiene límites de llamadas por plan — con Essential son suficientes para la sincronización de Isaak.',
      },
    ],
    officialDocs: 'https://developers.pipedrive.com/docs/api/v1',
  },

  // ─── Banca ───────────────────────────────────────────────────────────────
  {
    slug: 'open-banking',
    name: 'Open Banking PSD2',
    sector: 'Banca española y europea',
    icon: Landmark,
    tagline: 'Conecta tu banco vía PSD2 — saldos y movimientos en tiempo real',
    description:
      'Isaak usa Enable Banking (PSD2 AIS) para conectar con más de 30 bancos españoles y europeos: BBVA, Santander, CaixaBank, ING, Sabadell, Bankinter, Unicaja, Revolut, N26 y más. Sin compartir contraseñas — solo autorizas a Isaak en tu banco.',
    authLabel: 'Autorización OAuth en tu banco (sin API key)',
    setupSteps: [
      {
        step: 1,
        title: 'Ve a Isaak → Banking',
        body: 'En el menú lateral de Isaak, haz clic en "Banking" (icono de banco). Verás la lista de bancos disponibles.',
      },
      {
        step: 2,
        title: 'Selecciona tu banco',
        body: 'Busca tu banco en la lista (BBVA, Santander, CaixaBank, ING, Sabadell, Bankinter, Unicaja, Kutxabank, Ibercaja, Revolut, N26, Wise, etc.) y haz clic en "Conectar".',
      },
      {
        step: 3,
        title: 'Autoriza en el portal de tu banco',
        body: 'Serás redirigido al portal de autenticación de tu banco. Inicia sesión con tus credenciales bancarias habituales. Tu banco te pedirá que confirmes el acceso para Isaak (lectura de saldos y movimientos).',
        note: 'Isaak NUNCA recibe ni almacena tus credenciales bancarias. La autorización es directa entre tú y tu banco mediante el protocolo PSD2.',
      },
      {
        step: 4,
        title: 'Selecciona las cuentas a conectar',
        body: 'Una vez autorizado, selecciona qué cuentas quieres sincronizar con Isaak. Puedes añadir cuentas corrientes, cuentas de ahorro y tarjetas.',
      },
    ],
    syncedItems: [
      {
        label: 'Saldos en tiempo real',
        desc: 'Saldo disponible y contable de cada cuenta conectada.',
      },
      {
        label: 'Movimientos bancarios',
        desc: 'Todos los movimientos de los últimos 90 días, con descripción y contrapartida.',
      },
      {
        label: 'Conciliación automática',
        desc: 'Isaak cruza los movimientos bancarios con tus facturas para detectar cobros y pagos pendientes.',
      },
      {
        label: 'Alertas de tesorería',
        desc: 'Notificaciones cuando el saldo baja de un mínimo configurado.',
      },
      {
        label: 'Previsión de tesorería',
        desc: 'Estimación de saldo futuro basada en pagos y cobros esperados.',
      },
    ],
    faq: [
      {
        q: '¿Es seguro dar acceso a Isaak a mis cuentas bancarias?',
        a: 'Sí. La conexión sigue el protocolo PSD2 (Payment Services Directive 2), la normativa europea más estricta de open banking. Isaak solo tiene permiso de lectura (AIS) — nunca puede mover dinero de tus cuentas. Las credenciales bancarias nunca pasan por Isaak.',
      },
      {
        q: '¿Cuánto tiempo dura la autorización?',
        a: 'La autorización PSD2 dura 90 días. Isaak te avisará cuando esté próxima a expirar para que la renueves con un solo clic.',
      },
      {
        q: '¿Mi banco no está en la lista?',
        a: 'Si tu banco tiene Open Banking PSD2 (obligatorio en la UE desde 2019) y no está en la lista, contacta con soporte@verifactu.business y lo añadiremos a la integración.',
      },
      {
        q: '¿Puedo conectar cuentas de empresa y personales?',
        a: 'Puedes conectar tanto cuentas de empresa como personales. Sin embargo, para la fiscalidad de tu negocio, te recomendamos conectar solo las cuentas de empresa.',
      },
      {
        q: '¿Con cuántos bancos puedo conectar a la vez?',
        a: 'No hay límite. Puedes conectar todas las cuentas bancarias que quieras, de distintos bancos, y Isaak las consolida en una sola vista de tesorería.',
      },
    ],
    officialDocs: 'https://enablebanking.com',
  },

  // ─── Logística ───────────────────────────────────────────────────────────
  {
    slug: 'sendcloud',
    name: 'Sendcloud',
    sector: 'Logística',
    icon: Package,
    tagline: 'Envíos, costes logísticos y márgenes por pedido desde Sendcloud',
    description:
      'Sendcloud agrega los principales transportistas (GLS, SEUR, DHL, MRW, Correos) en una sola integración. Isaak lee costes de envío, estados de entrega y devoluciones para calcular el margen real por pedido.',
    authLabel: 'Public Key + Secret Key de Sendcloud',
    setupSteps: [
      {
        step: 1,
        title: 'Accede al panel de Sendcloud',
        body: 'Inicia sesión en panel.sendcloud.com con tu cuenta.',
      },
      {
        step: 2,
        title: 'Ve a Ajustes → Integraciones → Sendcloud API',
        body: 'En el panel lateral, haz clic en "Ajustes" (icono de engranaje) → "Integraciones" → "Sendcloud API". Haz clic en "Añadir" para crear una nueva integración de API.',
      },
      {
        step: 3,
        title: 'Crea la integración y copia las claves',
        body: 'Pon "Isaak" como nombre. Sendcloud generará una Public Key y un Secret Key. Copia ambas — el Secret Key solo se muestra una vez.',
        note: 'Si cierras la ventana sin copiar el Secret Key, tendrás que crear una nueva integración.',
      },
      {
        step: 4,
        title: 'Introdúcelas en Isaak',
        body: 'En Isaak → Integraciones → Sendcloud → introduce la Public Key y el Secret Key. Haz clic en "Guardar y conectar".',
      },
    ],
    syncedItems: [
      {
        label: 'Envíos y etiquetas',
        desc: 'Todos los envíos generados con transportista, servicio y coste.',
      },
      {
        label: 'Estados de entrega',
        desc: 'Seguimiento en tiempo real: en tránsito, entregado, fallido, devuelto.',
      },
      {
        label: 'Devoluciones logísticas',
        desc: 'Envíos devueltos con coste de retorno para el cálculo de margen.',
      },
      {
        label: 'Costes por transportista',
        desc: 'Desglose de gasto por carrier (GLS, SEUR, DHL, etc.) para optimizar la elección.',
      },
    ],
    faq: [
      {
        q: '¿Con qué transportistas es compatible Sendcloud?',
        a: 'Sendcloud integra GLS, SEUR, DHL Express, DHL Parcel, MRW, Correos, Correos Express, Nacex y más de 50 carriers. Isaak lee los datos de todos ellos de forma consolidada.',
      },
      {
        q: '¿Cómo calcula Isaak el margen real por pedido?',
        a: 'Isaak cruza el ingreso del pedido (de WooCommerce, PrestaShop, Holded, etc.) con el coste de envío de Sendcloud para calcular el margen bruto real. Incluye devoluciones y re-envíos.',
      },
      {
        q: '¿Sendcloud IVA — ¿aplica el IVA de los portes?',
        a: 'Los gastos de envío tributan al 21% de IVA. Isaak registra automáticamente el IVA soportado de tus gastos de Sendcloud como deducible en el modelo 303.',
      },
    ],
    officialDocs: 'https://docs.sendcloud.com/api/v2',
  },
];

export function getConnectorHelp(slug: string): ConnectorHelp | undefined {
  return connectorHelpData.find((c) => c.slug === slug);
}

export function getAllSlugs(): string[] {
  return connectorHelpData.map((c) => c.slug);
}
