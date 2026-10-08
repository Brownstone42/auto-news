import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AstroTime } from 'astronomy-engine'
import { buildTransitReport, meanLunarNode, calculateDay } from '../src/data/transits.js'
import { taksaFor } from '../src/data/weekdayForecast.js'
import { forecastTopics } from '../src/data/forecast.js'

const selection = { date: '2026-10-08', period: 'weekly', groupBy: 'weekday', scope: 'multiple', groupIds: ['2'], topics: forecastTopics, includeDaily: false }

test('Wednesday-day Taksa matches the published example and night starts from Rahu', () => {
  assert.deepEqual(taksaFor('2-day').map(item => item.planet), ['Mercury', 'Saturn', 'Jupiter', 'Rahu', 'Venus', 'Sun', 'Moon', 'Mars'])
  assert.deepEqual(taksaFor('2-night').map(item => item.planet), ['Rahu', 'Venus', 'Sun', 'Moon', 'Mars', 'Mercury', 'Saturn', 'Jupiter'])
  for (const id of ['0', '1', '2-day', '2-night', '3', '4', '5', '6']) {
    const chart = taksaFor(id)
    assert.equal(new Set(chart.map(item => item.planet)).size, 8)
    assert.equal(new Set(chart.map(item => item.role)).size, 8)
  }
  assert.throws(() => taksaFor('2'))
})

test('mean lunar node uses TT and preserves its retrograde wrap', () => {
  assert.ok(Math.abs(meanLunarNode(AstroTime.FromTerrestrialTime(0)) - 125.04452) < 1e-8)
  const day = calculateDay('2026-10-08', 'weekday')
  assert.equal(day.positions.length, 8)
  assert.equal(day.positions.find(item => item.id === 'Rahu').motion, 'ถอยหลัง')
  assert.ok(day.positions.every(item => item.longitude >= 0 && item.longitude < 360))
  assert.ok(day.aspects.every(item => item.orb <= 3))
})

test('one Wednesday checkbox expands to two distinct complete readings without solar houses', () => {
  const report = buildTransitReport(selection)
  assert.equal(report.days.length, 7)
  assert.equal(report.method.version, 'weekday-taksa-transits-v1')
  assert.equal(report.promptData.groups.length, 2)
  const [day, night] = report.promptData.groups
  assert.notDeepEqual(day.taksa, night.taksa)
  assert.notDeepEqual(day.topics, night.topics)
  for (const group of report.promptData.groups) {
    assert.deepEqual(group.topics.map(item => item.topic), forecastTopics)
    assert.ok(group.topics.every(item => item.evidence.length && item.evidence.every(text => !text.includes('เรือน'))))
    assert.equal(group.daily.length, 0)
  }
})

test('weekday periods support all groups, monthly leap years and different actual dates', () => {
  const all = buildTransitReport({ ...selection, scope: 'all', period: 'daily' })
  assert.equal(all.promptData.groups.length, 8)
  assert.equal(all.days.length, 1)
  const later = buildTransitReport({ ...selection, scope: 'all', period: 'daily', date: '2026-10-15' })
  assert.notDeepEqual(all.promptData.groups[0].topics, later.promptData.groups[0].topics)
  const month = buildTransitReport({ ...selection, period: 'monthly', date: '2028-02-20' })
  assert.equal(month.days.length, 29)
  assert.throws(() => buildTransitReport({ ...selection, groupIds: ['2-night'] }))
})
