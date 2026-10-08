import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateDay, buildTransitReport, solarHouse, angularDifference } from '../src/data/transits.js'

const selection = { date: '2026-10-08', period: 'weekly', groupBy: 'zodiac', scope: 'multiple', groupIds: ['sign-1', 'sign-7'], topics: ['การงาน', 'การเงิน'], includeDaily: true }

test('geocentric Sun longitude agrees with independently fetched NASA JPL Horizons', () => {
  // Horizons: 2026-10-08 02:00 UTC, center 500@399, observer quantity 31.
  // https://ssd.jpl.nasa.gov/horizons/manual.html#obsquan
  const day = calculateDay('2026-10-08')
  assert.equal(day.time, '2026-10-08T02:00:00.000Z')
  assert.ok(Math.abs(day.positions.find(item => item.id === 'Sun').longitude - 194.8153731) < 0.01)
  assert.equal(day.positions.length, 10)
  assert.equal(day.positions.find(item => item.id === 'Venus').motion, 'ถอยหลัง')
  for (const position of day.positions) {
    assert.ok(position.longitude >= 0 && position.longitude < 360)
    assert.ok(position.degree >= 0 && position.degree <= 30)
    assert.ok(Number.isFinite(position.speed))
  }
  for (const aspect of day.aspects) assert.ok(aspect.orb >= 0 && aspect.orb <= 3)
})
test('longitude wrap and solar-house mapping work across the zodiac boundary', () => {
  assert.equal(angularDifference(1, 359), 2)
  assert.equal(angularDifference(359, 1), -2)
  assert.equal(solarHouse(0, 11), 2)
  assert.equal(solarHouse(11, 0), 12)
  assert.equal(solarHouse(6, 6), 1)
})
test('weekly reports calculate every day and keep each selected sign distinct', () => {
  const report = buildTransitReport(selection)
  assert.equal(report.days.length, 7)
  assert.equal(report.days[0].date, '2026-10-05')
  assert.equal(report.days.at(-1).date, '2026-10-11')
  assert.deepEqual(report.promptData.groups.map(item => item.name), ['ราศีเมษ', 'ราศีตุล'])
  const [aries, libra] = report.promptData.groups
  assert.equal(aries.daily.length, 7)
  assert.notDeepEqual(aries.topics, libra.topics)
  assert.notEqual(aries.daily[0].moonHouse, libra.daily[0].moonHouse)
  assert.ok(aries.topics.every(item => item.evidence.length > 0))
  for (const day of report.days) assert.equal(day.positions.length, 10)
})
test('daily and monthly dates, leap months and disabled daily summaries', () => {
  const day = buildTransitReport({ ...selection, period: 'daily' })
  assert.equal(day.days.length, 1)
  assert.equal(day.promptData.groups[0].daily.length, 0)
  const month = buildTransitReport({ ...selection, date: '2028-02-20', period: 'monthly', includeDaily: false })
  assert.equal(month.days.length, 29)
  assert.equal(month.days.at(-1).date, '2028-02-29')
  assert.equal(month.promptData.groups[0].daily.length, 0)
})
test('do not generate transit readings without a valid zodiac selection', () => {
  for (const patch of [
    { groupBy: 'weekday', groupIds: ['8'] }, { groupIds: [] }, { topics: [] },
    { date: '2026-02-30' }, { date: '1800-01-01' }, { date: '2101-01-01' },
  ]) assert.throws(() => buildTransitReport({ ...selection, ...patch }))
})
