'use client';

/**
 * Mensajes proactivos de Isaak en múltiples idiomas
 * Se usa en hooks/useProactiveMessages.ts
 */

export type ProactiveMessageType = 'info' | 'warning' | 'success' | 'tip';

export interface ProactiveMessage {
  id: string;
  title: string;
  message: string;
  action?: string;
  href?: string;
  icon: ProactiveMessageType;
  delay: number;
}

type LanguageCode = 'es' | 'en' | 'pt' | 'fr';

export const PROACTIVE_MESSAGES_I18N: Record<
  LanguageCode,
  Record<string, Record<string, ProactiveMessage[]>>
> = {
  es: {
    landing: {
      visitor: [
        {
          id: 'welcome',
          title: '👋 Bienvenido a Verifactu',
          message:
            'Soy Isaak, tu asistente fiscal. Puedo ayudarte con VeriFactu, facturas e impuestos.',
          icon: 'info',
          delay: 3000,
        },
        {
          id: 'vat-help',
          title: '¿Confundido con IVA?',
          message:
            'He ayudado a miles de autónomos a entender sus obligaciones fiscales sin miedo. ¿Empezamos?',
          icon: 'tip',
          delay: 8000,
        },
        {
          id: 'veri-simplified',
          title: '📋 VeriFactu simplificado',
          message:
            'Ya no es complicado. Explicaré qué es, cuándo aplica y cómo cumplir sin estrés.',
          icon: 'success',
          delay: 12000,
        },
      ],
    },
    dashboard: {
      user: [
        {
          id: 'daily-check',
          title: '📊 Tu resumen hoy',
          message: 'Tu beneficio del mes y tus facturas pendientes estan listos para revisar.',
          icon: 'info',
          delay: 2000,
        },
        {
          id: 'veri-reminder',
          title: '⏰ Recordatorio VeriFactu',
          message: '¿Has subido tus facturas de hoy a la AEAT? Yo te ayudo si tienes dudas.',
          icon: 'tip',
          delay: 10000,
        },
        {
          id: 'expense-smart',
          title: '💡 Gastos inteligentes',
          message: 'Sube receipts y yo los clasifico automáticamente. Ahorra 10 minutos al día.',
          icon: 'success',
          delay: 15000,
        },
        {
          id: 'deduction-check',
          title: '💰 Deducciones',
          message: '¿Sabes cuáles son tus gastos deducibles? Puedo revisarlos contigo.',
          icon: 'info',
          delay: 20000,
        },
      ],
    },
    admin: {
      admin: [
        {
          id: 'admin-welcome',
          title: '🔐 Panel de Control',
          message: 'Hola admin. Tengo 5 empresas activas con 200€ en pagos pendientes.',
          icon: 'info',
          delay: 2000,
        },
        {
          id: 'import-hint',
          title: '📥 Importación rápida',
          message: '¿Necesitas añadir empresas? Puedo importar un CSV en segundos.',
          icon: 'tip',
          delay: 5000,
        },
        {
          id: 'reporting',
          title: '📈 Reportes listos',
          message: 'Genera modelos 303, 390 o balance general al instante.',
          icon: 'success',
          delay: 8000,
        },
        {
          id: 'health-check',
          title: '🏥 Estado de la plataforma',
          message: 'Todas las empresas sincronizadas. 2 documentos pendientes de revisar.',
          icon: 'info',
          delay: 12000,
        },
      ],
    },
  },

  en: {
    landing: {
      visitor: [
        {
          id: 'welcome',
          title: '👋 Welcome to Verifactu',
          message:
            "I'm Isaak, your fiscal assistant. I can help you with VeriFactu, invoices and taxes.",
          icon: 'info',
          delay: 3000,
        },
        {
          id: 'vat-help',
          title: 'Confused about VAT?',
          message:
            "I've helped thousands of freelancers understand their tax obligations without fear. Shall we start?",
          icon: 'tip',
          delay: 8000,
        },
        {
          id: 'veri-simplified',
          title: '📋 VeriFactu simplified',
          message:
            "It's no longer complicated. I'll explain what it is, when it applies, and how to comply stress-free.",
          icon: 'success',
          delay: 12000,
        },
      ],
    },
    dashboard: {
      user: [
        {
          id: 'daily-check',
          title: '📊 Your summary today',
          message: 'Your monthly profit and pending invoices are ready to review.',
          icon: 'info',
          delay: 2000,
        },
        {
          id: 'veri-reminder',
          title: '⏰ VeriFactu reminder',
          message:
            'Have you uploaded your invoices to the AEAT today? I can help if you have questions.',
          icon: 'tip',
          delay: 10000,
        },
        {
          id: 'expense-smart',
          title: '💡 Smart expenses',
          message: "Upload receipts and I'll classify them automatically. Save 10 minutes a day.",
          icon: 'success',
          delay: 15000,
        },
      ],
    },
    admin: {
      admin: [
        {
          id: 'admin-welcome',
          title: '🔐 Control Panel',
          message: 'Hello admin. I have 5 active companies with €200 in pending payments.',
          icon: 'info',
          delay: 2000,
        },
        {
          id: 'import-hint',
          title: '📥 Quick import',
          message: 'Need to add companies? I can import a CSV in seconds.',
          icon: 'tip',
          delay: 5000,
        },
        {
          id: 'reporting',
          title: '📈 Reports ready',
          message: 'Generate models 303, 390 or balance sheet instantly.',
          icon: 'success',
          delay: 8000,
        },
      ],
    },
  },

  pt: {
    landing: {
      visitor: [
        {
          id: 'welcome',
          title: '👋 Bem-vindo ao Verifactu',
          message:
            'Sou Isaak, seu assistente fiscal. Posso ajudá-lo com VeriFactu, faturas e impostos.',
          icon: 'info',
          delay: 3000,
        },
        {
          id: 'vat-help',
          title: 'Confuso com IVA?',
          message: 'Ajudei milhares de autônomos a entender suas obrigações fiscais sem medo.',
          icon: 'tip',
          delay: 8000,
        },
      ],
    },
    dashboard: {
      user: [
        {
          id: 'daily-check',
          title: '📊 Seu resumo hoje',
          message: 'Seu lucro do mes e suas faturas pendentes estao prontos para revisao.',
          icon: 'info',
          delay: 2000,
        },
        {
          id: 'veri-reminder',
          title: '⏰ Lembrete VeriFactu',
          message: 'Você enviou suas faturas de hoje para a AEAT? Posso ajudar.',
          icon: 'tip',
          delay: 10000,
        },
      ],
    },
    admin: {
      admin: [
        {
          id: 'admin-welcome',
          title: '🔐 Painel de Controle',
          message: 'Olá admin. Tenho 5 empresas ativas com €200 em pagamentos pendentes.',
          icon: 'info',
          delay: 2000,
        },
      ],
    },
  },

  fr: {
    landing: {
      visitor: [
        {
          id: 'welcome',
          title: '👋 Bienvenue sur Verifactu',
          message:
            'Je suis Isaak, votre assistant fiscal. Je peux vous aider avec VeriFactu, les factures et les impôts.',
          icon: 'info',
          delay: 3000,
        },
        {
          id: 'vat-help',
          title: 'Confus par la TVA?',
          message:
            "J'ai aidé des milliers de travailleurs indépendants à comprendre leurs obligations fiscales sans peur.",
          icon: 'tip',
          delay: 8000,
        },
      ],
    },
    dashboard: {
      user: [
        {
          id: 'daily-check',
          title: "📊 Votre résumé aujourd'hui",
          message: 'Votre benefice du mois et vos factures en attente sont prets a etre consultes.',
          icon: 'info',
          delay: 2000,
        },
        {
          id: 'veri-reminder',
          title: '⏰ Rappel VeriFactu',
          message: "Avez-vous envoyé vos factures d'aujourd'hui? Je peux vous aider.",
          icon: 'tip',
          delay: 10000,
        },
      ],
    },
    admin: {
      admin: [
        {
          id: 'admin-welcome',
          title: '🔐 Panneau de Contrôle',
          message: "Bonjour admin. J'ai 5 entreprises actives avec 200€ de paiements en attente.",
          icon: 'info',
          delay: 2000,
        },
      ],
    },
  },
};

export function getProactiveMessages(
  language: string,
  context: string,
  role: string
): ProactiveMessage[] {
  const lang = (language as LanguageCode) || 'es';
  const contextMessages = PROACTIVE_MESSAGES_I18N[lang]?.[context]?.[role] || [];
  return contextMessages;
}
