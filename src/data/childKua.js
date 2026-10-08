export const KUA_SOURCES = {
  formula: 'https://www.joeyyap.com/askjoey-details.asp?aid=3489',
  directions: 'https://ah.my/kua-number-calculator/',
  yearChart: 'https://fengshuihouston.com/wp-content/uploads/2015/03/kuaNumber.pdf',
}
// Eight Mansions: Fu Wei (stability/focus), Yan Nian (harmony).
const directions = {
  1: ['เหนือ', 'ใต้'], 2: ['ตะวันตกเฉียงใต้', 'ตะวันตกเฉียงเหนือ'],
  3: ['ตะวันออก', 'ตะวันออกเฉียงใต้'], 4: ['ตะวันออกเฉียงใต้', 'ตะวันออก'],
  6: ['ตะวันตกเฉียงเหนือ', 'ตะวันตกเฉียงใต้'], 7: ['ตะวันตก', 'ตะวันออกเฉียงเหนือ'],
  8: ['ตะวันออกเฉียงเหนือ', 'ตะวันตก'], 9: ['ใต้', 'เหนือ'],
}
const root = n => n === 0 ? 0 : 1 + (n - 1) % 9

export function calculateChildKua(date, gender, profile) {
  if (!['boy', 'girl'].includes(gender)) return { status: 'skipped', reason: 'ยังไม่เลือกเพศสำหรับสูตรเลขกัว' }
  const calendarYear = Number(date.slice(0, 4))
  if (calendarYear < 1900 || calendarYear > 2099) return { status: 'skipped', reason: 'สูตรเลขกัวนี้รองรับปี ค.ศ. 1900–2099' }
  const month = Number(date.slice(5, 7))
  const [start, end] = profile.sunSign.longitudes
  // Li Chun is tropical solar longitude 315°. On the ingress day a time is
  // needed; do not silently assume the year changed at midnight/Chinese NY.
  if (month <= 2 && start < 315 && end >= 315) return { status: 'skipped', reason: 'วันเปลี่ยนปีลี่ชุน ต้องมีเวลาเกิดเพื่อเลือกปีคำนวณเลขกัว' }
  const year = month <= 2 && end < 315 ? calendarYear - 1 : calendarYear
  const reducedYear = root(year % 100)
  const raw = gender === 'boy' ? (year < 2000 ? 10 : 9) - reducedYear : root(reducedYear + (year < 2000 ? 5 : 6))
  const rawKua = raw === 0 ? 9 : raw
  const kua = rawKua === 5 ? gender === 'boy' ? 2 : 8 : rawKua
  const [focusDirection, harmonyDirection] = directions[kua]
  return { status: 'available', gender, year, reducedYear, rawKua, kua, focusDirection, harmonyDirection, yearBoundary: 'Li Chun (Sun 315°), Asia/Bangkok', sources: KUA_SOURCES }
}
