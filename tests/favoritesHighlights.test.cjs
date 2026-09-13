const test = require('node:test')
const assert = require('node:assert/strict')

const { getFavoriteHighlights } = require('../src/lib/favorites.mjs')

test('favorite highlights only include saved items and keep them in favorite order', () => {
  const items = [
    { id: 'a', name: 'Berry Waffle', slug: 'berry-waffle', price: 249 },
    { id: 'b', name: 'Loaded Shawarma', slug: 'loaded-shawarma', price: 299 },
    { id: 'c', name: 'Cocoa Bowl', slug: 'cocoa-bowl', price: 279 },
    { id: 'd', name: 'Ferrero Shake', slug: 'ferrero-shake', price: 199 }
  ]

  const result = getFavoriteHighlights(['d', 'b', 'z'], items)

  assert.deepEqual(result, [
    {
      id: 'd',
      name: 'Ferrero Shake',
      slug: 'ferrero-shake',
      price: 199,
      link: '/menu/ferrero-shake'
    },
    {
      id: 'b',
      name: 'Loaded Shawarma',
      slug: 'loaded-shawarma',
      price: 299,
      link: '/menu/loaded-shawarma'
    }
  ])
})

test('favorite highlights return null when there are no saved favorites', () => {
  assert.equal(getFavoriteHighlights([], [{ id: 'a', name: 'Demo', slug: 'demo', price: 99 }]), null)
})
