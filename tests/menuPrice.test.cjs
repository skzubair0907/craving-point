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

  assert.equal(item.price, 129)
  assert.equal(item.price_variants[0].price, 99)
  assert.deepEqual(item.ingredients, ['milk', 'flour'])
  assert.deepEqual(item.allergens, ['nuts'])
})
