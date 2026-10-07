// Conventional tropical date ranges, not a timed natal-chart calculation.
// https://www.horoscope.com/zodiac-signs
const zodiacStarts = [
  [120, 'กุมภ์'], [219, 'มีน'], [321, 'เมษ'], [420, 'พฤษภ'],
  [521, 'เมถุน'], [621, 'กรกฎ'], [723, 'สิงห์'], [823, 'กันย์'],
  [923, 'ตุล'], [1023, 'พิจิก'], [1122, 'ธนู'], [1222, 'มังกร'],
]
const animals = [
  ['หนู', 'ชวด'], ['วัว', 'ฉลู'], ['เสือ', 'ขาล'], ['กระต่าย', 'เถาะ'],
  ['มังกร', 'มะโรง'], ['งู', 'มะเส็ง'], ['ม้า', 'มะเมีย'], ['แพะ', 'มะแม'],
  ['ลิง', 'วอก'], ['ไก่', 'ระกา'], ['สุนัข', 'จอ'], ['หมู', 'กุน'],
]
const elements = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ']
export const childPostTopics = ['นิสัยโดยรวม', 'จุดเด่น', 'การเรียนรู้', 'ความสัมพันธ์กับครอบครัวและเพื่อน', 'สุขภาวะ', 'สิ่งที่ควรส่งเสริม', 'แนวอาชีพเมื่อโตขึ้น', 'เรื่องควรใส่ใจ']
const modulo = (number, base) => ((number % base) + base) % base

export function getBirthProfile(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const date = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return null
  const monthDay = (date.getUTCMonth() + 1) * 100 + date.getUTCDate()
  const zodiac = [...zodiacStarts].reverse().find(([start]) => monthDay >= start)?.[1] || 'มังกร'
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
  return { zodiac: `ราศี${zodiac}`, chineseYear }
}
