// A fixed editorial weekday table, not a natal chart or daily transit formula.
// The app repeats this referenced table by weekday for the selected civil date.
export const COLOR_METHOD = {
  version: 'weekday-color-table-v1',
  basis: 'ตารางสีมงคลรายวัน แยกตามวันในสัปดาห์ ไม่ใช้วันเกิด',
  source: 'https://www.bankeela.info/trends/377750/',
  sourceTitle: 'ตารางสีมงคลแยกวันในสัปดาห์ บ้านกีฬา กันยายน 2569',
  rule: 'ใช้ชุดสีรายวันจากตารางอ้างอิงซ้ำตามวันในสัปดาห์ ไม่ได้คำนวณดาวหรืออัปเดตคำทำนายรายเดือน',
  timeZone: 'Asia/Bangkok',
}
export const colorTopics = ['เสริมการงาน', 'เสริมการเงิน', 'เสริมโชคลาภ', 'เสริมเสน่ห์', 'เสริมอำนาจบารมี', 'สีกาลกิณี']
// Indexed Sunday–Saturday, matching Date.getUTCDay() on the entered civil date.
const weekdayColors = [
  [['ชมพู'], ['ดำ'], ['ม่วง'], ['เขียว'], ['แดง', 'เทา'], ['น้ำเงิน']],
  [['เขียว'], ['ส้ม'], ['เหลือง'], ['เทา'], ['ดำ'], ['แดง', 'ชมพู']],
  [['ม่วง'], ['ฟ้า'], ['กรมท่า', 'น้ำเงิน'], ['ส้ม'], ['ดำ'], ['ขาว']],
  [['ส้ม'], ['เทา'], ['น้ำตาล'], ['เบจ', 'เหลือง'], ['แดง'], ['ชมพู']],
  [['แดง'], ['เหลือง'], ['เบจ'], ['ฟ้า'], ['น้ำตาล'], ['ดำ', 'ม่วง']],
  [['เทา'], ['เขียว'], ['ชมพู'], ['เหลือง'], ['ขาว'], ['ดำ']],
  [['น้ำเงิน'], ['น้ำตาล'], ['แดง'], ['ชมพู'], ['ฟ้า'], ['เขียว']],
]
const weekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('กรุณาเลือกวันที่ให้ครบ')
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) throw new Error('กรุณาเลือกวันที่ที่ถูกต้องระหว่าง ค.ศ. 1900–2100')
  return date
}
export function getColorDates({ mode = 'single', date, endDate }) {
  if (!['single', 'range'].includes(mode)) throw new Error('กรุณาเลือกวันเดียวหรือช่วงวันที่')
  const start = parseDate(date)
  const end = mode === 'range' ? parseDate(endDate) : start
  const count = (end - start) / 86400000 + 1
  if (count < 1) throw new Error('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น')
  if (count > 31) throw new Error('เลือกช่วงวันที่ได้ครั้งละไม่เกิน 31 วัน')
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10))
}
export function buildColorReport(date) {
  const day = parseDate(date)
  const weekday = weekdays[day.getUTCDay()]
  const topics = colorTopics.map((topic, index) => ({ topic, colors: [...weekdayColors[day.getUTCDay()][index]] }))
  return { method: COLOR_METHOD, promptData: { date, weekday, topics } }
}
export function renderColorPost(report) {
  const { date, weekday, topics } = report.promptData
  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
  return `[โพสต์]\nสีมงคลวัน${weekday}ที่ ${label}\n\n${topics.map(item => `- ${item.topic} - ${item.colors.map(color => `สี${color}`).join(', ')}`).join('\n')}`
}
