const fs = require('node:fs');

const ids = [
  'shawarma-chicken-nachos-bowl', 'shawarma-chicken-lays-bowl', 'shawarma-chicken-kurkure-bowl',
  'shawarma-chicken-cheese-loaded-bowl', 'shawarma-chicken-chatpatta-bowl', 'shawarma-chicken-malai-cheese-bowl',
  'shawarma-chicken-cheese-tandoori-bowl', 'shawarma-chicken-cheese-bbq-bowl', 'shawarma-chicken-fries-bowl',
  'shawarma-chicken', 'shawarma-llb-chicken-loaded', 'shawarma-bbq-bowl', 'shawarma-chicken-cheese-bowl',
  'shawarma-chicken-tandoori-bowl', 'momo-chicken-steam', 'momo-chicken-fry', 'momo-chicken-boom-boom',
  'momo-chicken-tandoori-steam', 'momo-chicken-chatpatta-steam', 'momo-chicken-cheese-pasta',
];
const fallback = {
  'shawarma-chicken-kurkure-bowl': 'shawarma-chicken-lays-bowl',
  'shawarma-chicken-cheese-tandoori-bowl': 'shawarma-chicken-tandoori-bowl',
  'shawarma-llb-chicken-loaded': 'shawarma-chicken',
  'momo-chicken-cheese-pasta': 'momo-chicken-boom-boom',
};
const mediaFile = 'src/data/generatedMenuMedia.ts';
const source = fs.readFileSync(mediaFile, 'utf8');
const existing = JSON.parse(source.match(/= (\{[\s\S]*\})\s*$/)[1]);
for (const id of ids) {
  const own = `public/images/menu-generated/${id}-1152.webp`;
  const asset = fs.existsSync(own) ? id : fallback[id];
  if (!asset) throw new Error(`No image available for ${id}`);
  existing[id] = `/images/menu-generated/${asset}-1152.webp`;
}
fs.writeFileSync(mediaFile, '// Generated menu illustrations.\nexport const generatedMenuMedia: Record<string, string> = ' + JSON.stringify(existing, null, 2) + '\n');
console.log(`Mapped ${ids.length} shawarma and momo menu cards.`);
