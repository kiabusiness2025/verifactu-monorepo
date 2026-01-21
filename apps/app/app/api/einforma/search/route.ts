import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para buscar empresas en eInforma
 * GET /api/einforma/search?q=nombre_o_cif
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: 'Consulta debe tener al menos 3 caracteres' },
        { status: 400 }
      );
    }

    // TODO: Integrar con API real de eInforma
    // const eInformaApiKey = process.env.EINFORMA_API_KEY;
    // const response = await fetch(`https://api.einforma.com/v1/search?q=${query}`, {
    //   headers: {
    //     'Authorization': `Bearer ${eInformaApiKey}`,
    //     'Content-Type': 'application/json'
    //   }
    // });

    // Por ahora, datos de ejemplo para desarrollo
    const mockResults = [
      {
        id: '1',
        name: 'TECH SOLUTIONS SL',
        legal_name: 'TECH SOLUTIONS SOCIEDAD LIMITADA',
        tax_id: 'B12345678',
        address: 'Calle Gran Via, 123',
        city: 'Madrid',
        postal_code: '28013',
        country: 'ES',
        email: 'info@techsolutions.es',
        phone: '+34 91 123 45 67',
        employees: 25,
        revenue: 1500000,
        sector: 'Tecnología',
      },
      {
        id: '2',
        name: 'INNOVATE BUSINESS SA',
        legal_name: 'INNOVATE BUSINESS SOCIEDAD ANONIMA',
        tax_id: 'A87654321',
        address: 'Paseo de la Castellana, 456',
        city: 'Madrid',
        postal_code: '28046',
        country: 'ES',
        email: 'contacto@innovate.es',
        phone: '+34 91 987 65 43',
        employees: 50,
        revenue: 3000000,
        sector: 'Consultoría',
      },
    ].filter(
      (company) =>
        company.name.toLowerCase().includes(query.toLowerCase()) ||
        company.legal_name.toLowerCase().includes(query.toLowerCase()) ||
        company.tax_id.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json({
      ok: true,
      results: mockResults,
      total: mockResults.length,
    });
  } catch (error) {
    console.error('Error searching eInforma:', error);
    return NextResponse.json({ ok: false, error: 'Error al buscar empresa' }, { status: 500 });
  }
}
