export interface EInformaCompany {
  nif: string;
  name: string;
  legalForm?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export const eInformaClient = {
  baseUrl: process.env.EINFORMA_API_URL || '',
  apiKey: process.env.EINFORMA_API_KEY || '',
};

export async function searchCompany(query: string): Promise<EInformaCompany[]> {
  try {
    // TODO: Implement real eInforma API call
    // const response = await fetch(`${eInformaClient.baseUrl}/search`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${eInformaClient.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ query }),
    // });
    // return await response.json();

    // Mock data for now
    return [
      {
        nif: 'B12345678',
        name: 'Empresa de Prueba SL',
        legalForm: 'Sociedad Limitada',
        address: 'Calle Mayor 123',
        city: 'Madrid',
        postalCode: '28001',
        province: 'Madrid',
      },
    ];
  } catch (error) {
    console.error('Error searching company:', error);
    throw error;
  }
}

export async function getCompanyReport(nif: string) {
  try {
    // TODO: Implement real eInforma API call
    return {
      nif,
      reportDate: new Date(),
      financialData: {},
      legalStatus: 'ACTIVE',
    };
  } catch (error) {
    console.error('Error fetching company report:', error);
    throw error;
  }
}
