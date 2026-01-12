"use client";

import Link from "next/link";
import { Users, Building2, TrendingUp, FileUp, BarChart3 } from "lucide-react";

export default function AdminDashboardPage() {
  const sections = [
    {
      title: "Usuarios",
      description: "Gestionar usuarios y permisos de acceso",
      href: "/dashboard/admin/users",
      icon: Users,
      color: "blue",
    },
    {
      title: "Empresas",
      description: "Crear, editar y gestionar empresas",
      href: "/dashboard/admin/companies",
      icon: Building2,
      color: "green",
    },
    {
      title: "Contabilidad",
      description: "Ingresos, gastos y análisis financiero",
      href: "/dashboard/admin/accounting",
      icon: TrendingUp,
      color: "purple",
    },
    {
      title: "Importación",
      description: "Importar empresas y datos en lote",
      href: "/dashboard/admin/import",
      icon: FileUp,
      color: "orange",
    },
    {
      title: "Reportes",
      description: "Generar reportes y modelos fiscales",
      href: "/dashboard/admin/reports",
      icon: BarChart3,
      color: "red",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-600">
          Gestión centralizada de usuarios, empresas, contabilidad e importación de datos
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const colorClass = colorMap[section.color];

          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
                <div className={`rounded-lg p-3 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
