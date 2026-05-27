import {
  encodeIso8859_15,
  renderField,
  renderRecord,
  validateRecord,
  type FieldSpec,
} from '../format-engine';

describe('renderField — string fields', () => {
  it('pads right with spaces (left alignment, default)', () => {
    const spec: FieldSpec = {
      name: 'nombre',
      description: 'Test',
      size: 10,
      alignment: 'left',
      applySign: false,
      type: 'string',
    };
    expect(renderField(spec, 'JUAN')).toBe('JUAN      ');
  });

  it('pads left with spaces (right alignment)', () => {
    const spec: FieldSpec = {
      name: 'val',
      description: 'Test',
      size: 5,
      alignment: 'right',
      applySign: false,
      type: 'string',
    };
    expect(renderField(spec, '42')).toBe('   42');
  });

  it('truncates strings longer than size', () => {
    const spec: FieldSpec = {
      name: 'nombre',
      description: 'Test',
      size: 5,
      alignment: 'left',
      applySign: false,
      type: 'string',
    };
    expect(renderField(spec, 'JUAN PABLO GARCIA')).toBe('JUAN ');
  });

  it('null value emits all blanks', () => {
    const spec: FieldSpec = {
      name: 'x',
      description: '',
      size: 8,
      alignment: 'left',
      applySign: false,
      type: 'string',
    };
    expect(renderField(spec, null)).toBe('        ');
  });
});

describe('renderField — numeric float with applySign', () => {
  const eur17: FieldSpec = {
    name: 'amount',
    description: 'Importe',
    size: 17,
    decimalSize: 2,
    alignment: 'right',
    applySign: true,
    negativeSign: 'N',
    positiveSign: ' ',
    type: 'float',
  };

  it('renders 123.45 as " 0000000000012345" (sign + 16 chars)', () => {
    expect(renderField(eur17, 123.45)).toBe(' 0000000000012345');
  });

  it('renders -123.45 as "N0000000000012345"', () => {
    expect(renderField(eur17, -123.45)).toBe('N0000000000012345');
  });

  it('renders 0 as " 0000000000000000"', () => {
    expect(renderField(eur17, 0)).toBe(' 0000000000000000');
  });

  it('renders 1234567.89 correctly', () => {
    expect(renderField(eur17, 1234567.89)).toBe(' 0000000123456789');
  });

  it('rounds correctly (123.456 → 12346 céntimos)', () => {
    expect(renderField(eur17, 123.456)).toBe(' 0000000000012346');
  });

  it('null → " 0000000000000000" (default 0)', () => {
    expect(renderField(eur17, null)).toBe(' 0000000000000000');
  });
});

describe('renderField — numeric integer without sign', () => {
  it('pads with zeros to the left', () => {
    const spec: FieldSpec = {
      name: 'year',
      description: 'Ejercicio',
      size: 4,
      alignment: 'right',
      applySign: false,
      type: 'integer',
    };
    expect(renderField(spec, 2026)).toBe('2026');
    expect(renderField(spec, 42)).toBe('0042');
  });
});

describe('renderField — boolean', () => {
  it('renders true as boolYes, false as boolNo', () => {
    const spec: FieldSpec = {
      name: 'sii',
      description: 'SII voluntario',
      size: 1,
      alignment: 'left',
      applySign: false,
      type: 'boolean',
      boolYes: '1',
      boolNo: '2',
    };
    expect(renderField(spec, true)).toBe('1');
    expect(renderField(spec, false)).toBe('2');
    expect(renderField(spec, null)).toBe('2');
  });
});

describe('renderField — fixedValue', () => {
  it('emits the literal regardless of input', () => {
    const spec: FieldSpec = {
      name: 'header',
      description: 'Constante <T',
      size: 2,
      alignment: 'left',
      applySign: false,
      type: 'string',
      fixedValue: '<T',
    };
    expect(renderField(spec, 'IGNORED')).toBe('<T');
  });
});

describe('renderField — conditional', () => {
  it('emits blanks when conditional returns false', () => {
    const spec: FieldSpec = {
      name: 'optional',
      description: 'Solo si T4',
      size: 8,
      alignment: 'left',
      applySign: false,
      type: 'string',
      conditional: () => false,
    };
    expect(renderField(spec, 'VALOR')).toBe('        ');
  });
});

describe('renderRecord — concatenation', () => {
  it('joins fields in order respecting their sizes', () => {
    const fields: FieldSpec[] = [
      { name: 'h', description: 'Header', size: 2, alignment: 'left', applySign: false, type: 'string', fixedValue: '<T' },
      { name: 'model', description: 'Modelo', size: 3, alignment: 'left', applySign: false, type: 'string', fixedValue: '303' },
      { name: 'nif', description: 'NIF', size: 9, alignment: 'left', applySign: false, type: 'string' },
    ];
    const out = renderRecord(fields, { nif: 'B12345678' });
    expect(out).toBe('<T303B12345678');
    expect(out.length).toBe(14);
  });
});

describe('validateRecord — size invariants', () => {
  it('returns no errors when all fields respect their size', () => {
    const fields: FieldSpec[] = [
      { name: 'h', description: '', size: 2, alignment: 'left', applySign: false, type: 'string', fixedValue: '<T' },
    ];
    expect(validateRecord(fields, {})).toEqual([]);
  });
});

describe('encodeIso8859_15', () => {
  it('encodes ASCII as 1 byte per char', () => {
    const buf = encodeIso8859_15('HOLA');
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(0x48); // H
  });

  it('encodes € as 0xA4 (Latin-9 specific)', () => {
    const buf = encodeIso8859_15('€');
    expect(buf.length).toBe(1);
    expect(buf[0]).toBe(0xa4);
  });

  it('encodes ñ as 0xF1 (Latin-1/Latin-9 same)', () => {
    const buf = encodeIso8859_15('ñ');
    expect(buf.length).toBe(1);
    expect(buf[0]).toBe(0xf1);
  });

  it('characters outside Latin-9 → "?" (0x3F)', () => {
    const buf = encodeIso8859_15('日');
    expect(buf[0]).toBe(0x3f);
  });
});
