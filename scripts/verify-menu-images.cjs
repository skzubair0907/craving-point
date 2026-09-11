const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
async function main() {
  const catalog = readJson('data/catalog.json');
  const manifest = readJson('artifacts/redesign/menu-image-prompts.json');
  const before = readJson('artifacts/redesign/menu-before-images.json');
  assert.deepEqual(catalog.menuItems.map(({ image_url, ...item }) => item), before);
  assert.equal(manifest.items.length, 60);
  for (const item of catalog.menuItems) assert.ok(fs.existsSync('public' + item.image_url), item.id);
  for (const item of manifest.items) {
    assert.equal(catalog.menuItems.find(dish => dish.id === item.id).image_url, '/images/menu-generated/' + item.id + '-1152.webp');
    for (const suffix of ['.png', '-576.webp', '-1152.webp']) assert.ok(fs.existsSync('public/images/menu-generated/' + item.id + suffix), item.id + suffix);
  }
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const category of catalog.categories.filter(category => category.is_active)) {
        const expected = catalog.menuItems.filter(item => item.is_available && item.category_id === category.id);
        if (!expected.length) continue;
        await page.goto((process.env.PREVIEW_URL || 'http://127.0.0.1:5173') + '/menu#cat-' + category.id, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(count => document.querySelectorAll('.editorial-food-card').length === count, expected.length);
        const cards = page.locator('.editorial-food-card');
        assert.equal(await cards.locator('img').count(), expected.length);
        const actual = await cards.evaluateAll(async elements => Promise.all(elements.map(async element => {
          const img = element.querySelector('img');
          img.loading = 'eager';
          await img.decode();
          return { name: img.alt, src: img.getAttribute('src'), width: img.naturalWidth };
        })));
        for (const item of expected) {
          const image = actual.find(image => image.name === item.name);
          assert.ok(image?.width > 0, item.name);
          assert.equal(image.src, item.image_url, item.name);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow at ' + width);
        await cards.first().locator('.food-card-image').click();
        await page.locator('[role="dialog"] img').evaluate(img => img.decode());
        assert.equal(await page.locator('[role="dialog"] img').getAttribute('src'), actual[0].src);
        await page.getByRole('button', { name: 'Close product details' }).click();
        if (category.id === 'waffles' || results.filter(result => result.width === width).length === 0) {
          await page.locator('.editorial-menu-grid').scrollIntoViewIfNeeded();
          await page.screenshot({ path: 'artifacts/redesign/menu-images-' + width + '.png' });
        }
        results.push({ width, category: category.name, images: actual.length });
        console.log(width + 'px: ' + category.name + ' — ' + actual.length + ' images loaded');
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  fs.writeFileSync('artifacts/redesign/menu-image-verification.json', JSON.stringify({ totalMenuItems: catalog.menuItems.length, generatedImages: manifest.items.length, nonImageDataUnchanged: true, results }, null, 2) + '\n');
}
main().catch(error => { console.error(error); process.exit(1); });
