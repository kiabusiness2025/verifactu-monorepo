'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/notifications/ToastNotifications';

interface SuppliersFormProps {
  supplier?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function SuppliersForm({
  supplier,
  onSubmit,
  onCancel,
  loading = false,
}: SuppliersFormProps) {
  const [einformaLoading, setEinformaLoading] = useState(false);
  const [einformaMeta, setEinformaMeta] = useState<{
    cached?: boolean;
    cacheSource?: string;
    lastSyncAt?: string | null;
  } | null>(null);
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    nif: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'ES',
    accountCode: '',
    paymentTerms: '',
    notes: '',
  });

  useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    }
  }, [supplier]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const normalizedNif = formData.nif.trim().toUpperCase();
  const isValidNif = /^[A-Z0-9]{8,9}$/.test(normalizedNif);

  const handleEinforma = async () => {
    const taxId = normalizedNif;
    if (!taxId || !isValidNif) {
      toast.warning('NIF/CIF inv?lido', 'Introduce un NIF/CIF v?lido antes de autocompletar.');
      return;
    }
    setEinformaLoading(true);
    setEinformaMeta(null);
    try {
      const res = await fetch(
        `/api/integrations/einforma/company?taxId=${encodeURIComponent(taxId)}`
      );
      const data = await res.json();
      const normalized = data?.normalized;
      if (!res.ok || !normalized) {
        toast.error('No se pudo completar', data?.error ?? 'Consulta fallida en eInforma.');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        name: normalized.name || prev.name,
        address: normalized.address || prev.address,
        city: normalized.city || prev.city,
        postalCode: normalized.postalCode || prev.postalCode,
        country: normalized.country || prev.country,
        email: prev.email,
        phone: prev.phone,
      }));
      setEinformaMeta({
        cached: data?.cached,
        cacheSource: data?.cacheSource,
        lastSyncAt: data?.lastSyncAt ?? null,
      });
      toast.success(
        'Datos completados',
        data?.cached ? 'Se us? snapshot de eInforma.' : 'Datos tra?dos desde eInforma.'
      );
    } catch (error) {
      console.error('eInforma autocomplete error:', error);
      toast.error('Error de eInforma', 'No se pudo completar la ficha.');
    } finally {
      setEinformaLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-lg border border-gray-200"
    >
      <h2 className="text-xl font-semibold text-gray-900">
        {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Razón social"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="proveedor@ejemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+34 600 000 000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIF/CIF</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="nif"
              value={formData.nif}
              onChange={handleChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345678A"
            />
            <button
              type="button"
              onClick={handleEinforma}
              disabled={einformaLoading || !normalizedNif || !isValidNif}
              className="px-3 py-2 text-xs font-medium border rounded-lg text-blue-700 border-blue-200 hover:bg-blue-50 disabled:opacity-50"
            >
              {einformaLoading ? 'Buscando...' : 'Autocompletar con eInforma'}
            </button>
            {einformaMeta ? (
              <span className="rounded-full border px-2 py-1 text-[10px] text-slate-600">
                {einformaMeta.cached && einformaMeta.cacheSource === 'tenantProfile'
                  ? 'Snapshot'
                  : 'eInforma (live)'}
              </span>
            ) : null}
          </div>
          {einformaMeta?.cached && einformaMeta.lastSyncAt ? (
            <div className="mt-1 text-[11px] text-slate-500">
              Actualizado: {new Date(einformaMeta.lastSyncAt).toLocaleString('es-ES')}
            </div>
          ) : null}
          {!einformaLoading && normalizedNif && !isValidNif ? (
            <div className="mt-1 text-[11px] text-amber-600">
              NIF/CIF no v?lido. Revisa el formato antes de buscar.
            </div>
          ) : null}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Calle Principal, 456"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Barcelona"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="08001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ES">España</option>
            <option value="IT">Italia</option>
            <option value="FR">Francia</option>
            <option value="PT">Portugal</option>
            <option value="DE">Alemania</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código Contable</label>
          <input
            type="text"
            name="accountCode"
            value={formData.accountCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="400XXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Términos de Pago</label>
          <input
            type="text"
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contado"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Información adicional..."
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400"
        >
          {loading ? 'Guardando...' : supplier ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
