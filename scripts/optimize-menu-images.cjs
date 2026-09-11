const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function main() {
  const folder = 'public/images/menu-generated';
  const files = fs.readdirSync(folder).filter(name => name.endsWith('.png'));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const file of files) {
      const id = path.basename(file, '.png');
      for (const width of [576, 1152]) {
        const output = path.join(folder, `${id}-${width}.webp`);
        if (fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(path.join(folder, file)).mtimeMs) continue;
        const source = 'data:image/png;base64,' + fs.readFileSync(path.join(folder, file)).toString('base64');
        const data = await page.evaluate(async ({ source, width }) => {
          const image = new Image();
          image.src = source;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = Math.round(image.naturalHeight / image.naturalWidth * width);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/webp', .86).split(',')[1];
        }, { source, width });
        fs.writeFileSync(output, Buffer.from(data, 'base64'));
      }
      console.log('Optimized ' + id);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
