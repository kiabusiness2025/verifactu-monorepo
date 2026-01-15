import { IsaakTone } from "@/hooks/useIsaakTone";

/**
 * Formatea un mensaje de Isaak según el tono de conversación configurado
 * 
 * @param content - Mensaje original (siempre en tono "friendly")
 * @param tone - Tono configurado por el usuario
 * @returns Mensaje formateado según el tono
 */
export function formatIsaakMessage(content: string, tone: IsaakTone): string {
  if (tone === "friendly") {
    // Tono por defecto, retornar sin cambios
    return content;
  }

  if (tone === "professional") {
    // Reducir emoticonos (máximo 1 por mensaje)
    let formatted = content;
    
    // Detectar emoticonos comunes (compatible con ES5)
    const emojiRegex = /[\u2600-\u27BF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
    const emojis = content.match(emojiRegex) || [];
    
    if (emojis.length > 1) {
      // Mantener solo el primero
      let emojiCount = 0;
      formatted = content.replace(emojiRegex, (match) => {
        emojiCount++;
        return emojiCount === 1 ? match : "";
      });
    }
    
    // Eliminar exclamaciones abiertas
    formatted = formatted.replace(/¡/g, "");
    
    // Reducir exclamaciones múltiples a una
    formatted = formatted.replace(/!{2,}/g, "!");
    
    // Cambiar expresiones muy informales
    formatted = formatted
      .replace(/¡Genial!/g, "Muy bien")
      .replace(/¡Perfecto!/g, "Correcto")
      .replace(/¡Vamos!/g, "Continuemos");
    
    return formatted.trim();
  }

  if (tone === "minimal") {
    // Eliminar TODOS los emoticonos (compatible con ES5)
    let formatted = content.replace(
      /[\u2600-\u27BF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
      ""
    );
    
    // Eliminar exclamaciones
    formatted = formatted.replace(/[¡!]/g, ".");
    
    // Tomar solo la primera frase (hasta primer punto)
    const firstSentence = formatted.split(/[.?]/)[0];
    
    // Si es muy corto, retornar completo
    if (firstSentence.length < 20) {
      return formatted.trim();
    }
    
    return firstSentence.trim() + ".";
  }

  return content;
}

/**
 * Obtiene el mensaje de bienvenida de Isaak según el tono
 */
export function getIsaakGreeting(userName: string, tone: IsaakTone): string {
  const greetings = {
    friendly: `¡Hola ${userName}! 👋\n\nSoy Isaak, tu compañero fiscal 😊\n\n¿En qué puedo ayudarte hoy?`,
    professional: `Hola ${userName}.\n\nSoy Isaak, tu asistente fiscal.\n\n¿En qué puedo ayudarte?`,
    minimal: `Hola ${userName}.\n\n¿Cómo puedo ayudarte?`,
  };

  return greetings[tone];
}

/**
 * Obtiene el disclaimer de Isaak según el tono
 */
export function getIsaakDisclaimer(tone: IsaakTone): string {
  const disclaimers = {
    friendly: `⚠️ Recuerda: NO sustituyo a tu gestor o asesor contable 😊\n\nTe ayudo con la gestión diaria, pero siempre consulta con tu profesional para temas oficiales.`,
    professional: `Recordatorio: Este asistente no sustituye a tu gestor o asesor contable.\n\nConsulta con tu profesional para temas fiscales oficiales.`,
    minimal: `No sustituyo a tu gestor. Consulta con tu profesional.`,
  };

  return disclaimers[tone];
}
