"use client";

import { useState } from "react";
import { useIsaakTone, IsaakTone } from "@/hooks/useIsaakTone";
import { getIsaakGreeting } from "@/lib/formatIsaakMessage";

interface ToneOption {
  value: IsaakTone;
  label: string;
  emoji: string;
  description: string;
  example: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    value: "friendly",
    label: "Cercano",
    emoji: "🤗",
    description: "Emoticonos, frases amigables, bromas ocasionales",
    example: "¡Genial! Ya tienes 3 facturas registradas 🎉",
  },
  {
    value: "professional",
    label: "Profesional",
    emoji: "💼",
    description: "Claro y directo, menos emoticonos",
    example: "Muy bien. 3 facturas registradas correctamente ✓",
  },
  {
    value: "minimal",
    label: "Mínimo",
    emoji: "📝",
    description: "Sin emoticonos, máxima brevedad",
    example: "3 facturas registradas",
  },
];

export default function IsaakToneSettings() {
  const { tone, updateTone, isLoading, error } = useIsaakTone();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToneChange = async (newTone: IsaakTone) => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      await updateTone(newTone);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error changing tone:", err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          🎨 Personaliza cómo habla Isaak
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Elige el tono de conversación que prefieras
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Success message */}
      {saveSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800">✅ Preferencia guardada</p>
        </div>
      )}

      {/* Tone options */}
      <div className="space-y-3">
        {TONE_OPTIONS.map((option) => {
          const isSelected = tone === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => handleToneChange(option.value)}
              disabled={saving}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }
                ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div className="mt-1">
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${isSelected ? "border-blue-500" : "border-gray-300"}
                    `}
                  >
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="font-semibold text-gray-900">
                      {option.label}
                    </span>
                    {isSelected && (
                      <span className="text-xs text-blue-600 font-medium">
                        (seleccionado)
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {option.description}
                  </p>

                  <div className="bg-gray-50 rounded p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Ejemplo:</p>
                    <p className="text-sm text-gray-700">{option.example}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-600 font-medium mb-2">
          Vista previa del saludo:
        </p>
        <div className="bg-white rounded p-3 text-sm text-gray-800 whitespace-pre-line">
          {getIsaakGreeting("Usuario", tone)}
        </div>
      </div>
    </div>
  );
}
