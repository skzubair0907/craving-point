const test = require('node:test')
const assert = require('node:assert/strict')

test('abandoned cart prompts keep the recovery message short and actionable', async () => {
  const cartPrompt = await import('../src/lib/abandonedCart.mjs')

  const prompt = cartPrompt.getAbandonedCartPrompt({
    items: [{ name: 'Classic Shawarma', quantity: 2, price: 180 }],
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  })

  assert.equal(prompt.title, 'Finish your order')
  assert.match(prompt.message, /Classic Shawarma/)
  assert.equal(prompt.action, 'Go to cart')
  assert.equal(prompt.link, '/cart')
})
