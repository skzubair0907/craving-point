export function createReferralCode(seed = 'craving') {
  const base = String(seed || 'craving').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (base.length >= 6) return base.slice(0, 10)
  const fallback = (base || 'CRAV').padEnd(6, 'C')
  return fallback.slice(0, 10)
}

export function getReferralLink(baseUrl = 'https://cravingpoint.example', code = 'CRAVING') {
  const normalized = String(baseUrl || 'https://cravingpoint.example').replace(/\/$/, '')
  const referralCode = createReferralCode(code)
  return `${normalized}/?ref=${referralCode}`
}

export function calculateReferralReward(currentPoints = 0, bonus = 50) {
  return Number(currentPoints || 0) + Number(bonus || 0)
}
