const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
test('restaurant hours use Indian time, correct weekdays and previous overnight hours', () => {
  const data = { exports: {} }
  const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(compile('src/data/mockData.ts'), data)
  const hook = compile('src/hooks/useRestaurantStatus.ts')
  for (const [date, expected] of [
    ['2026-09-04T23:45:00+05:30', true],
    ['2026-09-05T00:30:00+05:30', true],
    ['2026-09-05T01:00:00+05:30', false],
    ['2026-09-07T00:30:00+05:30', true],
    ['2026-09-08T00:30:00+05:30', false],
    ['2026-09-07T11:59:00+05:30', false],
    ['2026-09-07T12:00:00+05:30', true],
    ['2026-09-07T23:30:00+05:30', false],
  ]) {
    const context = { exports: {}, require: name => name === 'react' ? { useEffect: () => {}, useState: () => [new Date(date), () => {}] } : { useRestaurantData: () => data.exports } }
    vm.runInNewContext(hook, context)
    assert.equal(context.exports.useRestaurantStatus().isOpen, expected, date)
  }
})
