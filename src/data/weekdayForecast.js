// Taksa order and Wednesday-day example: Amnat Paksasuk, Thammasat University,
// https://doi.nrct.go.th/admin/doc/doc_577838.pdf pp. 79–83.
const order = ['Sun', 'Moon', 'Mars', 'Mercury', 'Saturn', 'Jupiter', 'Rahu', 'Venus']
const roles = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี']
const rulers = { '0': 'Moon', '1': 'Mars', '2-day': 'Mercury', '2-night': 'Rahu', '3': 'Jupiter', '4': 'Venus', '5': 'Saturn', '6': 'Sun' }
// These topic associations and the transit overlay are application rules,
// not age-based Taksa, a natal chart, or a claimed traditional transit formula.
const topicRoles = {
  การงาน: ['อุตสาหะ', 'มนตรี', 'เดช'],
  การเงิน: ['มูละ', 'ศรี'],
  ความรัก: ['บริวาร', 'ศรี'],
  สุขภาพ: ['อายุ'],
  เรื่องควรระวัง: ['กาลกิณี'],
}
export const WEEKDAY_METHOD = {
  engine: 'Astronomy Engine 2.1.19 + mean lunar ascending node',
  zodiac: 'Tropical; Rahu uses mean ascending lunar node of date',
  houses: 'ไม่มีเรือนชะตา ใช้ทักษาวันเกิด 8 ภูมิ',
  sampleTime: '09:00 Asia/Bangkok ของแต่ละวัน', orb: '3°', version: 'weekday-taksa-transits-v1',
  basis: 'ผังทักษาเดิมจากวันเกิด + กฎเชื่อมหัวข้อและดาวจรที่กำหนดสำหรับแอป ไม่ใช่ทักษาจรตามอายุ',
  source: 'https://doi.nrct.go.th/admin/doc/doc_577838.pdf',
  rules: topicRoles,
}
export function taksaFor(groupId) {
  const start = order.indexOf(rulers[groupId])
  if (start < 0) throw new Error('กลุ่มวันเกิดไม่ถูกต้อง')
  return roles.map((role, index) => ({ role, planet: order[(start + index) % order.length] }))
}
export function buildWeekdayGroups(context, days) {
  return context.groups.map(group => {
    const taksa = taksaFor(group.id)
    const topics = context.topics.map(topic => {
      const topicPlanets = taksa.filter(item => topicRoles[topic].includes(item.role))
      const signals = []
      for (const day of days) for (const item of topicPlanets) {
        const planet = day.positions.find(position => position.id === item.planet)
        const aspects = day.aspects.filter(aspect => aspect.first === item.planet || aspect.second === item.planet).sort((a, b) => a.orb - b.orb)
        signals.push({ date: day.date, role: item.role, planet: item.planet,
          // Select the closest actual aspect first; never invent a positive/negative score.
          orb: aspects[0]?.orb ?? 99,
          text: `${item.role}: ${planet.name} ${planet.sign} ${planet.degree}° ${planet.motion} · ${planet.theme} · ${aspects.length ? aspects.slice(0, 2).map(aspect => `${aspect.name} คลาด ${aspect.orb}° (${aspect.theme})`).join('; ') : 'ไม่พบมุมหลักในเกณฑ์ ณ เวลาตัวอย่าง'}` })
      }
      // Cover every associated role, then summarize its closest sample in the period.
      return { topic, evidence: topicPlanets.map(item => {
        const signal = signals.filter(value => value.role === item.role).sort((a, b) => a.orb - b.orb || a.date.localeCompare(b.date))[0]
        return `ตัวอย่าง ${signal.date}: ${signal.text}`
      }) }
    })
    return { name: group.name, taksa, topics, daily: [] }
  })
}
