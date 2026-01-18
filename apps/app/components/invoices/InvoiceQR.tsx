"use client";

import { DemoInvoice } from "@/src/lib/demo/demoData";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

type InvoiceQRProps = {
  invoice: DemoInvoice;
};

export function InvoiceQR({ invoice }: InvoiceQRProps) {
  const { verifactuStatus, verifactuQr, verifactuHash } = invoice;

  // Si no hay datos VeriFactu, no mostrar nada
  if (!verifactuStatus && !verifactuQr && !verifactuHash) {
    return null;
  }

  // Iconos según estado
  const statusConfig = {
    validated: { icon: CheckCircle, color: "text-green-600", label: "Validado AEAT" },
    pending: { icon: Clock, color: "text-yellow-600", label: "Pendiente" },
    error: { icon: AlertCircle, color: "text-red-600", label: "Error" },
    sent: { icon: Clock, color: "text-blue-600", label: "Enviado" }
  };

  const config = statusConfig[verifactuStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">VeriFactu</h3>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm ${config.color} font-medium`}>
            {config.label}
          </span>
        </div>
      </div>

      {verifactuQr && (
        <div className="mb-3 flex justify-center">
          <img
            src={verifactuQr}
            alt="Código QR VeriFactu"
            className="w-32 h-32 border border-gray-300 rounded"
          />
        </div>
      )}

      {verifactuHash && (
        <div className="text-xs text-gray-600 break-all bg-white p-2 rounded border">
          <span className="font-semibold">Huella digital:</span>
          <br />
          <code className="text-[10px] text-gray-800">
            {verifactuHash.substring(0, 32)}...
          </code>
        </div>
      )}

      <p className="text-[10px] text-gray-500 mt-2 text-center">
        Validado según normativa de la AEAT
      </p>
    </div>
  );
}
