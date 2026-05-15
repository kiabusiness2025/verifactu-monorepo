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
  // Antes era ['/node_modules/(?!(jose)/)'] (solo transformaba jose). El bump
  // de deps d2694194 introdujo supertest@7.x cuyo árbol depende de paquetes
  // ESM-only (superagent, formidable, qs, etc.) que Jest+babel-jest no parseaba
  // → SyntaxError: Unexpected token 'export'. Allowlist explícita en vez de
  // dejar [] vacío para no transformar packages CJS innecesariamente.
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|supertest|superagent|formidable|qs|methods|cookiejar|fast-safe-stringify|component-emitter|mime-db|mime-types|debug)/)',
  ],
};
