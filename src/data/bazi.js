export const baziElements = [
  { id: 'wood', name: 'ธาตุไม้' }, { id: 'fire', name: 'ธาตุไฟ' },
  { id: 'earth', name: 'ธาตุดิน' }, { id: 'metal', name: 'ธาตุทอง' }, { id: 'water', name: 'ธาตุน้ำ' },
]
export const baziDayMasters = [
  { id: 'jia', name: '甲 Jia · ไม้หยาง' }, { id: 'yi', name: '乙 Yi · ไม้หยิน' },
  { id: 'bing', name: '丙 Bing · ไฟหยาง' }, { id: 'ding', name: '丁 Ding · ไฟหยิน' },
  { id: 'wu', name: '戊 Wu · ดินหยาง' }, { id: 'ji', name: '己 Ji · ดินหยิน' },
  { id: 'geng', name: '庚 Geng · ทองหยาง' }, { id: 'xin', name: '辛 Xin · ทองหยิน' },
  { id: 'ren', name: '壬 Ren · น้ำหยาง' }, { id: 'gui', name: '癸 Gui · น้ำหยิน' },
]
export const baziPillars = [
  { id: 'year', name: 'เสาปี' }, { id: 'month', name: 'เสาเดือน' },
  { id: 'day', name: 'เสาวัน' }, { id: 'hour', name: 'เสาเวลา' },
]
export const baziTenGods = [
  { id: 'friend', name: '比肩 · Friend' }, { id: 'rob-wealth', name: '劫財 · Rob Wealth' },
  { id: 'eating-god', name: '食神 · Eating God' }, { id: 'hurting-officer', name: '傷官 · Hurting Officer' },
  { id: 'direct-wealth', name: '正財 · Direct Wealth' }, { id: 'indirect-wealth', name: '偏財 · Indirect Wealth' },
  { id: 'direct-officer', name: '正官 · Direct Officer' }, { id: 'seven-killings', name: '七殺 · Seven Killings' },
  { id: 'direct-resource', name: '正印 · Direct Resource' }, { id: 'indirect-resource', name: '偏印 · Indirect Resource' },
]
export function getBaziEntities(category) {
  return { element: baziElements, 'day-master': baziDayMasters, pillar: baziPillars, 'ten-god': baziTenGods }[category?.entityType] || []
}

