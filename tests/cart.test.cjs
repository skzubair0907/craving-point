const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const loadCart = (stored = {}) => {
  const context = { exports: {}, require: name => name === './useRestaurantData' ? { useRestaurantStore: { getState: () => ({ catalog: JSON.parse(fs.readFileSync('data/catalog.json','utf8')) }) } } : require(name), window: { localStorage: { getItem: key => stored[key] || null, setItem: (key, value) => { stored[key] = value } } } }
  const code = ts.transpileModule(fs.readFileSync('src/store/useCartStore.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, context)
  return context.exports.useCartStore
}
const item = { id: 'test', name: 'Test', price: 45, is_available: true, quantity: 3, selectedAddons: [], price_variants: [{ label: 'Small', price: 45 }, { label: 'Large', price: 70 }] }
test('cart respects requested quantities and separates sizes', () => {
  const store = loadCart()
  store.getState().addItem(item)
  store.getState().addItem({ ...item, price: 70, quantity: 2 })
  assert.equal(store.getState().items.length, 2)
  assert.equal(store.getState().getTotal(), 275)
  store.getState().addItem({ ...item, quantity: 1 })
  assert.equal(store.getState().items[0].quantity, 4)
})
test('malformed persisted cart is ignored', () => {
  assert.equal(loadCart({ 'craving-point-cart': '{}' }).getState().items.length, 0)
  assert.equal(loadCart({ 'craving-point-cart': '[null,{"price":-3,"quantity":1}]' }).getState().items.length, 0)
})
test('coupon recalculates when quantity changes and clears with cart', () => {
  const store = loadCart()
  store.getState().addItem(item)
  store.getState().setCoupon('LOYAL10')
  assert.equal(store.getState().getCouponDiscount(store.getState().getTotal()), 13.5)
  store.getState().updateQuantity(store.getState().items[0].id, 1)
  assert.equal(store.getState().getCouponDiscount(store.getState().getTotal()), 4.5)
  store.getState().clearCart()
  assert.equal(store.getState().coupon, '')
})
