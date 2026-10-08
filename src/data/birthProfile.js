import { GeoVector, Ecliptic } from 'astronomy-engine'
const zodiacNames = ['เมษ', 'พฤษภ', 'เมถุน', 'กรกฎ', 'สิงห์', 'กันย์', 'ตุล', 'พิจิก', 'ธนู', 'มังกร', 'กุมภ์', 'มีน']
// Date-only input is a civil day in the app's Asia/Bangkok timezone.
// A solar ingress on that day cannot be resolved without the birth time.
// https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md
export function getDateOnlySunSign(isoDate) {
  const start = new Date(`${isoDate}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 86400000 - 1)
  const longitudes = [start, end].map(time => Ecliptic(GeoVector('Sun', time, true)).elon)
  const signs = longitudes.map(longitude => Math.floor(longitude / 30))
  return { status: signs[0] === signs[1] ? 'available' : 'needs-birth-time', timeZone: 'Asia/Bangkok', start: start.toISOString(), end: end.toISOString(), longitudes, signIndex: signs[0] === signs[1] ? signs[0] : null }
}
const animals = [
  ['หนู', 'ชวด'], ['วัว', 'ฉลู'], ['เสือ', 'ขาล'], ['กระต่าย', 'เถาะ'],
  ['มังกร', 'มะโรง'], ['งู', 'มะเส็ง'], ['ม้า', 'มะเมีย'], ['แพะ', 'มะแม'],
  ['ลิง', 'วอก'], ['ไก่', 'ระกา'], ['สุนัข', 'จอ'], ['หมู', 'กุน'],
]
const elements = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ']
export const childTopicLabels = {
  personality: 'นิสัย',
  strength: 'จุดเด่น',
  learning: 'การเรียนรู้',
  support: 'สิ่งที่ควรส่งเสริม',
  caution: 'เรื่องที่ควรใส่ใจ',
  direction: 'ทิศส่งเสริม',
}
export const childPostTopics = Object.values(childTopicLabels)
export const defaultChildTopics = [childTopicLabels.personality, childTopicLabels.strength, childTopicLabels.learning, childTopicLabels.support, childTopicLabels.caution, childTopicLabels.direction]
export function normalizeChildTopic(topic) {
  return { นิสัยโดยรวม: childTopicLabels.personality, 'นิสัยจากเส้นทางชีวิต': childTopicLabels.personality, 'จุดเด่นจากเลขวันเกิด': childTopicLabels.strength, เรื่องควรใส่ใจ: childTopicLabels.caution, 'เรื่องควรใส่ใจจากเส้นทางชีวิต': childTopicLabels.caution }[topic] || topic
}
const modulo = (number, base) => ((number % base) + base) % base
export function reduceBirthNumber(value) {
  while (value > 9 && ![11, 22, 33].includes(value)) value = [...String(value)].reduce((sum, digit) => sum + Number(digit), 0)
  return value
}
export function getBirthNumbers(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const date = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return null
  const digits = [...isoDate.replaceAll('-', '')].map(Number)
  const trace = input => {
    const steps = [input]
    let value = input
    while (value > 9 && ![11, 22, 33].includes(value)) {
      value = [...String(value)].reduce((total, digit) => total + Number(digit), 0)
      steps.push(value)
    }
    return { input, steps, value }
  }
  const parts = { month: trace(date.getUTCMonth() + 1), day: trace(date.getUTCDate()), year: trace(date.getUTCFullYear()) }
  const sum = Object.values(parts).reduce((total, part) => total + part.value, 0)
  const combined = trace(sum)
  return { birthDay: date.getUTCDate(), birthNumber: date.getUTCDate(), lifePath: combined.value, lifePathParts: parts, lifePathCombined: combined, lifePathSum: sum, lifePathDigits: digits }
}

export function getBirthProfile(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const date = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return null
  const sunSign = getDateOnlySunSign(isoDate)
  const zodiac = sunSign.status === 'available' ? `ราศี${zodiacNames[sunSign.signIndex]}` : null
  let chineseYear = null
  // ICU's Chinese calendar supplies the related Gregorian year after the lunar
  // new year boundary, rather than treating January 1 as the animal-year change.
  // Calendar reference: https://www.hko.gov.hk/en/gts/time/Calendar.htm
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-chinese', { year: 'numeric', timeZone: 'UTC' })
    if (formatter.resolvedOptions().calendar === 'chinese') {
      const relatedYear = Number(formatter.formatToParts(date).find(part => part.type === 'relatedYear')?.value)
      if (Number.isInteger(relatedYear)) {
        const [animal, animalThai] = animals[modulo(relatedYear - 4, 12)]
        const stem = modulo(relatedYear - 4, 10)
        const element = elements[Math.floor(stem / 2)]
        chineseYear = { year: relatedYear, animal, animalThai, element, polarity: stem % 2 === 0 ? 'หยาง' : 'หยิน', label: `ปี${animal}${element} (${animalThai})` }
      }
    }
  } catch { /* Leave unavailable calendar data explicit in the UI. */ }
  return { zodiac, sunSign, chineseYear, ...getBirthNumbers(isoDate) }
}
