const test = require('node:test')
const assert = require('node:assert/strict')

test('menu item prices are normalized before publishing', async () => {
  const normalize = (await import('../src/lib/menuItemNormalize.js')).normalizeMenuItemDraft

  const item = normalize({
    id: 'waffle-test',
    name: 'Waffle',
    slug: 'waffle',
    category_id: 'waffle',
    price: '129',
    price_variants: [{ label: 'Small', price: '99' }],
    ingredients: ['milk', 'flour'],
    allergens: ['nuts'],
  })

  const fallbackItem = normalize({
    id: 'waffle-fallback',
    name: 'Waffle fallback',
    slug: 'waffle-fallback',
    category_id: 'waffle',
    price: '',
    price_variants: [{ label: 'Regular', price: '89' }],
  })

  const repairedLegacyItem = normalize({
    id: 'legacy-waffle',
    name: 'Legacy waffle',
    slug: 'legacy-waffle',
    category_id: 'waffle',
    price: 0,
    price_variants: [{ label: '12', price: 0 }, { label: 'Large', price: 180 }],
  })

  assert.equal(item.price, 129)
  assert.equal(item.price_variants[0].price, 99)
  assert.equal(fallbackItem.price, 89)
  assert.equal(repairedLegacyItem.price, 180)
  assert.equal(repairedLegacyItem.price_variants[0].price, 180)
  assert.deepEqual(item.ingredients, ['milk', 'flour'])
  assert.deepEqual(item.allergens, ['nuts'])
})
