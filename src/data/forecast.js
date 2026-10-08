import { zodiacSigns } from './astrology.js'

export const forecastWeekdays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
export const forecastTopics = ['การงาน', 'การเงิน', 'ความรัก', 'สุขภาพ', 'เรื่องควรระวัง']
export function expandForecastGroups(groups, groupBy) {
  return groups.flatMap(group => groupBy === 'weekday' && group.id === '2' ? [
    { id: '2-day', name: 'คนเกิดวันพุธกลางวัน', weekdayId: '2', ruler: 'Mercury' },
    { id: '2-night', name: 'คนเกิดวันพุธกลางคืน', weekdayId: '2', ruler: 'Rahu' },
  ] : [group])
}
export function getForecastContext({ date, period, groupBy, scope, groupIds = [], topics, includeDaily = false }) {
  const invalid = () => { throw new Error('กรุณาเลือกวันที่ ช่วงเวลา กลุ่ม และหัวข้อให้ครบ') }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) invalid()
  const start = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) invalid()
  if (!['daily', 'weekly', 'monthly'].includes(period) || !['weekday', 'zodiac'].includes(groupBy) || !['all', 'single', 'multiple'].includes(scope) || typeof includeDaily !== 'boolean') invalid()
  if (!Array.isArray(topics) || !topics.length || topics.length > forecastTopics.length || new Set(topics).size !== topics.length || topics.some(item => !forecastTopics.includes(item))) invalid()
  const availableGroups = groupBy === 'weekday' ? forecastWeekdays.map((name, index) => ({ id: String(index), name: `คนเกิดวัน${name}` })) : zodiacSigns
  if (scope !== 'all' && (!Array.isArray(groupIds) || !groupIds.length || (scope === 'single' && groupIds.length !== 1) || new Set(groupIds).size !== groupIds.length || groupIds.some(id => !availableGroups.some(item => item.id === id)))) invalid()
  const groups = expandForecastGroups(scope === 'all' ? availableGroups : availableGroups.filter(item => groupIds.includes(item.id)), groupBy)
  if (period === 'weekly') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
  if (period === 'monthly') start.setUTCDate(1)
  const end = new Date(start)
  if (period === 'weekly') end.setUTCDate(end.getUTCDate() + 6)
  if (period === 'monthly') end.setUTCMonth(end.getUTCMonth() + 1, 0)
  const formatDate = value => value.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
  const iso = value => value.toISOString().slice(0, 10)
  const dailyDates = period === 'weekly' && includeDaily ? Array.from({ length: 7 }, (_, index) => {
    const value = new Date(start)
    value.setUTCDate(value.getUTCDate() + index)
    return `วัน${forecastWeekdays[index]} ${formatDate(value)} (${iso(value)})`
  }) : []
  return { groups, topics: [...topics], periodLabel: { daily: 'รายวัน', weekly: 'รายสัปดาห์', monthly: 'รายเดือน' }[period], start: iso(start), end: iso(end), label: period === 'daily' ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`, dailyDates }
}
