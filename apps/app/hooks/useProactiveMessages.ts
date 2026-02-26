'use client';

import { useIsaakDetection } from '@/hooks/useIsaakDetection';
import { getProactiveMessages } from '@/lib/isaak-messages-i18n';
import { usePathname } from 'next/navigation';

export function useProactiveMessages() {
  const detection = useIsaakDetection();
  const pathname = usePathname() ?? '';
  const basePath = pathname.startsWith('/demo') ? '/demo' : '/dashboard';

  const messages = getProactiveMessages(detection.language, detection.context, detection.role);

  const messagesWithDefaults = messages.map((msg) => {
    if (msg.href) {
      return msg;
    }

    if (msg.id === 'daily-check') {
      return {
        ...msg,
        action: msg.action ?? 'Abrir resumen',
        href: `${basePath}`,
      };
    }

    if (msg.id === 'expense-smart') {
      return {
        ...msg,
        action: msg.action ?? 'Ir a gastos',
        href: `${basePath}/expenses`,
      };
    }

    return msg;
  });

  if (detection.context !== 'dashboard' || detection.role !== 'user') {
    return messagesWithDefaults;
  }

  const sectionHints: Array<{
    match: string;
    id: string;
    title: string;
    message: string;
    action: string;
    href: string;
  }> = [
    {
      match: `${basePath}/invoices`,
      id: 'ctx-invoices',
      title: 'Facturas al día',
      message: 'Desde aquí puedes revisar estados, importes y detectar pendientes de cobro.',
      action: 'Abrir facturas',
      href: `${basePath}/invoices`,
    },
    {
      match: `${basePath}/documents`,
      id: 'ctx-documents',
      title: 'Documentos organizados',
      message: 'Sube documentos y deja que Isaak te guíe en clasificación y próximos pasos.',
      action: 'Ir a documentos',
      href: `${basePath}/documents`,
    },
    {
      match: `${basePath}/clients`,
      id: 'ctx-clients',
      title: 'Gestión de clientes',
      message: 'Consulta clientes, su histórico de facturas y oportunidades de seguimiento.',
      action: 'Ver clientes',
      href: `${basePath}/clients`,
    },
    {
      match: `${basePath}/banks`,
      id: 'ctx-banks',
      title: 'Conciliación bancaria',
      message: 'Conecta bancos y revisa movimientos para cuadrar tu caja en minutos.',
      action: 'Ir a bancos',
      href: `${basePath}/banks`,
    },
    {
      match: `${basePath}/calendar`,
      id: 'ctx-calendar',
      title: 'Plazos fiscales',
      message: 'Controla vencimientos y prepara tareas con antelación para evitar sorpresas.',
      action: 'Ver calendario',
      href: `${basePath}/calendar`,
    },
    {
      match: `${basePath}/settings`,
      id: 'ctx-settings',
      title: 'Configura tu cuenta',
      message: 'Activa integraciones y ajusta preferencias para trabajar con menos fricción.',
      action: 'Abrir ajustes',
      href: `${basePath}/settings`,
    },
    {
      match: `${basePath}/isaak`,
      id: 'ctx-isaak',
      title: 'Asistente en foco',
      message:
        'Aquí puedes pedir a Isaak un plan de acción concreto para facturas, cobros y cierres.',
      action: 'Abrir resumen',
      href: `${basePath}`,
    },
  ];

  const section = sectionHints.find((hint) => pathname.startsWith(hint.match));
  if (!section) {
    return messagesWithDefaults;
  }

  return [
    {
      id: section.id,
      title: section.title,
      message: section.message,
      action: section.action,
      href: section.href,
      icon: 'tip' as const,
      delay: 1200,
    },
    ...messagesWithDefaults,
  ];
}
