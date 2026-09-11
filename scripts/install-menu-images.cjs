const fs = require('node:fs');
const manifest = JSON.parse(fs.readFileSync('artifacts/redesign/menu-image-prompts.json', 'utf8').replace(/^\uFEFF/, ''));
let source = fs.readFileSync('src/data/mockData.ts', 'utf8');
const mapping = {};
for (const item of manifest.items) {
  const image = '/images/menu-generated/' + item.id + '-1152.webp';
  if (!fs.existsSync('public' + image)) { if (process.argv.includes('--partial')) continue; throw new Error('Missing generated asset: ' + image); }
  const pattern = new RegExp("(id: '" + item.id + "',[\\s\\S]*?image_url: ')[^']+(')");
  if (!pattern.test(source)) throw new Error('Missing menu item: ' + item.id);
  source = source.replace(pattern, (_, before, after) => before + image + after);
  mapping[item.id] = image;
}
fs.writeFileSync('src/data/mockData.ts', source);
fs.writeFileSync('src/data/generatedMenuMedia.ts', '// Generated menu illustrations; source prompts are recorded in artifacts/redesign/menu-image-prompts.json.\nexport const generatedMenuMedia: Record<string, string> = ' + JSON.stringify(mapping, null, 2) + '\n');
console.log('Mapped ' + Object.keys(mapping).length + ' menu images.');
