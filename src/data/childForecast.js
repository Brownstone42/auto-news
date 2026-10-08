import { getBirthProfile, childPostTopics, childTopicLabels } from './birthProfile.js'
import { getChildAstrology, zodiacSource } from './childAstrology.js'
import { childGuidance } from './childGuidance.js'
import { calculateChildKua, KUA_SOURCES } from './childKua.js'

const birthdaySource = 'https://www.numerology.com/articles/your-numerology-chart/birth-day-number/'
const lifePathSource = 'https://www.numerology.com/articles/your-numerology-chart/life-path-number-meanings/'
// Concise Thai summaries of numbered sections, not verbatim translations.
// Birthday numbers retain 1–31, without substituting their digit root's meaning.
export const birthdayMeanings = {
  1: 'ริเริ่ม กล้าลอง', 2: 'เห็นหลายมุม แก้ปัญหา', 3: 'สื่อสาร สร้างสรรค์',
  4: 'มั่นคง มีเหตุผล', 5: 'ยืดหยุ่น ปรับตัว', 6: 'ห่วงใย ปกป้อง',
  7: 'ใฝ่รู้ เข้าใจลึก', 8: 'ตั้งเป้าหมาย มุ่งผล', 9: 'เห็นใจ ช่วยส่วนรวม',
  10: 'นำทีม จัดระบบ', 11: 'รับรู้ความรู้สึก ชี้แนะ', 12: 'จินตนาการ ถ่ายทอด',
  13: 'ขยัน สร้างสรรค์ใช้งาน', 14: 'เปิดใจ ไตร่ตรอง', 15: 'อยากรู้ ช่วยเหลือ',
  16: 'ค้นความจริง เข้าใจความรู้สึก', 17: 'พึ่งตน มุ่งมั่น', 18: 'อิสระ ทำเพื่อส่วนรวม',
  19: 'พึ่งตน กล้าเสี่ยง', 20: 'ร่วมมือ เข้าใจอารมณ์', 21: 'เข้าสังคม คิดสร้างสรรค์',
  22: 'มุ่งมั่น สร้างงานร่วมกัน', 23: 'เปิดรับ มองบวก', 24: 'ภักดี ดูแลสัมพันธ์',
  25: 'ใฝ่รู้ ประมวลข้อมูล', 26: 'สร้างทางออกเพื่อผู้อื่น', 27: 'เปิดใจ เข้าใจส่วนรวม',
  28: 'นำทีมด้วยความเข้าใจ', 29: 'เห็นความเชื่อมโยง', 30: 'สื่อสารไอเดียใหม่',
  31: 'จินตนาการเป็นระบบ',
}
export const lifePathMeanings = {
  1: { trait: 'อิสระ ชอบเริ่มต้น', caution: 'ฝึกชะลอและร่วมมือ' },
  2: { trait: 'อ่อนโยน รักความกลมกลืน', caution: 'บอกความต้องการตนเอง' },
  3: { trait: 'สร้างสรรค์ ชอบสื่อสาร', caution: 'ฝึกความต่อเนื่อง' },
  4: { trait: 'ขยัน ชอบความมั่นคง', caution: 'เปิดรับวิธีใหม่' },
  5: { trait: 'ชอบอิสระ ประสบการณ์ใหม่', caution: 'รักษาความต่อเนื่อง' },
  6: { trait: 'อบอุ่น ใส่ใจผู้อื่น', caution: 'ดูแลตัวเองด้วย' },
  7: { trait: 'ช่างคิด ใฝ่รู้', caution: 'เปิดพื้นที่ให้สัมพันธ์' },
  8: { trait: 'มุ่งมั่น ให้ค่าความสำเร็จ', caution: 'สมดุลเป้าหมายกับการพัก' },
  9: { trait: 'เห็นใจ ช่วยเหลือ', caution: 'รับความช่วยเหลือด้วย' },
  11: { trait: 'ไวต่อความรู้สึก มีสัญชาตญาณ', caution: 'เสริมความมั่นใจ' },
  22: { trait: 'สร้างสิ่งเป็นรูปธรรม ร่วมมือ', caution: 'ลดแรงกดดันจากเป้าหมาย' },
  33: { trait: 'แบ่งปัน ช่วยเหลืออย่างเข้าใจ', caution: 'ดูแลใจตัวเองด้วย' },
}
export const CHILD_METHOD = {
  version: 'child-date-based-readings-v4',
  basis: 'เลขศาสตร์ตะวันตก + ราศีอาทิตย์ Tropical + ปีนักษัตรจีนตามตรุษจีน + เลขกัวฮวงจุ้ยแปดทิศ',
  numbers: 'เลขวันเกิด = วันที่จริง 1–31; เส้นทางชีวิต = ลดเดือน วัน ปี ค.ศ. แยกกัน สงวน 11/22/33 แล้วรวมและลดอีกครั้งโดยสงวนเลขเหล่านี้',
  rules: 'นิสัยจาก Life Path; จุดเด่นจาก Birthday Number; เรื่องควรใส่ใจจาก Life Path พร้อมคำอ่านราศีและปีนักษัตร ย่อวลีและตัดวลีซ้ำ ไม่ให้คะแนนผสม; การเรียนรู้ สิ่งที่ควรส่งเสริมเป็นคำแนะนำประยุกต์จาก Life Path ไม่ใช่สูตรใหม่; เพศใช้คำนวณเลขกัวและทิศส่งเสริม ไม่เปลี่ยนบุคลิกจากสูตรที่ไม่ใช้เพศ',
  scope: 'ตรวจอาทิตย์ต้น/ท้ายวัน Asia/Bangkok ด้วย Astronomy Engine ถ้าย้ายราศีให้เว้น; ปีนักษัตรใช้คำอ่านสัตว์ประจำปี ไม่ใช้ธาตุปีเป็นปาจื้อ ไม่มีเวลาเกิดจึงเว้นทักษา ลัคนา เรือน และปาจื้อเต็ม',
  sources: { birthday: birthdaySource, lifePath: lifePathSource, zodiac: zodiacSource, kua: KUA_SOURCES, chineseCalendar: 'https://www.hko.gov.hk/en/gts/time/Calendar.htm', astronomy: 'https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md' },
}

