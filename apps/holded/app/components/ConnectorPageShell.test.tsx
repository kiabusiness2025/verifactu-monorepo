/** @jest-environment jsdom */

/**
 * Tests F4 (paridad de páginas públicas ChatGPT ↔ Claude).
 *
 * Verificamos:
 *  - El theme returns correct provider-specific colors and label.
 *  - `buildConnectorLegalLinks` enlaza al base path correcto.
 *  - `<ConnectorPageShell>` renderiza nav + footer con la configuración del
 *    proveedor correcto y resalta el link activo.
 *  - `<ConnectorMobileBanner>` apunta a `/auth/holded-direct` con `source`
 *    correcto y queda oculto en desktop (clase `sm:hidden`).
 */

import { render, screen, within } from '@testing-library/react';

import { buildConnectorLegalLinks, getConnectorTheme } from './connectorTheme';
import { ConnectorPageHero, ConnectorPageShell } from './ConnectorPageShell';
import { ConnectorMobileBanner } from './ConnectorMobileBanner';

describe('connectorTheme', () => {
  it('devuelve labels y paths correctos para chatgpt', () => {
    const theme = getConnectorTheme('chatgpt');
    expect(theme.providerLabel).toBe('ChatGPT');
    expect(theme.providerCompany).toBe('OpenAI');
    expect(theme.basePath).toBe('/conectores/chatgpt');
    expect(theme.providerLogoSrc).toBe('/brand/chatgpt-logo.png');
    expect(theme.accentText).toContain('emerald');
  });

  it('devuelve labels y paths correctos para claude', () => {
    const theme = getConnectorTheme('claude');
    expect(theme.providerLabel).toBe('Claude');
    expect(theme.providerCompany).toBe('Anthropic');
    expect(theme.basePath).toBe('/conectores/claude');
    expect(theme.providerLogoSrc).toBe('/brand/claude-logo.svg');
    expect(theme.accentText).toContain('amber');
  });

  it('los temas de chatgpt y claude no comparten el accent (paridad de estructura, divergencia de color)', () => {
    expect(getConnectorTheme('chatgpt').accentText).not.toEqual(
      getConnectorTheme('claude').accentText
    );
  });
});

describe('buildConnectorLegalLinks', () => {
  it('devuelve los 4 links legales en el orden estándar para chatgpt', () => {
    const links = buildConnectorLegalLinks('chatgpt');
    expect(links.map((l) => l.kind)).toEqual(['docs', 'privacy', 'dpa', 'terms']);
    expect(links[0].href).toBe('/conectores/chatgpt/docs');
    expect(links[3].href).toBe('/conectores/chatgpt/terms');
  });

  it('devuelve los 4 links legales en el orden estándar para claude', () => {
    const links = buildConnectorLegalLinks('claude');
    expect(links.map((l) => l.kind)).toEqual(['docs', 'privacy', 'dpa', 'terms']);
    expect(links[0].href).toBe('/conectores/claude/docs');
    expect(links[3].href).toBe('/conectores/claude/terms');
  });
});

describe('ConnectorPageShell', () => {
  it('renderiza nav + footer con el back-link al landing del proveedor', () => {
    render(
      <ConnectorPageShell provider="chatgpt" kind="terms">
        <p>contenido</p>
      </ConnectorPageShell>
    );
    // Hay un back-link en el nav y otro en el footer (la copia es similar pero
    // en el footer dice "Conector ChatGPT"). Comprobamos ambos por separado.
    const navBack = screen.getByText(/Volver al conector ChatGPT/);
    expect(navBack.closest('a')?.getAttribute('href')).toBe('/conectores/chatgpt');
    const footerBack = screen.getByText('Conector ChatGPT');
    expect(footerBack.closest('a')?.getAttribute('href')).toBe('/conectores/chatgpt');
  });

  it('marca el link activo (kind=privacy) con aria-current=page', () => {
    render(
      <ConnectorPageShell provider="claude" kind="privacy">
        <p>contenido</p>
      </ConnectorPageShell>
    );
    const activeLinks = screen.getAllByText('Privacidad');
    // El nav usa hidden hasta sm; el footer no. Hay 2 instancias.
    const activeNavLink = activeLinks.find(
      (el) => el.closest('a')?.getAttribute('aria-current') === 'page'
    );
    expect(activeNavLink).toBeDefined();
  });

  it('produce hrefs hacia el path base del proveedor (claude)', () => {
    render(
      <ConnectorPageShell provider="claude" kind="terms">
        <p>contenido</p>
      </ConnectorPageShell>
    );
    const dpaLinks = screen.getAllByText('DPA');
    expect(dpaLinks.length).toBeGreaterThan(0);
    expect(dpaLinks[0].closest('a')?.getAttribute('href')).toBe('/conectores/claude/dpa');
  });

  it('renderiza el children como cuerpo principal', () => {
    render(
      <ConnectorPageShell provider="chatgpt" kind="terms">
        <p data-testid="custom-body">contenido único</p>
      </ConnectorPageShell>
    );
    expect(screen.getByTestId('custom-body')).toHaveTextContent('contenido único');
  });
});

