const test = require('node:test')
const assert = require('node:assert/strict')

test('referral codes are stable and reward links are generated correctly', async () => {
  const referrals = await import('../src/lib/referrals.mjs')

  const code = referrals.createReferralCode('zahid')
  assert.equal(code, 'ZAHIDC')
  assert.match(code, /^[A-Z0-9]{6,10}$/)

  const link = referrals.getReferralLink('https://cravingpoint.example', code)
  assert.equal(link, 'https://cravingpoint.example/?ref=ZAHIDC')

  const reward = referrals.calculateReferralReward(150, 50)
  assert.equal(reward, 200)
})
