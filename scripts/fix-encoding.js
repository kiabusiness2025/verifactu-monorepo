const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'landing', 'app', 'page.tsx');

console.log('Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Applying fixes...');

// Mapeo de caracteres corruptos -> correctos
const fixes = [
  // Vocales con tilde
  [/â"œâ"‚/g, 'ó'],
  [/â"œÂ¡/g, 'á'],
  [/â"œÂ®/g, 'é'],
  [/â"œÂ·/g, 'í'],
  [/â"œÂº/g, 'ú'],
  
  // Consonante
  [/â"œÂ±/g, 'ñ'],
  
  // Puntuación
  [/Â¬Â¿/g, '¿'],
  [/Â¬Â·/g, '·'],
  
  // Símbolos
  [/Ã"â‚¬/g, '€'],
  [/Ã"Å†/g, '→'],
  [/Ã"Å /g, '↑'],
  
  // Emojis
  [/Â­ÆƒÂ´â„¢/g, '📷'],
  [/Â­Æ'Â±Â Ã»/g, '🧠'],
  [/Â­ÆƒÂ´Ã¨/g, '📈'],
  [/Ã"â€¦Â°/g, '🔔'],
  
  // Palabras completas que quedaron mal
  [/b├ísica/g, 'básica'],
  [/t├║/g, 'tú'],
  [/├Última/g, 'Última'],
  [/dáa/g, 'día'],
  [/seg├║n/g, 'según'],
  [/autom├íticamente/g, 'automáticamente'],
];

let totalReplacements = 0;
fixes.forEach(([pattern, replacement]) => {
  const matches = content.match(pattern);
  if (matches) {
    console.log(`  Replacing ${pattern.toString()} → "${replacement}" (${matches.length} occurrences)`);
    content = content.replace(pattern, replacement);
    totalReplacements += matches.length;
  }
});

console.log(`\nWriting corrected file...`);
fs.writeFileSync(filePath, content, 'utf8');

console.log(`✓ Done! Fixed ${totalReplacements} issues`);
console.log('  Please verify: cd apps/landing && npm run build');
