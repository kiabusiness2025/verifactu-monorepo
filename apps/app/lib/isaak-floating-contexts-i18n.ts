"use client";

/**
 * Contextos de chat flotante de Isaak en múltiples idiomas
 * Se usa en IsaakSmartFloating.tsx
 */

export interface IsaakFloatingContext {
  greeting: string;
  suggestions: string[];
  prompt: string;
}

type LanguageCode = "es" | "en" | "pt" | "fr";
type ContextKey = "landing:visitor" | "dashboard:user" | "admin:admin";

export const ISAAK_FLOATING_CONTEXTS_I18N: Record<
  LanguageCode,
  Record<ContextKey, IsaakFloatingContext>
> = {
  es: {
    "landing:visitor": {
      greeting: "Hola 👋 Soy Isaak, tu experto en fiscalidad",
      suggestions: [
        "¿Qué es VeriFactu?",
        "¿Cómo funciona el IVA?",
        "¿Qué datos necesito?",
      ],
      prompt:
        "Soy Isaak, asistente en contabilidad y fiscalidad española. El usuario está en la landing page. Sé breve, amable y sin tecnicismos.",
    },

    "dashboard:user": {
      greeting: "Hola de nuevo 👋 ¿Qué necesitas?",
      suggestions: [
        "Mi beneficio hoy",
        "Subir gasto",
        "Ver facturas pendientes",
      ],
      prompt:
        "Soy Isaak, asistente personal del usuario en Verifactu Business. El usuario está gestionando su negocio. Ofrece ayuda práctica y directa.",
    },

    "admin:admin": {
      greeting: "Bienvenido al panel admin 🔐",
      suggestions: ["Estado de empresas", "Generar reportes", "Importar datos"],
      prompt:
        "Soy Isaak, asistente administrativo. El usuario es un admin. Proporciona información técnica y de negocio cuando sea necesario.",
    },
  },

  en: {
    "landing:visitor": {
      greeting: "Hi 👋 I'm Isaak, your tax expert",
      suggestions: [
        "What is VeriFactu?",
        "How does VAT work?",
        "What data do I need?",
      ],
      prompt:
        "I'm Isaak, a Spanish tax and accounting assistant. The user is on the landing page. Be brief, friendly and avoid jargon.",
    },

    "dashboard:user": {
      greeting: "Hi again 👋 What do you need?",
      suggestions: ["My profit today", "Upload expense", "Pending invoices"],
      prompt:
        "I'm Isaak, the user's personal assistant in Verifactu Business. The user is managing their business. Offer practical and direct help.",
    },

    "admin:admin": {
      greeting: "Welcome to admin panel 🔐",
      suggestions: ["Company status", "Generate reports", "Import data"],
      prompt:
        "I'm Isaak, the admin assistant. The user is an admin. Provide technical and business information as needed.",
    },
  },

  pt: {
    "landing:visitor": {
      greeting: "Olá 👋 Sou Isaak, seu especialista fiscal",
      suggestions: [
        "O que é VeriFactu?",
        "Como funciona o IVA?",
        "Que dados preciso?",
      ],
      prompt:
        "Sou Isaak, assistente em contabilidade e fiscalidade. O usuário está na página inicial. Seja breve, amigável e sem jargão.",
    },

    "dashboard:user": {
      greeting: "Olá novamente 👋 O que você precisa?",
      suggestions: ["Meu lucro hoje", "Enviar despesa", "Faturas pendentes"],
      prompt:
        "Sou Isaak, assistente pessoal do usuário no Verifactu Business. O usuário está gerenciando seu negócio.",
    },

    "admin:admin": {
      greeting: "Bem-vindo ao painel admin 🔐",
      suggestions: ["Status das empresas", "Gerar relatórios", "Importar dados"],
      prompt:
        "Sou Isaak, assistente administrativo. O usuário é um admin. Forneça informações técnicas e comerciais.",
    },
  },

  fr: {
    "landing:visitor": {
      greeting: "Bonjour 👋 Je suis Isaak, votre expert fiscal",
      suggestions: [
        "Qu'est-ce que VeriFactu?",
        "Comment fonctionne la TVA?",
        "Quelles données ai-je besoin?",
      ],
      prompt:
        "Je suis Isaak, assistant en comptabilité et fiscalité. L'utilisateur est sur la page d'accueil. Soyez brefs, amicaux et évitez le jargon.",
    },

    "dashboard:user": {
      greeting: "Bonjour à nouveau 👋 De quoi avez-vous besoin?",
      suggestions: [
        "Mon bénéfice aujourd'hui",
        "Télécharger une dépense",
        "Factures en attente",
      ],
      prompt:
        "Je suis Isaak, l'assistant personnel de l'utilisateur dans Verifactu Business. L'utilisateur gère son entreprise.",
    },

    "admin:admin": {
      greeting: "Bienvenue au panneau d'administration 🔐",
      suggestions: [
        "État des entreprises",
        "Générer des rapports",
        "Importer des données",
      ],
      prompt:
        "Je suis Isaak, l'assistant d'administration. L'utilisateur est un administrateur. Fournir des informations techniques et commerciales.",
    },
  },
};

export function getIsaakFloatingContext(
  language: string,
  context: string,
  role: string
): IsaakFloatingContext {
  const lang = (language as LanguageCode) || "es";
  const contextKey = `${context}:${role}` as ContextKey;

  const defaultContext: IsaakFloatingContext = {
    greeting: "Hola 👋 ¿Qué necesitas?",
    suggestions: ["Hacer una pregunta"],
    prompt: "Soy Isaak, asistente fiscal de Verifactu Business.",
  };

  return (
    ISAAK_FLOATING_CONTEXTS_I18N[lang]?.[contextKey] || defaultContext
  );
}
