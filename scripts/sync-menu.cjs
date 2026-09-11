const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const compiled = ts.transpileModule(fs.readFileSync('src/data/mockData.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const context = { exports: {} }
vm.runInNewContext(compiled, context)
fs.writeFileSync('data/menu.json', JSON.stringify(context.exports.menuItems, null, 2) + '\n')

const { menuItems, categories, restaurantSettings, offers } = context.exports
const coupons = [{ code: 'CRAVE50', type: 'fixed', value: 50, minimum: 0, active: true }, { code: 'SAVE20', type: 'fixed', value: 20, minimum: 0, active: true }, { code: 'LOYAL10', type: 'percentage', value: 10, minimum: 0, active: true }, { code: 'NEWUSER15', type: 'percentage', value: 15, minimum: 0, active: true }]
fs.writeFileSync('data/catalog.json', JSON.stringify({ menuItems, categories, restaurantSettings: { ...restaurantSettings, tax_percentage: 5, delivery_available: true, pickup_available: true, min_order_value: 0, preparation_minutes: 30 }, offers, coupons, reviews: [] }, null, 2) + '\n')
