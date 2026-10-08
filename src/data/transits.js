import { GeoVector, Ecliptic, MakeTime } from 'astronomy-engine'
import { getForecastContext } from './forecast.js'
import { zodiacSigns } from './astrology.js'
import { WEEKDAY_METHOD, buildWeekdayGroups } from './weekdayForecast.js'

const planets = [
  { id: 'Sun', name: 'อาทิตย์', theme: 'ความชัดเจน การแสดงตัว และเป้าหมาย' },
  { id: 'Moon', name: 'จันทร์', theme: 'อารมณ์ ความต้องการ และจังหวะประจำวัน' },
  { id: 'Mercury', name: 'พุธ', theme: 'การสื่อสาร เอกสาร และการตัดสินใจ' },
  { id: 'Venus', name: 'ศุกร์', theme: 'ความสัมพันธ์ คุณค่า และความพึงพอใจ' },
  { id: 'Mars', name: 'อังคาร', theme: 'การลงมือ ความเร่งรีบ และแรงผลักดัน' },
  { id: 'Jupiter', name: 'พฤหัสบดี', theme: 'การขยายโอกาส การเรียนรู้ และการเติบโต' },
  { id: 'Saturn', name: 'เสาร์', theme: 'ความรับผิดชอบ วินัย และข้อจำกัด' },
  { id: 'Uranus', name: 'ยูเรนัส', theme: 'การเปลี่ยนแผนและแนวทางใหม่' },
  { id: 'Neptune', name: 'เนปจูน', theme: 'จินตนาการและการแยกความคาดหวังจากข้อเท็จจริง' },
  { id: 'Pluto', name: 'พลูโต', theme: 'การปรับโครงสร้างและอำนาจตัดสินใจ' },
]
const houses = ['ตัวตนและการเริ่มต้น', 'รายรับและคุณค่าที่มี', 'สื่อสารและเรียนรู้', 'บ้านและความมั่นคง', 'ความรักและความสร้างสรรค์', 'งานประจำและกิจวัตร', 'คู่สัมพันธ์และการตกลง', 'เงินร่วมและภาระร่วม', 'การศึกษาระยะยาวและการเปิดโลก', 'อาชีพและเป้าหมาย', 'เครือข่ายและแผนอนาคต', 'การพักและเรื่องเบื้องหลัง']
const topicRules = {
  โดยรวม: { houses: [1, 7, 10], planets: ['Sun', 'Moon', 'Jupiter', 'Saturn'] },
  การงาน: { houses: [6, 10, 11], planets: ['Sun', 'Mercury', 'Mars', 'Saturn'] },
  การเรียน: { houses: [3, 9], planets: ['Mercury', 'Jupiter', 'Sun'] },
  การเงิน: { houses: [2, 8, 11], planets: ['Venus', 'Jupiter', 'Saturn'] },
  สุขภาวะ: { houses: [1, 6, 12], planets: ['Moon', 'Sun', 'Mars', 'Saturn'] },
  สุขภาพ: { houses: [1, 6, 12], planets: ['Moon', 'Sun', 'Mars', 'Saturn'] },
  ความรัก: { houses: [5, 7], planets: ['Venus', 'Mars', 'Moon'] },
  คนโสด: { houses: [5, 7, 11], planets: ['Venus', 'Mars', 'Moon'] },
  คนมีคู่: { houses: [4, 7, 8], planets: ['Venus', 'Moon', 'Saturn'] },
  'สถานะยังไม่ชัดเจน': { houses: [5, 7, 12], planets: ['Venus', 'Mercury', 'Neptune'] },
  เรื่องควรระวัง: { houses: [6, 8, 12], planets: ['Mars', 'Saturn', 'Neptune', 'Mercury'] },
}
const aspectRules = [
  { angle: 0, name: 'กุม (conjunction)', theme: 'เน้นสองเรื่องร่วมกัน ต้องดูดาวประกอบ' },
  { angle: 60, name: 'เซ็กส์ไทล์', theme: 'ช่องทางที่ต้องลงมือใช้' },
  { angle: 90, name: 'ฉาก', theme: 'แรงเสียดทาน ต้องปรับวิธีหรือจัดลำดับ' },
  { angle: 120, name: 'ตรีโกณ', theme: 'ความร่วมมือและความคล่องตัว' },
  { angle: 180, name: 'เล็ง', theme: 'สองด้านที่ต้องเจรจาและหาสมดุล' },
]
export const TRANSIT_METHOD = { engine: 'Astronomy Engine 2.1.19', zodiac: 'Tropical', houses: 'Solar whole-sign: ราศีเกิดเป็นเรือนที่ 1', sampleTime: '09:00 Asia/Bangkok ของแต่ละวัน', orb: '3°', version: 'solar-transits-v1' }
export const angularDifference = (a, b) => ((a - b + 540) % 360) - 180
export const solarHouse = (planetSign, birthSign) => ((planetSign - birthSign + 12) % 12) + 1
export function longitudeAt(body, date) {
  if (body === 'Rahu') return meanLunarNode(date)
  const value = Ecliptic(GeoVector(body, date, true)).elon
  if (!Number.isFinite(value)) throw new Error('คำนวณตำแหน่งดาวไม่สำเร็จ')
  return value
}
export function meanLunarNode(date) {
  // Mean ascending node, TT centuries from J2000; not a physical planet or true node.
  // JCAAC 2025, Tomas Alonso, p. 92:
  // https://federacionastronomica.es/images/web/Journal%20JCAAC/contents/JCAAC_vol2_Tomas_Alonso.pdf
  const t = MakeTime(date).tt / 36525
  const longitude = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + t * t * t / 450000
  return ((longitude % 360) + 360) % 360
}
const weekdayPlanets = [...planets.slice(0, 7), { id: 'Rahu', name: 'ราหู (โหนดเฉลี่ย)', theme: 'ความคาดหวัง สิ่งเร้า และการตรวจข้อเท็จจริง' }]
export function calculateDay(isoDate, groupBy = 'zodiac') {
  const time = new Date(`${isoDate}T02:00:00Z`)
  const positions = (groupBy === 'weekday' ? weekdayPlanets : planets).map(planet => {
    const longitude = longitudeAt(planet.id, time)
    const before = longitudeAt(planet.id, new Date(time.getTime() - 43200000))
    const after = longitudeAt(planet.id, new Date(time.getTime() + 43200000))
    const speed = angularDifference(after, before)
    const signIndex = Math.floor(longitude / 30)
    return { ...planet, longitude, signIndex, sign: zodiacSigns[signIndex].name, degree: +(longitude % 30).toFixed(2), speed, motion: Math.abs(speed) < 0.01 ? 'ใกล้หยุดนิ่ง' : speed < 0 ? 'ถอยหลัง' : 'เดินหน้า' }
  })
  const aspects = []
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const first = positions[i], second = positions[j]
      const separation = Math.abs(angularDifference(first.longitude, second.longitude))
      const rule = aspectRules.find(item => Math.abs(separation - item.angle) <= 3)
      if (rule) aspects.push({ first: first.id, second: second.id, name: `${first.name}–${second.name} ${rule.name}`, angle: rule.angle, orb: +Math.abs(separation - rule.angle).toFixed(3), theme: rule.theme })
    }
  }
  return { date: isoDate, time: time.toISOString(), positions, aspects }
}
function signalsFor(day, birthSign, topic) {
  const rule = topicRules[topic]
  return day.positions.map(planet => {
    const house = solarHouse(planet.signIndex, birthSign)
    const aspects = day.aspects.filter(item => item.first === planet.id || item.second === planet.id).sort((a, b) => a.orb - b.orb).slice(0, 2)
    const score = (rule.houses.includes(house) ? 6 : 0) + (rule.planets.includes(planet.id) ? 3 : 0)
    return { score, planet: planet.id, house, text: `${planet.name} ${planet.sign} ${planet.degree}° ${planet.motion} · เรือน ${house} (${houses[house - 1]}) · ประเด็น ${planet.theme}${aspects.length ? ` · ${aspects.map(item => `${item.name} (${item.theme})`).join('; ')}` : ''}` }
  }).sort((a, b) => b.score - a.score || a.planet.localeCompare(b.planet)).slice(0, 2)
}

