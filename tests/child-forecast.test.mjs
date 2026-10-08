import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getBirthNumbers, getBirthProfile, childPostTopics } from '../src/data/birthProfile.js'
import { buildChildReport, renderChildPost, birthdayMeanings, lifePathMeanings } from '../src/data/childForecast.js'
import { readFile } from 'node:fs/promises'
import { getChildAstrology, zodiacMeanings, animalMeanings } from '../src/data/childAstrology.js'
import { calculateChildKua } from '../src/data/childKua.js'

const selection = { date: '2026-10-08', gender: 'boy', topics: ['นิสัย', 'จุดเด่น', 'เรื่องที่ควรใส่ใจ'] }

test('birth number 8 and life path 1 come from an auditable Gregorian digit sum', () => {
  const numbers = getBirthNumbers(selection.date)
  assert.equal(numbers.birthNumber, 8)
  assert.equal(numbers.lifePathSum, 10)
  assert.equal(numbers.lifePath, 1)
  assert.equal(numbers.lifePathDigits.reduce((sum, digit) => sum + digit, 0), 19)
  assert.equal(getBirthNumbers('2026-10-29').birthNumber, 29)
  assert.equal(getBirthNumbers('2026-10-22').birthNumber, 22)
  assert.deepEqual(numbers.lifePathParts.month.steps, [10, 1])
  assert.deepEqual(numbers.lifePathParts.day.steps, [8])
  assert.deepEqual(numbers.lifePathParts.year.steps, [2026, 10, 1])
  assert.equal(getBirthNumbers('2026-02-30'), null)
  assert.equal(getBirthNumbers('invalid'), null)
})

test('each topic uses a fixed rule and stays short without an image section or CTA', () => {
  const report = buildChildReport(selection)
  assert.equal(report.method.version, 'child-date-based-readings-v4')
  assert.equal(report.promptData.topics.length, 3)
  assert.equal(report.promptData.topics.find(item => item.topic === 'จุดเด่น').number, 8)
  assert.equal(report.promptData.topics.find(item => item.topic === 'นิสัย').number, 1)
  assert.ok(report.promptData.topics.every(item => item.source.startsWith('https://www.numerology.com/')))
  assert.ok(report.promptData.topics.every(item => item.evidence.some(part => part.system === 'sun-sign') && item.evidence.some(part => part.system === 'chinese-year-animal')))
  assert.ok(report.promptData.topics.every(item => item.heading === item.topic && !/เลข|ราศี|ศาสตร์/.test(item.heading)))
  for (const item of report.promptData.topics) assert.ok(item.text.length <= 160, `${item.topic} is too long`)
  const output = renderChildPost(report)
  assert.ok(!/\*\*|#[\p{L}]|ข้อความบนภาพ|แชร์|ติดตาม/gu.test(output))
  assert.ok(output.length < 1100)
  assert.equal(renderChildPost(buildChildReport(selection)), output)
})

test('gender does not rewrite gender-neutral readings; changed numbers change readings; selected topics stay exact', () => {
  const boy = buildChildReport(selection)
  const girl = buildChildReport({ ...selection, gender: 'girl' })
  assert.deepEqual(boy.promptData.topics, girl.promptData.topics)
  assert.match(renderChildPost(girl), /เด็กผู้หญิง/)
  assert.notDeepEqual(boy.promptData.topics, buildChildReport({ ...selection, date: '2026-10-09' }).promptData.topics)
  assert.deepEqual(buildChildReport({ ...selection, topics: ['จุดเด่น'] }).promptData.topics.map(item => item.topic), ['จุดเด่น'])
  for (const patch of [{ date: 'bad' }, { gender: 'bad' }, { topics: [] }, { topics: ['จุดเด่น', 'จุดเด่น'] }, { topics: ['unknown'] }]) assert.throws(() => buildChildReport({ ...selection, ...patch }))
})

test('birth-year metadata respects the Chinese New Year boundary', () => {
  assert.equal(getBirthProfile('2026-02-16').chineseYear.animalThai, 'มะเส็ง')
  assert.equal(getBirthProfile('2026-02-17').chineseYear.animalThai, 'มะเมีย')
})

test('child generator emits the calculated report and exact concise text without an API call', async () => {
  const source = (await readFile(new URL('../src/services/prediction.js', import.meta.url), 'utf8'))
    .replace("import OpenAI from 'openai'", "class OpenAI { constructor() { throw new Error('Child generation must not call OpenAI') } }")
    .replace(/from '@\/data\/([^']+)'/g, (_, name) => `from '${new URL(`../src/data/${name}.js`, import.meta.url).href}'`)
  const { generateChildPrediction } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
  let calculated = null
  let output = ''
  await generateChildPrediction(selection, chunk => { output += chunk }, report => { calculated = report })
  assert.equal(calculated.method.version, 'child-date-based-readings-v4')
  assert.equal(output, renderChildPost(calculated))
  assert.equal(calculated.promptData.profile.lifePath, 1)
})

