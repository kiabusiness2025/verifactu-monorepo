import {
  extractFieldName,
  loadSpec303,
  parseSpecCsv,
  specLineToFieldSpec,
} from '../303/spec-parser';

describe('parseSpecCsv', () => {
  it('parses header and rows correctly', () => {
    const csv = [
      '"id","export_config_id:id","sequence","name","export_type","size","decimal_size","alignment","apply_sign","negative_sign","positive_sign","bool_no","bool_yes","expression","fixed_value","conditional_expression","repeat_expression","subconfig_id/id"',
      '"line_01","cfg_a",1,"Constante: <T","string",2,0,"left",1,"N",0," ","X",,"<T",,,',
    ].join('\n');
    const out = parseSpecCsv(csv);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: 'line_01',
      subconfigId: 'cfg_a',
      sequence: 1,
      size: 2,
      alignment: 'left',
      applySign: true,
      negativeSign: 'N',
      fixedValue: '<T',
    });
  });

  it('skips subconfig rows', () => {
    const csv = [
      '"id","export_config_id:id","sequence","name","export_type","size","decimal_size","alignment","apply_sign","negative_sign","positive_sign","bool_no","bool_yes","expression","fixed_value","conditional_expression","repeat_expression","subconfig_id/id"',
      '"line_subcfg","cfg_main",1,"Ref sub01","subconfig",0,0,"left",0," ",0," ","1",,,,,"cfg_sub01"',
      '"line_real","cfg_main",2,"Real field","string",2,0,"left",1,"N",0," ","X",,"<T",,,',
    ].join('\n');
    const out = parseSpecCsv(csv);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('line_real');
  });
});

describe('extractFieldName', () => {
  it('extracts direct ${object.foo}', () => {
    expect(extractFieldName('${object.company_vat}')).toBe('company_vat');
    expect(extractFieldName('${object.year}')).toBe('year');
  });

  it('extracts casilla from field_number lambda', () => {
    expect(
      extractFieldName(
        '${object.tax_line_ids.filtered(lambda r: r.field_number==150).amount}',
      ),
    ).toBe('casilla_150');
  });

  it('returns null for complex expressions', () => {
    expect(
      extractFieldName("${0 if object.period_type not in ('4T','12') else 1}"),
    ).toBeNull();
  });

  it('returns null for null/empty', () => {
    expect(extractFieldName(null)).toBeNull();
    expect(extractFieldName('')).toBeNull();
  });
});

describe('specLineToFieldSpec', () => {
  it('converts a SpecLine into a FieldSpec with extracted field name', () => {
    const line = {
      id: 'line_x',
      subconfigId: 'cfg',
      sequence: 1,
      name: 'NIF',
      exportType: 'string' as const,
      size: 9,
      decimalSize: 0,
      alignment: 'left' as const,
      applySign: true,
      negativeSign: 'N',
      positiveSign: ' ',
      boolNo: '2',
      boolYes: '1',
      expression: '${object.company_vat}',
      fixedValue: null,
    };
    const fs = specLineToFieldSpec(line);
    expect(fs.name).toBe('company_vat');
    expect(fs.description).toBe('NIF');
    expect(fs.size).toBe(9);
    expect(fs.type).toBe('string');
  });

  it('preserves fixedValue when expression is null', () => {
    const line = {
      id: 'line_h',
      subconfigId: 'cfg',
      sequence: 1,
      name: 'Constante <T',
      exportType: 'string' as const,
      size: 2,
      decimalSize: 0,
      alignment: 'left' as const,
      applySign: true,
      negativeSign: 'N',
      positiveSign: ' ',
      boolNo: '2',
      boolYes: '1',
      expression: null,
      fixedValue: '<T',
    };
    const fs = specLineToFieldSpec(line);
    expect(fs.fixedValue).toBe('<T');
  });
});

describe('loadSpec303 (versión 2024-10)', () => {
  it('carga el CSV oficial y separa sub01/sub03', () => {
    const { sub01, sub03 } = loadSpec303('2024-10');
    // Sub01 (régimen general) debería tener 88 campos según OCA
    expect(sub01.length).toBe(88);
    // Sub03 (info adicional + resultado) tiene 38 campos
    expect(sub03.length).toBe(38);
  });

  it('sub01 empieza con la constante "<T"', () => {
    const { sub01 } = loadSpec303('2024-10');
    expect(sub01[0]?.fixedValue).toBe('<T');
    expect(sub01[0]?.size).toBe(2);
  });

  it('sub01 contiene casillas conocidas del 303', () => {
    const { sub01 } = loadSpec303('2024-10');
    const names = sub01.map((f) => f.name);
    // Casilla 01 = base imponible 4% devengado
    expect(names).toContain('casilla_1');
    // Casilla 150 = base imponible 0% devengado (intracom)
    expect(names).toContain('casilla_150');
  });

  it('sub01 total bytes ≥ 1500 (página 1 régimen general)', () => {
    const { sub01 } = loadSpec303('2024-10');
    const total = sub01.reduce((s, f) => s + f.size, 0);
    expect(total).toBeGreaterThanOrEqual(1500);
    expect(total).toBeLessThanOrEqual(1700);
  });

  it('sub03 total bytes ≈ 1017 (página 3 resultado)', () => {
    const { sub03 } = loadSpec303('2024-10');
    const total = sub03.reduce((s, f) => s + f.size, 0);
    expect(total).toBe(1017);
  });
});
