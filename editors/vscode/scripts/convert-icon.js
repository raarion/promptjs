// Quick SVG→PNG converter for the VS Code extension icon.
// Run once when refreshing the logo; output: images/promptjs-logo.png (128x128).

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SVG_PATH = path.resolve(__dirname, '..', '..', '..', 'assets', 'PromptJS-logo.svg');
const PNG_PATH = path.resolve(__dirname, '..', 'images', 'promptjs-logo.png');

async function main() {
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`Source SVG not found: ${SVG_PATH}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(PNG_PATH), { recursive: true });
  await sharp(SVG_PATH).resize(128, 128).png().toFile(PNG_PATH);
  console.log(`✓ Wrote ${PNG_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