export const baziCategories = [
  { id: 'bazi-basics', icon: '📚', label: 'พื้นฐานปาจื้อ', description: 'เริ่มต้นเข้าใจแปดอักษร', angles: [
    { id: 'intro', label: 'ปาจื้อคืออะไร', prompt: 'อธิบายแนวคิดแปดอักษรจากสี่เสา ปี เดือน วัน เวลา แบบมือใหม่และข้อจำกัดของการตีความ' },
    { id: 'zodiac', label: 'ปาจื้อกับปีนักษัตรต่างกันอย่างไร', prompt: 'อธิบายว่าปีนักษัตรเป็นเพียงส่วนหนึ่งของผัง ไม่สรุปบุคลิกหรือชีวิตจากปีเกิดอย่างเดียว' },
    { id: 'yin-yang', label: 'หยินกับหยางคืออะไร', prompt: 'อธิบายหยินหยางเชิงสัญลักษณ์ ไม่เท่ากับดีร้ายหรือเพศของบุคคลโดยตรง' },
    { id: 'stems-branches', label: 'ก้านฟ้ากับกิ่งดินคืออะไร', prompt: 'อธิบายบทบาทของ Heavenly Stems และ Earthly Branches รวมแนวคิดธาตุแฝงแบบภาพรวม ไม่สร้างตารางเทียบเอง' },
    { id: 'birth-time', label: 'ทำไมเวลาเกิดจึงสำคัญ', prompt: 'อธิบายผลของข้อมูลเวลาเกิดที่ไม่แน่นอน ไม่คำนวณเสาเวลาเองหรือสรุปว่าขาดเวลาแล้วอ่านอะไรไม่ได้ทั้งหมด' },
    { id: 'calendar', label: 'ปฏิทินและจุดเปลี่ยนฤดูกาล', prompt: 'อธิบายบทบาท solar terms ในเกณฑ์แบ่งปีและเดือนของปาจื้อ ไม่ใช้วันตรุษจีนแทนทุกเกณฑ์ ไม่ระบุเวลาจุดเปลี่ยนโดยไม่มีข้อมูลตรวจสอบ' },
    { id: 'before-reading', label: 'ก่อนอ่านผังต้องรู้อะไร', prompt: 'เสนอ checklist ข้อมูลเกิด เขตเวลา สถานที่เกิด เกณฑ์สำนัก และผังที่ตรวจแล้ว ไม่ชวนผู้อ่านส่งข้อมูลส่วนตัว' },
    { id: 'misconceptions', label: 'ความเข้าใจผิดที่พบบ่อย', prompt: 'อธิบายความเข้าใจผิด เช่น ธาตุขาดต้องเติมเสมอ ธาตุมากต้องดี และปีนักษัตรบอกทุกอย่าง' },
  ] },
  { id: 'bazi-elements', icon: '🌿', label: 'ธาตุทั้งห้า', description: 'ไม้ ไฟ ดิน ทอง น้ำ', entityType: 'element', entityLabel: 'เลือกธาตุ', angles: [
    { id: 'meaning', label: 'ธาตุนี้สื่อถึงอะไร', prompt: 'อธิบายภาพแทนและความหมายเชิงสัญลักษณ์ของธาตุที่เลือก ไม่กำหนดนิสัยคนจากธาตุเดียว' },
    { id: 'yin-yang', label: 'ธาตุนี้แบบหยินและหยาง', prompt: 'เปรียบเทียบภาพแทนหยินหยางของธาตุที่เลือกพร้อมตัวอย่างสมมติ ไม่ตัดสินความดีร้าย' },
    { id: 'cycles', label: 'วงจรส่งเสริมและควบคุม', prompt: 'อธิบายความสัมพันธ์ส่งเสริมและควบคุมของธาตุที่เลือก ไม่ตีความการควบคุมว่าเลวเสมอ' },
    { id: 'balance', label: 'มีมากหรือขาดแปลว่าอะไร', prompt: 'อธิบายว่าจำนวนธาตุอย่างเดียวไม่พอ ต้องดูฤดูกาล ราก และความสัมพันธ์ ไม่แนะนำให้เติมธาตุอัตโนมัติ' },
  ] },
  { id: 'bazi-day-master', icon: '☯', label: 'Day Master', description: 'รู้จักดิถีทั้ง 10 แบบ', entityType: 'day-master', entityLabel: 'เลือก Day Master', angles: [
    { id: 'meaning', label: 'รู้จัก Day Master นี้', prompt: 'อธิบายก้านฟ้าในเสาวันเป็นจุดอ้างอิงของการอ่าน และภาพแทนของ Day Master ที่เลือก ไม่ทำนายคนจริง' },
    { id: 'strengths', label: 'จุดเด่นและมุมที่ควรเข้าใจ', prompt: 'เล่าจุดเด่นเชิงสัญลักษณ์ของ Day Master ที่เลือกและความหลากหลายเมื่อผังต่างกัน ไม่เหมารวมคนทั้งหมด' },
    { id: 'season', label: 'ทำไมฤดูกาลจึงสำคัญ', prompt: 'อธิบายบทบาทฤดูกาลต่อการประเมิน Day Master ที่เลือก ไม่ประเมินแข็งอ่อนจากจำนวนอย่างเดียว' },
    { id: 'strong-weak', label: 'แข็งหรืออ่อนหมายถึงอะไร', prompt: 'อธิบายความแข็งอ่อนเชิงเทคนิค ไม่เท่ากับคนเก่งหรืออ่อนแอ และไม่ตัดสินผังสมมติโดยข้อมูลไม่ครบ' },
  ] },
  { id: 'bazi-pillars', icon: '🏛️', label: 'เสาชะตาทั้งสี่', description: 'ปี เดือน วัน และเวลา', entityType: 'pillar', entityLabel: 'เลือกเสาชะตา', angles: [
    { id: 'role', label: 'เสานี้มีบทบาทอย่างไร', prompt: 'อธิบายบทบาทของเสาที่เลือกในภาพรวม ระบุว่ากรอบตีความอาจต่างตามสำนัก ไม่กำหนดช่วงอายุแบบตายตัว' },
    { id: 'structure', label: 'อ่านก้านฟ้ากับกิ่งดินในเสานี้', prompt: 'อธิบายส่วนประกอบของเสาที่เลือกและแนวคิดอ่านประกอบกัน ไม่สร้างผังเกิดของคนจริง' },
    { id: 'context', label: 'ทำไมอ่านเสาเดียวไม่พอ', prompt: 'อธิบายการอ่านเสาที่เลือกพร้อมบริบทผังอื่น ไม่สรุปชีวิตจากตัวอักษรเดียว' },
    { id: 'mistakes', label: 'ข้อผิดพลาดเมื่ออ่านเสานี้', prompt: 'เล่าความเข้าใจผิดเกี่ยวกับเสาที่เลือกพร้อมตัวอย่างสมมติที่ไม่ต้องคำนวณวันเกิด' },
  ] },
  { id: 'bazi-ten-gods', icon: '🔗', label: 'สิบเทพ (Ten Gods)', description: 'ความสัมพันธ์เทียบกับ Day Master', entityType: 'ten-god', entityLabel: 'เลือก Ten God', angles: [
    { id: 'meaning', label: 'ชื่อนี้หมายถึงอะไร', prompt: 'อธิบาย Ten God ที่เลือกเป็นชื่อความสัมพันธ์ระหว่างธาตุและหยินหยางกับ Day Master ไม่ใช่เทพจริงหรือคำทำนายตามชื่อโดยตรง' },
    { id: 'daily-life', label: 'เล่าให้เข้าใจผ่านชีวิตประจำวัน', prompt: 'ยกอุปมาในชีวิตประจำวันของ Ten God ที่เลือก ระบุว่าเป็นอุปมา ไม่กำหนดอาชีพหรือบุคลิกตายตัว' },
    { id: 'context', label: 'มีมากหรือไม่มีต้องกังวลไหม', prompt: 'อธิบายว่าปริมาณหรือการไม่เห็น Ten God ที่เลือกไม่พอตัดสินชีวิต ต้องอ่านทั้งผัง ไม่สร้างความกลัว' },
    { id: 'misconceptions', label: 'ความเข้าใจผิดจากชื่อ', prompt: 'อธิบายข้อจำกัดของการแปลชื่อ Ten God ที่เลือกแบบตรงตัว เช่น ไม่สรุปเหตุร้าย ความร่ำรวย หรือความผิดกฎหมายจากชื่อ' },
  ] },
  { id: 'bazi-luck', icon: '🕰️', label: 'จังหวะและวัฏจักร', description: 'รู้จักเสาโชคและปีจร', angles: [
    { id: 'luck-pillars', label: 'เสาโชคสิบปีคืออะไร', prompt: 'อธิบายแนวคิด Da Yun และการอ่านร่วมกับผังเดิม ไม่คำนวณอายุเริ่มต้น ทิศทาง หรือเสาโชคเฉพาะบุคคล' },
    { id: 'annual', label: 'ปีจรกับผังเดิมต่างกันอย่างไร', prompt: 'อธิบายแนวคิดปีจรเทียบกับผังเดิม ไม่ทำนายปีปัจจุบันหรือระบุเสาปีจากความจำ' },
    { id: 'interactions', label: 'ชงและรวมต้องแปลว่าร้ายหรือดีไหม', prompt: 'อธิบาย clash และ combination เป็นความสัมพันธ์ที่ต้องดูเงื่อนไข ไม่ถือว่ารวมแล้วแปลงธาตุเสมอหรือชงแล้วเกิดเรื่องร้ายแน่นอน' },
    { id: 'limits', label: 'ทำไมปีเดียวกันแต่แต่ละคนต่างกัน', prompt: 'อธิบายว่าปีจรต้องอ่านเทียบผังและเกณฑ์เฉพาะ ไม่เหมารวมคนปีนักษัตรเดียวกันหรือรับประกันเหตุการณ์' },
  ] },
]

export function validateBaziSelection({ category, angle, entity }) {
  const canonical = baziCategories.find((item) => item.id === category?.id)
  if (!canonical || !canonical.angles.some((item) => item.id === angle?.id)) return false
  return !canonical.entityType || getBaziEntities(canonical).some((item) => item.id === entity?.id)
}