export function buildChildReport({ date, gender, topics }) {
  const profile = getBirthProfile(date)
  if (!profile || !['boy', 'girl', 'unspecified'].includes(gender) || !Array.isArray(topics) || !topics.length || topics.length > childPostTopics.length || new Set(topics).size !== topics.length || topics.some(topic => !childPostTopics.includes(topic))) throw new Error('กรุณาเลือกวันเกิดเด็ก เพศ และหัวข้อให้ครบ')
  const astrology = getChildAstrology(profile)
  const life = lifePathMeanings[profile.lifePath]
  const kua = calculateChildKua(date, gender, profile)
  if (kua.status !== 'available') astrology.skipped.push({ system: 'eight-mansions-kua', reason: kua.reason })
  const guidance = childGuidance[profile.lifePath]
  if (topics.every(topic => topic === childTopicLabels.direction) && kua.status !== 'available') throw new Error(`ยังสร้างหัวข้อทิศส่งเสริมไม่ได้: ${kua.reason} กรุณาเลือกหัวข้ออื่นร่วมด้วย`)
  const readings = {
    [childTopicLabels.personality]: { text: life.trait, source: lifePathSource, number: profile.lifePath, section: `Life Path number ${profile.lifePath}`, adaptation: 'สรุปความหมายบุคลิก' },
    [childTopicLabels.strength]: { text: birthdayMeanings[profile.birthNumber], source: birthdaySource, number: profile.birthNumber, section: `Born on the ${profile.birthNumber}`, adaptation: 'สรุปจุดเด่น' },
    [childTopicLabels.caution]: { text: life.caution, source: lifePathSource, number: profile.lifePath, section: `Life Path number ${profile.lifePath}`, adaptation: 'ย่อข้อท้าทายเป็นคำแนะนำสำหรับเด็ก' },
    ...Object.fromEntries([[childTopicLabels.learning, 0], [childTopicLabels.support, 2]].map(([topic, index]) => [topic, { text: guidance[index], source: lifePathSource, number: profile.lifePath, section: `Life Path number ${profile.lifePath}`, adaptation: 'คำแนะนำกิจกรรมประยุกต์จากบุคลิก ไม่ใช่สูตรทำนายหรือการประเมินพัฒนาการ' }])),
  }
  const fields = { [childTopicLabels.personality]: 'trait', [childTopicLabels.strength]: 'strength', [childTopicLabels.caution]: 'caution' }
  return { method: CHILD_METHOD, promptData: { date, gender, profile, kua, skipped: astrology.skipped, topics: topics.filter(topic => topic !== childTopicLabels.direction || kua.status === 'available').map(topic => {
    if (topic === childTopicLabels.direction) {
      const text = `ทิศเสริมความมั่นคงและสมาธิ: ${kua.focusDirection} · ทิศเสริมความกลมเกลียว: ${kua.harmonyDirection}`
      return { topic, heading: topic, text, evidence: [{ system: 'eight-mansions-kua', input: { year: kua.year, gender, kua: kua.kua }, source: KUA_SOURCES.directions, section: `Kua ${kua.kua}: Fu Wei / Yan Nian`, text }] }
    }
    const primary = readings[topic]
    const evidence = [{ system: 'numerology', ...primary }, ...(fields[topic] ? astrology.evidence.map(item => ({ system: item.system, input: item.input, source: item.source, section: item.section, text: item[fields[topic]], adaptation: fields[topic] === 'caution' ? 'ข้อท้าทายย่อเป็นคำแนะนำสำหรับเด็ก' : 'ย่อความหมายบุคลิก' })) : [])]
    if (!fields[topic]) return { topic, heading: topic, ...primary, evidence }
    const phrases = [...new Set(evidence.flatMap(item => item.text.split(/[ ,]+/)).filter(Boolean).map(phrase => phrase === 'อิสระ' ? 'รักอิสระ' : phrase))]
    const text = phrases.length > 1 ? `${phrases.slice(0, -1).join(' ')} และ${phrases.at(-1)}` : phrases[0]
    return { topic, heading: topic, ...primary, text, evidence }
  }) } }
}

export function renderChildPost(report) {
  const { date, gender, profile, topics } = report.promptData
  const birthDate = new Date(`${date}T12:00:00Z`)
  const label = { boy: 'เด็กผู้ชาย', girl: 'เด็กผู้หญิง', unspecified: 'เด็ก' }[gender]
  const facts = [profile.zodiac, profile.chineseYear ? `ปี${profile.chineseYear.animal} (${profile.chineseYear.animalThai})` : null, `เลขวันเกิด ${profile.birthNumber}`, `เส้นทางชีวิต ${profile.lifePath}`].filter(Boolean).join(' · ')
  return `[โพสต์]\n${label}เกิดวันที่ ${birthDate.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}\n\n${facts}\n\n${topics.map(item => `${item.heading}\n${item.text}`).join('\n\n')}`
}
