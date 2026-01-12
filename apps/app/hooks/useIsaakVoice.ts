/**
 * useIsaakVoice - Text-to-Speech integration for Isaak using Web Speech API
 * Allows Isaak to "speak" responses with language-aware voice configuration
 */

import { useCallback, useRef } from "react";

export interface VoiceConfig {
  enabled: boolean;
  rate: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0 - 1
  language: string; // es, en, pt, fr
}

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  rate: 1,
  pitch: 1,
  volume: 1,
  language: "es",
};

const VOICE_CONFIG_KEY = "isaak_voice_config";

export function useIsaakVoice() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false);

  // Get voice configuration
  const getVoiceConfig = useCallback((): VoiceConfig => {
    if (typeof window === "undefined") return DEFAULT_VOICE_CONFIG;
    const stored = localStorage.getItem(VOICE_CONFIG_KEY);
    return stored
      ? { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(stored) }
      : DEFAULT_VOICE_CONFIG;
  }, []);

  // Save voice configuration
  const saveVoiceConfig = useCallback((config: VoiceConfig) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(config));
  }, []);

  // Get available voices for a language
  const getVoicesForLanguage = useCallback(
    (language: string): SpeechSynthesisVoice[] => {
      if (typeof window === "undefined") return [];
      const allVoices = window.speechSynthesis.getVoices();
      const langCode = language === "es" ? "es" : language;
      return allVoices.filter(
        (voice) =>
          voice.lang.startsWith(langCode) ||
          voice.lang.startsWith(`${langCode}-`)
      );
    },
    []
  );

  // Speak text with configuration
  const speak = useCallback(
    (text: string, language?: string) => {
      if (typeof window === "undefined") return;

      const config = getVoiceConfig();
      const lang = language || config.language;

      if (!config.enabled || !window.speechSynthesis) {
        console.log("Voice disabled or not supported");
        return;
      }

      // Cancel any existing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = config.rate;
      utterance.pitch = config.pitch;
      utterance.volume = config.volume;

      // Map language codes to BCP 47
      const langMap: Record<string, string> = {
        es: "es-ES",
        en: "en-US",
        pt: "pt-BR",
        fr: "fr-FR",
      };

      utterance.lang = langMap[lang] || "es-ES";

      // Select appropriate voice if available
      const voices = getVoicesForLanguage(lang);
      if (voices.length > 0) {
        // Prefer female voices for Isaak
        const femaleVoice = voices.find(
          (v) => v.name.toLowerCase().includes("female") ||
                 v.name.toLowerCase().includes("mujer")
        ) || voices[0];
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        isSpeakingRef.current = false;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [getVoiceConfig, getVoicesForLanguage]
  );

  // Stop speaking
  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
  }, []);

  // Pause speaking
  const pause = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis.paused) return;
    window.speechSynthesis.pause();
  }, []);

  // Resume speaking
  const resume = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis.paused) return;
    window.speechSynthesis.resume();
  }, []);

  // Check if currently speaking
  const isSpeaking = useCallback(() => {
    return isSpeakingRef.current || (window?.speechSynthesis?.speaking ?? false);
  }, []);

  // Speak with SSML-like support (for better control)
  const speakWithEmphasis = useCallback(
    (parts: Array<{ text: string; emphasis?: "normal" | "strong" }>, language?: string) => {
      const fullText = parts.map((p) => p.text).join(" ");
      speak(fullText, language);
    },
    [speak]
  );

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    speakWithEmphasis,
    getVoiceConfig,
    saveVoiceConfig,
    getVoicesForLanguage,
  };
}