test('date-only sun calculation skips an ingress day, while the other readings remain', () => {
  const before = getBirthProfile('2026-03-19')
  const cusp = getBirthProfile('2026-03-20')
  const after = getBirthProfile('2026-03-21')
  assert.equal(before.zodiac, 'ราศีมีน')
  assert.equal(cusp.zodiac, null)
  assert.equal(after.zodiac, 'ราศีเมษ')
  assert.equal(cusp.sunSign.start, '2026-03-19T17:00:00.000Z')
  const report = buildChildReport({ ...selection, date: '2026-03-20' })
  assert.ok(report.promptData.skipped.some(item => item.system === 'sun-sign'))
  assert.ok(report.promptData.topics.every(item => item.evidence.every(part => part.system !== 'sun-sign')))
  assert.ok(report.promptData.topics.every(item => item.evidence.some(part => part.system === 'chinese-year-animal')))
  assert.ok(!/null|undefined|ราศี/.test(renderChildPost(report)))
})

test('zodiac and year-animal inputs independently affect readings, with complete reference tables', () => {
  const profile = getBirthProfile(selection.date)
  const baseline = getChildAstrology(profile)
  const otherSign = getChildAstrology({ ...profile, zodiac: 'ราศีเมษ' })
  const otherYear = getChildAstrology({ ...profile, chineseYear: { ...profile.chineseYear, animalThai: 'ชวด' } })
  assert.notDeepEqual(baseline.evidence[0], otherSign.evidence[0])
  assert.deepEqual(baseline.evidence[1], otherSign.evidence[1])
  assert.notDeepEqual(baseline.evidence[1], otherYear.evidence[1])
  assert.deepEqual(baseline.evidence[0], otherYear.evidence[0])
  assert.equal(Object.keys(zodiacMeanings).length, 12)
  assert.equal(Object.keys(animalMeanings).length, 12)
  const noCalendar = getChildAstrology({ ...profile, chineseYear: null })
  assert.ok(noCalendar.skipped.some(item => item.system === 'chinese-year-animal'))
  assert.ok(noCalendar.evidence.every(item => item.system !== 'chinese-year-animal'))
  for (const system of ['bazi', 'weekday-taksa', 'natal-chart']) assert.ok(baseline.skipped.some(item => item.system === system))
})

test('Life Path follows the published example and preserves all three master numbers', () => {
  assert.equal(getBirthNumbers('1980-10-22').lifePath, 5)
  assert.equal(getBirthNumbers('2026-10-09').lifePath, 11)
  assert.equal(getBirthNumbers('2026-10-10').lifePath, 3)
  assert.equal(getBirthNumbers('2026-10-12').lifePath, 5)
  assert.equal(getBirthNumbers('2009-02-09').lifePath, 22)
  assert.equal(getBirthNumbers('2009-11-11').lifePath, 33)
  // Reducing a whole date would lose the intermediate day master number here.
  assert.equal(getBirthNumbers('2026-10-29').lifePath, 4)
  assert.deepEqual(getBirthNumbers('2026-10-29').lifePathParts.day.steps, [29, 11])
})

