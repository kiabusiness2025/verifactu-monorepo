import {
  buildAuthenticatedSystemPrompt,
  buildPublicSystemPrompt,
  type AuthenticatedChatContext,
} from '../isaak-chat-prompts';

const AEAT_TOPICS = [
  'Modelo 303',
  'Modelo 130',
  'Modelo 111',
  'Modelo 115',
  'Modelo 347',
  'Modelo 349',
  'Modelo 390',
  'IVA',
  'IRPF',
  'BOE',
] as const;

function context(): AuthenticatedChatContext {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    preferredName: 'Isaak User',
    companyName: 'Demo SL',
    contextSummary: 'Empresa demo para pruebas.',
    roleLabel: 'Administrador',
    sectorLabel: 'Servicios',
    communicationStyle: 'Claro',
    knowledgeLevel: 'Medio',
    goals: ['resolver dudas fiscales'],
    holdedConnected: false,
    workspaceSignalsBlock: 'Sin alertas relevantes.',
  };
}

describe('Isaak chat prompts', () => {
  it('injects fiscal knowledge into the public chat prompt', () => {
    const prompt = buildPublicSystemPrompt();

    expect(prompt).toContain('MODELOS TRIBUTARIOS PRINCIPALES');
    expect(prompt).toContain('FUENTES OFICIALES');
    expect(prompt).toContain('PLAZOS TRIMESTRALES');
    for (const topic of AEAT_TOPICS) {
      expect(prompt).toContain(topic);
    }
  });

  it('injects fiscal knowledge into the authenticated chat prompt', () => {
    const prompt = buildAuthenticatedSystemPrompt(context());

    expect(prompt).toContain('MODELOS TRIBUTARIOS PRINCIPALES');
    expect(prompt).toContain('FUENTES OFICIALES');
    expect(prompt).toContain('PLAZOS TRIMESTRALES');
    for (const topic of AEAT_TOPICS) {
      expect(prompt).toContain(topic);
    }
  });
});
