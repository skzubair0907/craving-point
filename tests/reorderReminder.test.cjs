const test = require('node:test')
const assert = require('node:assert/strict')

test('reorder reminders highlight recent favorites and keep the CTA short', async () => {
  const reminder = await import('../src/lib/reorderReminder.mjs')

  const prompt = reminder.getReorderPrompt({
    id: 'ORD-42',
    total: 480,
    items: [{ name: 'Classic Shawarma', quantity: 2 }],
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  })

  assert.equal(prompt.title, 'Craving you again?')
  assert.match(prompt.message, /Classic Shawarma/)
  assert.equal(prompt.action, 'Reorder last meal')
  assert.equal(prompt.link, '/menu')
})
