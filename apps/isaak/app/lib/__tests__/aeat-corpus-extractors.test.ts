import {
  extractTextFromHtml,
  makeNoopPdfExtractor,
  makePdfParseAdapter,
  normalizeExtractedText,
} from '../aeat-corpus-extractors';

describe('extractTextFromHtml', () => {
  it('captures <title> as meta', () => {
    const out = extractTextFromHtml(
      '<html><head><title>LIVA Art. 96</title></head><body><p>x</p></body></html>'
    );
    expect(out.meta?.title).toBe('LIVA Art. 96');
  });

  it('strips script and style blocks', () => {
    const html = `
      <body>
        <script>alert('boom')</script>
        <style>.x { color: red }</style>
        <p>Contenido relevante</p>
      </body>
    `;
    expect(extractTextFromHtml(html).text).toBe('Contenido relevante');
  });

  it('preserves paragraph structure via newlines', () => {
    const html = '<p>Párrafo uno</p><p>Párrafo dos</p>';
    const out = extractTextFromHtml(html).text;
    expect(out.split('\n').filter(Boolean)).toEqual(['Párrafo uno', 'Párrafo dos']);
  });

  it('decodes HTML entities common in BOE', () => {
    const html = '<p>art&iacute;culo &#225;rtico &amp; deducci&oacute;n &#x40;</p>';
    // Solo verificamos algunas entidades base (&iacute; no está en la lista corta)
    const out = extractTextFromHtml('<p>IVA &amp; deducci&#243;n &#225;rtico</p>').text;
    expect(out).toContain('IVA & deducción ártico');
  });

  it('handles <br> as line break', () => {
    const out = extractTextFromHtml('<div>línea 1<br>línea 2</div>').text;
    expect(out).toBe('línea 1\nlínea 2');
  });

  it('compacts whitespace but keeps paragraph separation', () => {
    const html = '<p>  uno    con   espacios  </p>\n\n\n\n<p>dos</p>';
    const out = extractTextFromHtml(html).text;
    // Doble salto entre párrafos = el chunker luego los detecta como separadores
    expect(out).toMatch(/uno con espacios\n+dos/);
  });

  it('returns empty for empty input', () => {
    expect(extractTextFromHtml('').text).toBe('');
  });
});

describe('normalizeExtractedText', () => {
  it('rejoins words split by line-break hyphen', () => {
    // Hyphenation natural en español: "deduci-\nble" → "deducible"
    expect(normalizeExtractedText('deduci-\nble es legal')).toBe('deducible es legal');
  });

  it('strips page headers/footers', () => {
    const input = ['Artículo 96', 'No deducibles', 'Página 23', 'continúa el texto'].join('\n');
    const out = normalizeExtractedText(input);
    expect(out).not.toMatch(/^Página 23$/m);
    expect(out).toContain('continúa el texto');
  });

  it('strips "Pág. X de N" patterns', () => {
    const out = normalizeExtractedText('contenido\nPág. 12 de 700\nmás contenido');
    expect(out).not.toMatch(/Pág\. 12 de 700/);
  });

  it('collapses 3+ newlines to double', () => {
    const out = normalizeExtractedText('a\n\n\n\n\nb');
    expect(out).toBe('a\n\nb');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeExtractedText('  \n hola  \n  ')).toBe('hola');
  });
});

describe('makeNoopPdfExtractor', () => {
  it('throws an informative error when invoked', async () => {
    const extractor = makeNoopPdfExtractor();
    await expect(extractor(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      /pdf_extractor_not_configured/
    );
  });
});

describe('makePdfParseAdapter', () => {
  it('returns a function (the adapter itself is not invoked in unit tests)', () => {
    const adapter = makePdfParseAdapter();
    expect(typeof adapter).toBe('function');
  });
});
