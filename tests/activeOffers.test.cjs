const test = require('node:test')
const assert = require('node:assert/strict')

const { getActiveOffers } = require('../src/lib/activeOffers.mjs')

test('active offers keep only live offers and return clean promo cards', () => {
  const offers = [
    { id: 'a', title: 'Treat Yourself', description: 'Free delivery', discount: 'Free Delivery', is_active: true, image_url: '/images/offer1.jpg' },
    { id: 'b', title: 'Weekend Feast', description: 'Save 50', discount: 'Save ₹50', is_active: false, image_url: '/images/offer2.jpg' },
    { id: 'c', title: 'Combo Rush', description: 'Limited time', discount: 'Save ₹20', is_active: true, image_url: '/images/offer3.jpg' },
    { id: 'd', title: 'Mystery Bonus', description: 'Hidden', discount: 'Bonus', is_active: true, image_url: '/images/offer4.jpg', expires_at: '2024-01-01' }
  ]

  const result = getActiveOffers(offers)

  assert.deepEqual(result, [
    {
      id: 'a',
      title: 'Treat Yourself',
      description: 'Free delivery',
      discount: 'Free Delivery',
      image_url: '/images/offer1.jpg',
      link: '/offers'
    },
    {
      id: 'c',
      title: 'Combo Rush',
      description: 'Limited time',
      discount: 'Save ₹20',
      image_url: '/images/offer3.jpg',
      link: '/offers'
    }
  ])
})

test('active offers return null when there are no live deals', () => {
  assert.equal(getActiveOffers([{ id: 'x', title: 'Old', is_active: false }]), null)
})
