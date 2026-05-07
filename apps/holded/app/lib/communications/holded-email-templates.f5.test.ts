/**
 * Tests F5.2 — render de las 4 plantillas operativas nuevas. Solo verificamos
 * que el subject y los campos clave se inyectan correctamente; el HTML lo
 * audita la review visual antes del deploy.
 */

import {
  buildHoldedAuthFailuresAdminEmail,
  buildHoldedAuthFailuresUserEmail,
  buildHoldedFirstActivityAdminEmail,
  buildHoldedInvoiceDraftCreatedAdminEmail,
} from './holded-email-templates';

describe('F5 templates — render', () => {
  describe('buildHoldedFirstActivityAdminEmail', () => {
    it('incluye empresa, canal y tool en subject + html', () => {
      const tpl = buildHoldedFirstActivityAdminEmail({
        companyName: 'Acme SL',
        userEmail: 'demo@acme.com',
        channel: 'claude',
        toolUsed: 'list_documents',
        detectedAt: new Date('2026-05-06T09:30:00Z'),
        adminPanelUrl: 'https://holded.verifactu.business/admin',
      });

      expect(tpl.subject).toContain('Primera actividad');
      expect(tpl.subject).toContain('Acme SL');
      expect(tpl.subject).toContain('Claude Desktop');
      expect(tpl.html).toContain('demo@acme.com');
      expect(tpl.html).toContain('list_documents');
      expect(tpl.html).toContain('https://holded.verifactu.business/admin');
      expect(tpl.text).toContain('Acme SL');
    });

    it('cae a placeholder cuando no se pasa toolUsed', () => {
      const tpl = buildHoldedFirstActivityAdminEmail({
        companyName: 'Acme',
        userEmail: 'a@b.com',
        channel: 'mobile',
        toolUsed: null,
        detectedAt: new Date(),
        adminPanelUrl: 'https://x',
      });
      expect(tpl.html).toContain('(consulta inicial)');
    });
  });

  describe('buildHoldedInvoiceDraftCreatedAdminEmail', () => {
    it('formatea total con currency y muestra warning de no emisión', () => {
      const tpl = buildHoldedInvoiceDraftCreatedAdminEmail({
        companyName: 'Acme SL',
        userEmail: 'demo@acme.com',
        channel: 'chatgpt',
        draftId: 'doc-abc',
        draftNumber: 'F2026-001',
        contactName: 'Cliente Demo',
        total: 1234.5,
        currency: 'eur',
        detectedAt: new Date('2026-05-06T09:30:00Z'),
        adminPanelUrl: 'https://holded.verifactu.business/admin',
      });
      expect(tpl.subject).toContain('Borrador de factura');
      expect(tpl.html).toContain('F2026-001');
      expect(tpl.html).toContain('1234.50');
      expect(tpl.html).toContain('eur');
      expect(tpl.html).toContain('Cliente Demo');
      expect(tpl.html).toMatch(/no emite|no envia/i);
    });

    it('marca campos faltantes como (sin asignar) / (sin numero) / (no informado)', () => {
      const tpl = buildHoldedInvoiceDraftCreatedAdminEmail({
        companyName: 'Acme',
        userEmail: 'a@b.com',
        channel: 'claude',
        draftId: null,
        draftNumber: null,
        contactName: null,
        total: null,
        currency: null,
        detectedAt: new Date(),
        adminPanelUrl: 'https://x',
      });
      expect(tpl.html).toContain('(sin numero)');
      expect(tpl.html).toContain('(sin asignar)');
      expect(tpl.html).toContain('(no informado)');
    });
  });

  describe('buildHoldedAuthFailuresUserEmail', () => {
    it('incluye contador de fallos, ventana, CTA reconectar y soporte', () => {
      const tpl = buildHoldedAuthFailuresUserEmail({
        name: 'Ana',
        companyName: 'Acme SL',
        channel: 'claude',
        failureCount: 5,
        windowMinutes: 60,
        reconnectUrl: 'https://holded.verifactu.business/auth/holded-direct',
        supportEmail: 'soporte@verifactu.business',
      });
      expect(tpl.subject).toContain('fallando');
      expect(tpl.html).toContain('5 intentos');
      expect(tpl.html).toContain('60 minutos');
      expect(tpl.html).toContain('Hola Ana');
      expect(tpl.html).toContain('soporte@verifactu.business');
      expect(tpl.html).toContain('Reconectar Holded');
    });
  });

  describe('buildHoldedAuthFailuresAdminEmail', () => {
    it('incluye empresa, contador, ventana y CTA al panel admin', () => {
      const tpl = buildHoldedAuthFailuresAdminEmail({
        companyName: 'Acme SL',
        userEmail: 'demo@acme.com',
        channel: 'mobile',
        failureCount: 7,
        windowMinutes: 30,
        detectedAt: new Date('2026-05-06T09:30:00Z'),
        adminPanelUrl: 'https://holded.verifactu.business/admin',
      });
      expect(tpl.subject).toContain('Auth fallida');
      expect(tpl.subject).toContain('Acme SL');
      expect(tpl.subject).toContain('ChatGPT mobile');
      expect(tpl.html).toContain('7 intentos');
      expect(tpl.html).toContain('30 min');
      expect(tpl.html).toContain('https://holded.verifactu.business/admin');
    });
  });
});