test('every birthday has its own meaning, master readings exist, and unsupported topics cannot be fabricated', () => {
  for (let day = 1; day <= 31; day++) {
    const date = `2026-10-${String(day).padStart(2, '0')}`
    const report = buildChildReport({ ...selection, date })
    assert.equal(report.promptData.profile.birthNumber, day)
    assert.ok(birthdayMeanings[day])
    assert.ok(lifePathMeanings[report.promptData.profile.lifePath])
    assert.ok(renderChildPost(report).length < 650)
  }
  assert.notEqual(birthdayMeanings[12], birthdayMeanings[3])
  for (const number of [11, 22, 33]) assert.ok(lifePathMeanings[number])
  for (const topic of ['สุขภาวะ', 'แนวอาชีพเมื่อโตขึ้น']) assert.throws(() => buildChildReport({ ...selection, topics: [topic] }))
})

test('new guidance topics use attributed editorial adaptations and selected headings only', () => {
  const report = buildChildReport({ ...selection, topics: childPostTopics })
  assert.equal(report.promptData.topics.length, 6)
  for (const topic of ['การเรียนรู้', 'สิ่งที่ควรส่งเสริม']) {
    const reading = report.promptData.topics.find(item => item.topic === topic)
    assert.ok(reading.text.length > 10 && reading.text.length < 160)
    assert.match(reading.adaptation, /ไม่ใช่สูตรทำนาย/)
  }
  assert.ok(renderChildPost(report).length < 1100)
  assert.deepEqual(report.promptData.topics.map(item => item.heading), childPostTopics)
})

test('gender affects actual Kua directions without changing the other interpretations', () => {
  const boy = buildChildReport({ ...selection, topics: childPostTopics })
  const girl = buildChildReport({ ...selection, topics: childPostTopics, gender: 'girl' })
  assert.equal(boy.promptData.kua.kua, 1)
  assert.equal(girl.promptData.kua.kua, 8)
  assert.equal(boy.promptData.kua.focusDirection, 'เหนือ')
  assert.equal(girl.promptData.kua.focusDirection, 'ตะวันออกเฉียงเหนือ')
  assert.notEqual(boy.promptData.topics.at(-1).text, girl.promptData.topics.at(-1).text)
  assert.deepEqual(boy.promptData.topics.slice(0, -1), girl.promptData.topics.slice(0, -1))
  const unknown = buildChildReport({ ...selection, topics: childPostTopics, gender: 'unspecified' })
  assert.equal(unknown.promptData.topics.length, 5)
  assert.ok(unknown.promptData.skipped.some(item => item.system === 'eight-mansions-kua'))
  assert.throws(() => buildChildReport({ ...selection, topics: ['ทิศส่งเสริม'], gender: 'unspecified' }))
})

test('Kua agrees with published year chart and uses Li Chun rather than lunar New Year', () => {
  const calc = (date, gender) => calculateChildKua(date, gender, getBirthProfile(date))
  for (const [year, male, female] of [[1981, 1, 8], [1999, 1, 8], [2000, 9, 6], [2004, 2, 1], [2024, 3, 3], [2025, 2, 4]]) {
    assert.equal(calc(`${year}-10-08`, 'boy').kua, male)
    assert.equal(calc(`${year}-10-08`, 'girl').kua, female)
  }
  assert.equal(calc('2026-01-10', 'boy').year, 2025)
  assert.equal(calc('2026-02-03', 'boy').year, 2025)
  assert.equal(calc('2026-02-04', 'boy').status, 'skipped')
  assert.equal(calc('2026-02-05', 'boy').year, 2026)
  // Lunar animal year is still snake here; Kua solar year has already changed.
  assert.equal(getBirthProfile('2026-02-05').chineseYear.animalThai, 'มะเส็ง')
  assert.equal(calc('2100-10-08', 'boy').status, 'skipped')
  const report = buildChildReport({ ...selection, date: '2026-02-04', topics: childPostTopics })
  assert.ok(report.promptData.topics.every(item => item.topic !== 'ทิศส่งเสริม'))
})
