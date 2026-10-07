import OpenAI from 'openai'
import { getBirthProfile, childPostTopics } from '@/data/birthProfile'

export function buildChildPostMessages({ date, gender, topics }) {
  const profile = getBirthProfile(date)
  if (!profile?.chineseYear || !['boy', 'girl', 'unspecified'].includes(gender) || !Array.isArray(topics) || !topics.length || topics.length > childPostTopics.length || new Set(topics).size !== topics.length || topics.some(topic => !childPostTopics.includes(topic))) {
    throw new Error('กรุณาเลือกวันเกิดเด็ก เพศ และหัวข้อให้ครบ')
  }
  const birthDate = new Date(`${date}T12:00:00Z`)
  const weekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  const reduce = number => {
    while (number > 9) number = [...String(number)].reduce((sum, digit) => sum + Number(digit), 0)
    return number
  }
  const genderLabel = { boy: 'เด็กผู้ชาย', girl: 'เด็กผู้หญิง', unspecified: 'เด็ก' }[gender]
  return [
    { role: 'system', content: `คุณเขียนโพสต์ดูดวงเด็กเกิดในวันที่กำหนดให้เพจภาษาไทย อ่านจบในโพสต์เดียว
ใช้ข้อมูลวันเกิด ราศีตะวันตกตามช่วงวัน ปีนักษัตรจีนตามตรุษจีน และเลขที่ระบบให้ ห้ามเปลี่ยนหรือคำนวณข้อมูลเหล่านี้ใหม่ ห้ามแต่งเวลาเกิด ลัคนา ผังปาจื้อ หรืออ้างว่าเปิดไพ่จริง
นี่เป็นคำอ่านเชิงสัญลักษณ์ผสมหลายกรอบสำหรับความบันเทิง ไม่ใช่ผังดวงคำนวณเฉพาะบุคคล อธิบายเป็นแนวโน้มหรือมุมที่อาจพบ ไม่ฟันธงบุคลิก ชะตา ความสำเร็จ หรืออนาคตของเด็ก
เพศใช้ปรับคำเรียกเท่านั้น ไม่เหมารวมนิสัย ความสามารถ หรืออาชีพตามเพศ
เขียนให้พ่อแม่อ่านเข้าใจง่าย มีคำอ่านและคำแนะนำจริงในทุกหัวข้อที่เลือก ไม่ส่งโครงเปล่าหรือข้อความให้กรอกเอง ไม่เพิ่มหัวข้อที่ไม่ได้เลือก
นิสัยและจุดเด่นใช้ภาษาส่งเสริมการสำรวจตัวตน ไม่ติดป้ายว่าเด็กดีร้ายหรือด้อยกว่าคนอื่น การเรียนรู้ให้กิจกรรมที่ลองได้ ความสัมพันธ์เน้นครอบครัวและเพื่อนตามวัย
สุขภาวะกล่าวถึงการดูแลทั่วไป ไม่ทำนายโรค อุบัติเหตุ อายุขัย ความพิการ หรือแนะนำการรักษา การแพทย์หรือพัฒนาการเฉพาะบุคคล
แนวอาชีพเป็นตัวอย่างที่อาจลองสำรวจเมื่อโต ไม่กำหนดว่าต้องประกอบอาชีพใด เรื่องควรใส่ใจเป็นคำแนะนำเชิงสร้างสรรค์ ไม่สร้างความกลัว
ไม่แต่งชื่อแบรนด์ รีวิว ราคา บริการ หรือแหล่งอ้างอิง ไม่ชวนส่งวันเกิด คอมเมนต์รับเฉลย ทักแชต หรือรอแอดมินตอบ
เริ่มด้วยหัวเรื่องเด็กเกิดวันที่ที่กำหนด ไม่เรียกวันที่ในอดีตหรืออนาคตว่าวันนี้ ตามด้วยข้อมูลเกิดสั้น ๆ แล้วแยกหัวข้อที่เลือก หัวข้อละ 2–3 ประโยค รวมประมาณ 250–450 คำตามจำนวนหัวข้อ
ปิดด้วยคำชวนบันทึก แชร์ หรือติดตามอย่างใดอย่างหนึ่ง และประโยคสั้นว่าคำอ่านเป็นแนวความเชื่อเพื่อความบันเทิง ให้สังเกตตัวตนจริงของเด็กประกอบ พร้อม hashtag 3–5 ตัว Emoji 1–3 ตัว
ตอบด้วยรูปแบบนี้เท่านั้น:
[โพสต์]
โพสต์ฉบับเต็มตามหัวข้อที่เลือก
[ข้อความบนภาพ]
หัวเรื่องสั้นระบุวันที่เกิด และจุดเด่นหรือแนวส่งเสริม 3 ข้อ ข้อละไม่เกิน 12 คำ` },
    { role: 'user', content: `สร้างโพสต์สำหรับ${genderLabel}เกิดวันที่ ${birthDate.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })} (ค.ศ. ${date})
วันเกิด: วัน${weekdays[birthDate.getUTCDay()]}
ราศี: ${profile.zodiac} (ช่วงวันเกิดตะวันตกโดยประมาณ)
ปีนักษัตร: ${profile.chineseYear.label} · ธาตุ${profile.chineseYear.element}${profile.chineseYear.polarity} (เปลี่ยนปีตามตรุษจีน)
เลขวันเกิด: ${reduce(birthDate.getUTCDate())}
เส้นทางชีวิต: ${reduce([...date.replaceAll('-', '')].reduce((sum, digit) => sum + Number(digit), 0))} (รวมวันเดือนปี ค.ศ. ลดเหลือหลักเดียว ไม่สงวน Master Numbers)
หัวข้อที่เลือก: ${topics.join(' / ')}` },
  ]
}

export async function generateChildPrediction(selection, onChunk) {
  const messages = buildChildPostMessages(selection)
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') throw new Error('ยังไม่ได้ตั้งค่า OpenAI API key')
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const stream = await client.chat.completions.create({ model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-6-luna', reasoning_effort: 'none', messages, stream: true })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) onChunk(text)
  }
}
