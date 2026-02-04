'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EinformaTestPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedNif, setSelectedNif] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setError('Escribe al menos 3 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch(`/api/admin/einforma/search?q=${encodeURIComponent(searchQuery)}`);

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      setResults(data.items || []);

      if (!data.items || data.items.length === 0) {
        setError('No se encontraron resultados');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la búsqueda');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetProfile = async (nif: string) => {
    if (!nif) return;

    setLoadingProfile(true);
    setProfileError('');
    setProfileData(null);
    setSelectedNif(nif);

    try {
      const res = await fetch(`/api/admin/einforma/profile?nif=${encodeURIComponent(nif)}`);

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Error al obtener el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test eINFORMA</h1>
          <p className="text-muted-foreground">Prueba la integración con eINFORMA API</p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Búsqueda de empresas</CardTitle>
          <CardDescription>Busca por nombre, NIF, CIF o razón social</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ej: Google, A12345678, Expert Estudios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} className="w-24">
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
                encontrado{results.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((item, idx) => (
                  <Card key={idx} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="pt-4 flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.nif || item.id}</p>
                        {item.province && (
                          <p className="text-sm text-muted-foreground">{item.province}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGetProfile(item.id || item.nif || '')}
                        disabled={loadingProfile}
                      >
                        Ver perfil
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Section */}
      {profileData && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil de empresa</CardTitle>
            <CardDescription>Detalles de {selectedNif}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p>{profileData.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Razón social</p>
                <p>{profileData.legalName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">NIF</p>
                <p>{profileData.nif || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">CNAE</p>
                <p>{profileData.cnae || 'N/A'}</p>
              </div>
            </div>

            {profileData.address && (
              <div className="space-y-2">
                <p className="font-medium">Domicilio</p>
                <div className="text-sm space-y-1 pl-4 border-l">
                  <p>{profileData.address.street}</p>
                  <p>
                    {profileData.address.zip} {profileData.address.city}
                  </p>
                  <p>{profileData.address.province}</p>
                  <p>{profileData.address.country}</p>
                </div>
              </div>
            )}

            {profileData.constitutionDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de constitución</p>
                <p>{profileData.constitutionDate}</p>
              </div>
            )}

            {profileData.representatives?.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Administradores</p>
                <ul className="text-sm space-y-1 pl-4 list-disc">
                  {profileData.representatives.map((rep: any, idx: number) => (
                    <li key={idx}>
                      {rep.name}
                      {rep.role && ` (${rep.role})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {profileError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{profileError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
