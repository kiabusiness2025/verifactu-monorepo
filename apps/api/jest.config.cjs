module.exports = {
  testEnvironment: 'node',
  transform: {
    // Incluye .mjs/.cjs además de .js/.ts porque varias deps publican .mjs.
    '^.+\\.[mc]?[jt]sx?$': [
      'babel-jest',
      {
        presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Antes: ['/node_modules/(?!(jose)/)'] (sólo transformaba jose). El bump
  // d2694194 trajo supertest@7.x con un árbol que incluye varias deps
  // ESM-only (superagent, formidable, qs, etc.) — Jest+babel-jest no parseaba
  // → SyntaxError: Unexpected token 'export'.
  //
  // Una allowlist explícita es frágil con pnpm: la estructura es
  // node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/ y la regex se matchea
  // contra el primer `/node_modules/` que va seguido de `.pnpm`, no del
  // nombre del paquete (por eso pasa local en Windows con paths `\` pero
  // falla en CI Linux). Resolver eso correctamente requiere conocer la lista
  // exacta de deps transitivas — frágil ante futuros bumps.
  //
  // Empty array = transformar todo, incluido node_modules. Coste: ~2× más
  // lento en el primer test run (apps/api son 3 ficheros pequeños, despreciable).
  // Beneficio: robusto ante cualquier dep ESM futura sin mantenimiento.
  transformIgnorePatterns: [],
};
