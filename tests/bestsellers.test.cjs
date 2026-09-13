const test = require('node:test')
const assert = require('node:assert/strict')

const { getBestsellerHighlights } = require('../src/lib/bestsellers.mjs')

test('bestseller highlights keep available top sellers and return quick links', () => {
  const items = [
    { id: 'a', name: 'Berry Waffle', slug: 'berry-waffle', price: 249, is_bestseller: true, is_available: true },
    { id: 'b', name: 'Loaded Shawarma', slug: 'loaded-shawarma', price: 299, is_bestseller: true, is_available: false },
    { id: 'c', name: 'Cocoa Bowl', slug: 'cocoa-bowl', price: 279, is_bestseller: false, is_available: true },
    { id: 'd', name: 'Ferrero Shake', slug: 'ferrero-shake', price: 199, is_bestseller: true, is_available: true },
    { id: 'e', name: 'Cheese Fries', slug: 'cheese-fries', price: 189, is_bestseller: true, is_available: true }
  ]

  const result = getBestsellerHighlights(items)

  assert.deepEqual(result, [
    {
      id: 'a',
      name: 'Berry Waffle',
      slug: 'berry-waffle',
      price: 249,
      link: '/menu/berry-waffle'
    },
    {
      id: 'd',
      name: 'Ferrero Shake',
      slug: 'ferrero-shake',
      price: 199,
      link: '/menu/ferrero-shake'
    },
    {
      id: 'e',
      name: 'Cheese Fries',
      slug: 'cheese-fries',
      price: 189,
      link: '/menu/cheese-fries'
    }
  ])
})

test('bestseller highlights return null when no bestsellers are available', () => {
  const items = [
    { id: 'a', name: 'Disabled item', slug: 'disabled-item', price: 150, is_bestseller: true, is_available: false },
    { id: 'b', name: 'Another skip', slug: 'another-skip', price: 180, is_bestseller: false, is_available: true }
  ]

  assert.equal(getBestsellerHighlights(items), null)
})
