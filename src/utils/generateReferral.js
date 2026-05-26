export function generateReferralCode(userId) {

const base = userId.replace(/-/g,"").slice(0,8)

const random = Math.random().toString(36).substring(2,6)

return base + random

}