describe('ConnectorPageHero', () => {
  it('renderiza el badge, título, subtítulo y aside card', () => {
    render(
      <ConnectorPageHero
        provider="chatgpt"
        badgeLabel="Términos de Servicio"
        title="Términos de Servicio"
        subtitle="Conector Holded para ChatGPT"
        intro={<>Estos términos regulan…</>}
        lastUpdated="Última actualización: 29 de abril de 2026."
        asideCard={<p data-testid="aside">aviso</p>}
      />
    );
    expect(screen.getByText('Términos de Servicio', { selector: 'h1' })).toBeInTheDocument();
    // El badge tiene el mismo texto pero está fuera del h1
    const badges = screen.getAllByText('Términos de Servicio');
    expect(badges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Conector Holded para ChatGPT')).toBeInTheDocument();
    expect(screen.getByText(/Estos términos regulan/)).toBeInTheDocument();
    expect(screen.getByText('Última actualización: 29 de abril de 2026.')).toBeInTheDocument();
    expect(screen.getByTestId('aside')).toHaveTextContent('aviso');
  });

  it('omite el aside card cuando no se pasa', () => {
    render(<ConnectorPageHero provider="claude" badgeLabel="Política" title="Política" />);
    expect(screen.getByRole('heading', { name: 'Política' })).toBeInTheDocument();
    expect(screen.queryByTestId('aside')).not.toBeInTheDocument();
  });
});

describe('ConnectorMobileBanner', () => {
  it('apunta a /auth/holded-direct con el source del proveedor', () => {
    render(<ConnectorMobileBanner provider="chatgpt" />);
    const link = screen.getByRole('link', { name: /Conectar Holded en 30 segundos/ });
    const href = link.getAttribute('href');
    expect(href).toContain('/auth/holded-direct');
    expect(href).toContain('source=conectores_chatgpt_mobile_banner');
  });

  it('produce un source distinto para claude', () => {
    render(<ConnectorMobileBanner provider="claude" />);
    const link = screen.getByRole('link', { name: /Conectar Holded en 30 segundos/ });
    expect(link.getAttribute('href')).toContain('source=conectores_claude_mobile_banner');
  });

  it('aplica la clase sm:hidden para que solo aparezca en mobile', () => {
    render(<ConnectorMobileBanner provider="chatgpt" />);
    const region = screen.getByRole('region', { name: /Acceso rapido para mobile/ });
    expect(region.className).toContain('sm:hidden');
  });

  it('uses brand-specific accent (emerald vs amber)', () => {
    const { container: chatgptContainer } = render(<ConnectorMobileBanner provider="chatgpt" />);
    expect(chatgptContainer.innerHTML).toMatch(/emerald-/);
    const { container: claudeContainer } = render(<ConnectorMobileBanner provider="claude" />);
    expect(claudeContainer.innerHTML).toMatch(/amber-/);
  });
});

// Smoke test: hash de paridad estructural — los dos shell variants deben
// producir el mismo conjunto de elementos navegables (mismos labels y mismas
// kinds), solo que con diferentes paths. Es la garantia maquina-verificable
// de que la "paridad de estructura" no se va a romper por accidente.
describe('paridad ChatGPT ↔ Claude (estructural)', () => {
  it('mismos labels en el mismo orden y solo cambian los paths', () => {
    const chatgpt = buildConnectorLegalLinks('chatgpt');
    const claude = buildConnectorLegalLinks('claude');
    expect(chatgpt.length).toBe(claude.length);
    for (let i = 0; i < chatgpt.length; i++) {
      const c = chatgpt[i];
      const k = claude[i];
      expect(c.kind).toBe(k.kind);
      expect(c.label).toBe(k.label);
      expect(c.href).toBe(`/conectores/chatgpt/${c.kind}`);
      expect(k.href).toBe(`/conectores/claude/${k.kind}`);
    }
  });

  it('mismos themes con la misma forma (accent diferente, mismas keys)', () => {
    const chatgpt = getConnectorTheme('chatgpt');
    const claude = getConnectorTheme('claude');
    expect(Object.keys(chatgpt).sort()).toEqual(Object.keys(claude).sort());
  });
});

afterAll(() => {
  // Reseteamos hint para evitar warnings sobre `screen.getAllByText`.
  void within;
});
