const test = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')

async function loadSupabase() {
  const fileUrl = pathToFileURL(require('node:path').resolve(__dirname, '../src/lib/supabase.ts')).href
  return import(`${fileUrl}?v=${Date.now()}`)
}

test('supabase fallback should load without browser-only env access', async () => {
  const mod = await loadSupabase()

  assert.equal(typeof mod.supabase, 'object')
  assert.equal(typeof mod.supabase.from, 'function')
  assert.equal(typeof mod.supabase.rpc, 'function')
  assert.equal(typeof mod.supabase.channel, 'function')
  assert.equal(mod.isSupabaseConfigured, false)
})
