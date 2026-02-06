'use client';

import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleInput } from '@/components/accessibility/AccessibleFormInputs';
import { useToast } from '@/components/notifications/ToastNotifications';
import { EinformaAutofillButton } from '@/src/components/einforma/EinformaAutofillButton';
import {
  Building2,
  Download,
  Edit,
  Euro,
  FileText,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  nif?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  paymentTerms?: string;
  notes?: string;
  totalInvoices?: number;
  totalRevenue?: number;
  createdAt: string;
}

export default function ClientsPage() {
  const { success, error: showError } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    nif: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'ES',
    paymentTerms: 'Contado',
    notes: '',
  });

  const applyEinforma = (normalized: {
    name?: string | null;
    legalName?: string | null;
    nif?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  }) => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || normalized.legalName || normalized.name || '',
      company: prev.company || normalized.name || normalized.legalName || '',
      nif: prev.nif || normalized.nif || prev.nif,
      address: prev.address || normalized.address || '',
      postalCode: prev.postalCode || normalized.postalCode || '',
      city: prev.city || normalized.city || '',
      country: prev.country || normalized.country || prev.country,
    }));
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      // TODO: Implementar API real
      // const res = await fetch('/api/clients');
      // const data = await res.json();

      // Datos de ejemplo
      setClients([
        {
          id: '1',
          name: 'María García',
          email: 'maria@example.com',
          phone: '+34 600 111 222',
          company: 'García Consultores SL',
          nif: 'B12345678',
          address: 'Calle Mayor 123',
          city: 'Madrid',
          postalCode: '28013',
          country: 'ES',
          paymentTerms: '30 días',
          totalInvoices: 15,
          totalRevenue: 45000,
          createdAt: '2024-01-15',
        },
        {
          id: '2',
          name: 'Juan Pérez',
          email: 'juan@tech.com',
          phone: '+34 610 333 444',
          company: 'Tech Solutions SA',
          nif: 'A87654321',
          totalInvoices: 8,
          totalRevenue: 28500,
          createdAt: '2024-02-20',
        },
      ]);
    } catch (error) {
      console.error('Error loading clients:', error);
      showError('Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Implementar API real
      // const res = await fetch('/api/clients', {
      //   method: editingClient ? 'PUT' : 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(editingClient ? { ...formData, id: editingClient.id } : formData),
      // });

      success(
        editingClient ? 'Cliente actualizado' : 'Cliente creado',
        editingClient
          ? 'Los cambios se guardaron correctamente'
          : 'El cliente se añadió correctamente'
      );

      setShowAddModal(false);
      setEditingClient(null);
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      showError('Error', 'No se pudo guardar el cliente');
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      // TODO: Implementar API real
      // await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });

      success('Cliente eliminado', 'El cliente se eliminó correctamente');
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      showError('Error', 'No se pudo eliminar el cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      nif: client.nif || '',
      address: client.address || '',
      city: client.city || '',
      postalCode: client.postalCode || '',
      country: client.country || 'ES',
      paymentTerms: client.paymentTerms || 'Contado',
      notes: client.notes || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      nif: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'ES',
      paymentTerms: 'Contado',
      notes: '',
    });
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.nif?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-600 mt-1">Gestiona tus clientes y contactos</p>
        </div>
        <AccessibleButton
          onClick={() => {
            setEditingClient(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="gap-2"
          ariaLabel="Añadir nuevo cliente"
        >
          <Plus className="h-4 w-4" />
          Añadir Cliente
        </AccessibleButton>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Clientes</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{clients.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Facturas Totales</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {clients.reduce((sum, c) => sum + (c.totalInvoices || 0), 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {(clients.reduce((sum, c) => sum + (c.totalRevenue || 0), 0) / 1000).toFixed(1)}k€
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Euro className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email, empresa o NIF..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </button>
        <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </div>

      {/* Client List */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-600">Cargando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {searchQuery ? 'No se encontraron clientes' : 'No hay clientes todavía'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchQuery ? 'Intenta con otra búsqueda' : 'Añade tu primer cliente para empezar'}
            </p>
            {!searchQuery && (
              <AccessibleButton
                onClick={() => {
                  setEditingClient(null);
                  resetForm();
                  setShowAddModal(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir Cliente
              </AccessibleButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Facturas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{client.name}</p>
                          {client.nif && (
                            <p className="text-xs text-slate-500">NIF: {client.nif}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {client.company ? (
                          <>
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {client.company}
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {client.email}
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {client.totalInvoices || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {((client.totalRevenue || 0) / 1000).toFixed(1)}k€
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AccessibleInput
                  label="Nombre completo *"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <AccessibleInput
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <AccessibleInput
                  label="Teléfono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <AccessibleInput
                  label="Empresa"
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
                <AccessibleInput
                  label="NIF/CIF"
                  type="text"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <EinformaAutofillButton
                    taxIdValue={formData.nif}
                    onApply={(normalized) => applyEinforma(normalized)}
                  />
                </div>
                <AccessibleInput
                  label="Condiciones de pago"
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </div>

              <AccessibleInput
                label="Dirección"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <AccessibleInput
                  label="Ciudad"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <AccessibleInput
                  label="Código Postal"
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ES">España</option>
                    <option value="PT">Portugal</option>
                    <option value="FR">Francia</option>
                    <option value="IT">Italia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notas adicionales sobre el cliente..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <AccessibleButton
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingClient(null);
                    resetForm();
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancelar
                </AccessibleButton>
                <AccessibleButton type="submit" className="flex-1">
                  {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
                </AccessibleButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
