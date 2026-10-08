// Short paraphrases of each sign's traits; advice is an editorial adaptation
// for parents, rather than a claim about a child's measured development.
export const zodiacSource = 'https://www.astrology.com/zodiac-signs'
export const zodiacMeanings = {
  ราศีเมษ: ['กระตือรือร้น', 'กล้าริเริ่ม', 'ฝึกใจเย็น'],
  ราศีพฤษภ: ['รักความมั่นคง', 'ทำต่อเนื่อง', 'เปิดรับการเปลี่ยนแปลง'],
  ราศีเมถุน: ['อยากรู้อยากเห็น', 'สื่อสารคล่อง', 'ฝึกจดจ่อ'],
  ราศีกรกฎ: ['อ่อนโยน', 'ใส่ใจคนใกล้ตัว', 'ช่วยบอกความรู้สึก'],
  ราศีสิงห์: ['อบอุ่น', 'กล้าแสดงออก', 'ฝึกรับฟัง'],
  ราศีกันย์: ['ละเอียดรอบคอบ', 'สังเกตเก่ง', 'ลดความกดดันให้สมบูรณ์แบบ'],
  ราศีตุล: ['ให้ค่าความสัมพันธ์', 'มองหลายมุม', 'ฝึกตัดสินใจด้วยตัวเอง'],
  ราศีพิจิก: ['จริงจัง', 'ค้นเรื่องลึก', 'ช่วยผ่อนอารมณ์เข้มข้น'],
  ราศีธนู: ['ร่าเริง', 'ชอบสำรวจ', 'ฝึกรู้จักพอดี'],
  ราศีมังกร: ['มุ่งมั่น', 'อดทน', 'ผ่อนแรงกดดันจากเป้าหมาย'],
  ราศีกุมภ์: ['รักอิสระ', 'คิดต่าง', 'เปิดรับมุมมองอื่น'],
  ราศีมีน: ['ไวต่อความรู้สึก', 'จินตนาการดี', 'ช่วยแยกความฝันกับความจริง'],
}
// Year-animal folk readings use the lunar New Year boundary in birthProfile.
// These are not Four Pillars/BaZi or an evaluation of the year's five elements.
export const animalMeanings = {
  ชวด: ['rat', 'ช่างคิด', 'หาแนวทางใหม่', 'ช่วยคลายความกังวล'],
  ฉลู: ['ox', 'ซื่อตรง', 'ตั้งใจทำจนจบ', 'ฝึกยืดหยุ่น'],
  ขาล: ['tiger', 'กระตือรือร้น', 'กล้าลอง', 'ฝึกหยุดก่อนลงมือ'],
  เถาะ: ['rabbit', 'อ่อนโยน', 'เข้าใจผู้อื่น', 'เสริมความมั่นใจ'],
  มะโรง: ['dragon', 'มั่นใจ', 'กล้ารับบทนำ', 'ฝึกยอมรับข้อจำกัด'],
  มะเส็ง: ['snake', 'ช่างไตร่ตรอง', 'เรียนรู้จากการลองทำ', 'เปิดพื้นที่ให้ไว้ใจผู้อื่น'],
  มะเมีย: ['horse', 'รักอิสระ', 'เข้าสังคมคล่อง', 'ฝึกความอดทน'],
  มะแม: ['sheep', 'อ่อนโยน', 'คิดสร้างสรรค์', 'ช่วยกล้าตัดสินใจ'],
  วอก: ['monkey', 'ขี้สงสัย', 'แก้ปัญหาเก่ง', 'ฝึกทำให้ต่อเนื่อง'],
  ระกา: ['rooster', 'ตรงไปตรงมา', 'ช่างสังเกต', 'ฝึกใส่ใจความรู้สึกคนอื่น'],
  จอ: ['dog', 'จริงใจ', 'ช่วยเหลือคนใกล้ตัว', 'ช่วยคลายความกังวล'],
  กุน: ['pig', 'มีน้ำใจ', 'คิดสร้างสรรค์', 'ฝึกเลือกก่อนเชื่อ'],
}

export function getChildAstrology(profile) {
  const evidence = []
  const skipped = [
    { system: 'natal-chart', reason: 'ไม่มีเวลาและสถานที่เกิดสำหรับลัคนาและเรือนชะตา' },
    { system: 'bazi', reason: 'ยังไม่มีเวลาเกิดและข้อมูลเขตเวลาเกิดสำหรับปาจื้อเต็ม; ปีนักษัตรไม่ใช่ปาจื้อ' },
    { system: 'weekday-taksa', reason: 'ไม่มีเวลาเกิดเพื่อยืนยันวันทางโหราศาสตร์และแยกพุธกลางวัน/กลางคืน' },
  ]
  if (profile.zodiac && zodiacMeanings[profile.zodiac]) {
    const [trait, strength, caution] = zodiacMeanings[profile.zodiac]
    evidence.push({ system: 'sun-sign', input: profile.zodiac, source: zodiacSource, section: profile.zodiac, trait, strength, caution })
  } else skipped.push({ system: 'sun-sign', reason: 'อาทิตย์ย้ายราศีในวันเกิด ต้องมีเวลาเกิดจึงเลือกคำอ่านได้' })
  const animal = animalMeanings[profile.chineseYear?.animalThai]
  if (animal) {
    const [slug, trait, strength, caution] = animal
    evidence.push({ system: 'chinese-year-animal', input: profile.chineseYear.animalThai, source: `https://www.astrology.com/chinese-zodiac/${slug}`, section: 'Traits / Strengths / Weaknesses', trait, strength, caution })
  } else skipped.push({ system: 'chinese-year-animal', reason: 'ปฏิทินจีนไม่พร้อมใช้งาน' })
  return { evidence, skipped }
}
