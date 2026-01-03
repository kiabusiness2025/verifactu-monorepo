// Script to generate PNG icons from SVG using sharp
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// For now, we'll update the manifest to use SVG instead
// If you need PNG icons for older browsers, you can:
// 1. Use an online tool like https://realfavicongenerator.net/
// 2. Or install sharp: npm install sharp
// 3. Then uncomment this code:

/*
const sharp = require('sharp');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../apps/landing/public/brand/shield-icon.svg');
  const outputDir = path.join(__dirname, '../apps/landing/public/brand');
  
  const sizes = [192, 512];
  
  for (const size of sizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`));
    
    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);
*/

console.log('SVG icons are ready. To generate PNG icons, install sharp and uncomment the code in this file.');
