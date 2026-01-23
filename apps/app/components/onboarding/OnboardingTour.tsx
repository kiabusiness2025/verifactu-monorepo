'use client';

import { Button } from '@verifactu/ui';
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Receipt,
  TrendingUp,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip: string;
}

const STEPS: Step[] = [
  {
    title: 'Bienvenido a Empresa Demo SL',
    description:
      'Estas en una empresa de prueba con datos reales. Explora libremente sin miedo a romper nada.',
    icon: <Building2 className="h-8 w-8 text-blue-600" />,
    tip: 'Cuando quieras, crea tu empresa desde Configuracion > Empresa.',
  },
  {
    title: 'Registra tus ventas y gastos',
    description:
      'Anade facturas emitidas y recibidas de forma sencilla. Solo los datos esenciales, sin friccion.',
    icon: <Receipt className="h-8 w-8 text-blue-600" />,
    tip: 'Isaak puede ayudarte a registrar facturas mas rapido.',
  },
  {
    title: 'Ve tu beneficio en tiempo real',
    description: 'Ventas - gastos = beneficio. Asi de simple. Siempre actualizado, siempre claro.',
    icon: <TrendingUp className="h-8 w-8 text-emerald-600" />,
    tip: 'Los graficos se actualizan automaticamente con cada factura.',
  },
  {
    title: 'Preguntale a Isaak',
    description:
      'Tu asistente fiscal esta disponible 24/7. Pregunta sobre impuestos, facturas o tu negocio.',
    icon: <MessageSquare className="h-8 w-8 text-cyan-600" />,
    tip: 'Isaak habla tu idioma, sin tecnicismos fiscales.',
  },
  {
    title: 'No pierdas fechas fiscales',
    description: 'Recibe recordatorios de IVA, IRPF y otros impuestos con tiempo suficiente.',
    icon: <Bell className="h-8 w-8 text-orange-600" />,
    tip: 'Configura tus notificaciones en ajustes.',
  },
];

export function OnboardingTour({ isOpen, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const isLastStep = currentStep === STEPS.length - 1;
  const step = STEPS[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onSkip}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-8 flex gap-2">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50">
            {step.icon}
          </div>
        </div>

        <div className="mb-8 text-center">
          <h3 className="mb-3 text-2xl font-bold text-slate-900">{step.title}</h3>
          <p className="mb-4 text-base leading-relaxed text-slate-600">{step.description}</p>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm text-slate-700">
              <strong>Consejo:</strong> {step.tip}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button
            onClick={handlePrev}
            variant="secondary"
            className="rounded-xl border-slate-300 text-slate-700"
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-5 w-5" />
            Atras
          </Button>

          <span className="text-sm font-medium text-slate-500">
            {currentStep + 1} de {STEPS.length}
          </span>

          <Button
            onClick={handleNext}
            className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600"
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Empezar
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {!isLastStep && (
          <div className="mt-4 text-center">
            <button onClick={onSkip} className="text-sm text-slate-500 hover:text-slate-700">
              Saltar tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