export function buildTransitReport(selection) {
  const context = getForecastContext(selection)
  if (Number(context.start.slice(0, 4)) < 1900 || Number(context.end.slice(0, 4)) > 2100) throw new Error('กรุณาเลือกวันที่ระหว่าง ค.ศ. 1900–2100')
  const days = []
  for (let value = new Date(`${context.start}T00:00:00Z`); value.toISOString().slice(0, 10) <= context.end; value.setUTCDate(value.getUTCDate() + 1)) {
    days.push(calculateDay(value.toISOString().slice(0, 10), selection.groupBy))
  }
  const movement = (selection.groupBy === 'weekday' ? weekdayPlanets : planets).map(planet => {
    const runs = []
    for (const day of days) {
      const position = day.positions.find(item => item.id === planet.id)
      const state = `${position.sign} ${position.motion}`
      if (runs.at(-1)?.state === state) runs.at(-1).end = day.date
      else runs.push({ state, start: day.date, end: day.date })
    }
    return `${planet.name}: ${runs.map(run => `${run.state} [${run.start}–${run.end}]`).join(' / ')}`
  })
  const closestAspects = new Map()
  for (const day of days) for (const aspect of day.aspects) {
    const key = `${aspect.first}:${aspect.second}:${aspect.angle}`
    if (!closestAspects.has(key) || closestAspects.get(key).orb > aspect.orb) closestAspects.set(key, { ...aspect, date: day.date })
  }
  const groups = selection.groupBy === 'weekday' ? buildWeekdayGroups(context, days) : context.groups.map(group => {
    const birthSign = zodiacSigns.findIndex(item => item.id === group.id)
    const topics = context.topics.map(topic => {
      const unique = new Map()
      for (const day of days) for (const signal of signalsFor(day, birthSign, topic)) {
        const key = `${signal.planet}:${signal.house}`
        if (!unique.has(key)) unique.set(key, { ...signal, date: day.date, sampleCount: 1 })
        else unique.get(key).sampleCount++
      }
      return { topic, evidence: [...unique.values()].sort((a, b) => b.score - a.score || b.sampleCount - a.sampleCount).slice(0, 3).map(item => `ตัวอย่าง ${item.date} (พบดาวในเรือนนี้เป็นหลักฐานหัวข้อนี้ ${item.sampleCount} วัน): ${item.text}`) }
    })
    const daily = context.dailyDates.length ? days.map(day => ({ date: day.date, evidence: signalsFor(day, birthSign, context.topics[0]).map(item => item.text), moonHouse: solarHouse(day.positions.find(item => item.id === 'Moon').signIndex, birthSign) })) : []
    return { name: group.name, topics, daily }
  })
  const method = selection.groupBy === 'weekday' ? WEEKDAY_METHOD : TRANSIT_METHOD
  const promptData = { method, period: context.label, movement, aspects: [...closestAspects.values()].sort((a, b) => a.orb - b.orb).slice(0, 10), groups }
  return { context, method, days, promptData }
}
