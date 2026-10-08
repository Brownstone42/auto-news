import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import { reactive, nextTick } from 'vue'
import { getColorDates, buildColorReport, renderColorPost, colorTopics } from '../src/data/dailyColors.js'

test('color dates are inclusive, handle month/leap boundaries, and reject invalid ranges', () => {
  assert.deepEqual(getColorDates({ date: '2026-10-03' }), ['2026-10-03'])
  assert.deepEqual(getColorDates({ mode: 'range', date: '2024-02-28', endDate: '2024-03-01' }), ['2024-02-28', '2024-02-29', '2024-03-01'])
  assert.equal(getColorDates({ mode: 'range', date: '2026-10-01', endDate: '2026-10-31' }).length, 31)
  for (const selection of [{ date: '2026-02-30' }, { date: '' }, { date: '1899-10-03' }, { mode: 'range', date: '2026-10-03', endDate: '2026-10-02' }, { mode: 'range', date: '2026-10-01', endDate: '2026-11-01' }]) assert.throws(() => getColorDates(selection))
})

test('all six topics come from a fixed attributed weekday table, with plain Thai titles', () => {
  const report = buildColorReport('2026-10-03')
  assert.equal(report.promptData.weekday, 'เสาร์')
  assert.deepEqual(report.promptData.topics.map(item => item.topic), colorTopics)
  assert.deepEqual(report.promptData.topics.at(-1).colors, ['เขียว'])
  assert.deepEqual(report.promptData.topics, buildColorReport('2026-10-10').promptData.topics)
  assert.notDeepEqual(report.promptData.topics, buildColorReport('2026-10-04').promptData.topics)
  assert.match(renderColorPost(report), /สีมงคลวันเสาร์ที่ 3 ตุลาคม 2569/)
  assert.equal(renderColorPost(report).split('\n').filter(line => line.startsWith('- ')).length, 6)
  assert.match(report.method.source, /^https:/)
  assert.ok(!/\*\*|#[\p{L}]|ข้อความบนภาพ/u.test(renderColorPost(report)))
  for (const date of getColorDates({ mode: 'range', date: '2026-10-03', endDate: '2026-10-09' })) {
    assert.equal(buildColorReport(date).promptData.topics.length, 6)
    assert.ok(buildColorReport(date).promptData.topics.every(item => item.colors.length))
  }
})

const writes = []
const clipboard = []
let failureDate = null
globalThis.colorPostSaveMock = async value => {
  if (value.selection.date === failureDate) throw new Error('offline')
  writes.push(JSON.parse(JSON.stringify(value)))
  return `color-${value.selection.date}`
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async value => clipboard.push(value) } } })
const filename = new URL('../src/components/ColorPostPlanner.vue', import.meta.url)
const { descriptor } = parse(await readFile(filename, 'utf8'))
const source = compileScript(descriptor, { id: 'color-post-test' }).content
  .replace(/from 'vue'/g, `from '${import.meta.resolve('vue')}'`)
  .replace(/from '@\/data\/([^']+)'/g, (_, name) => `from '${new URL(`../src/data/${name}.js`, import.meta.url).href}'`)
  .replace("import { saveHoroscopePost } from '@/services/firebase'", 'const saveHoroscopePost = globalThis.colorPostSaveMock')
const { default: component } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
function setup(draft = null) {
  const props = reactive({ draft })
  const events = []
  const state = component.setup(props, { expose() {}, emit(name, value) {
    events.push([name, value])
    if (name === 'saved') props.draft = value // Real parent sends each saved post back.
  } })
  return { props, state, events }
}

test('range generation saves and copies each day separately without losing results to saved-event feedback', async () => {
  writes.length = 0
  const { state, events } = setup()
  state.mode.value = 'range'
  state.date.value = '2026-10-03'
  state.endDate.value = '2026-10-05'
  await state.generate()
  await nextTick()
  assert.equal(writes.length, 3)
  assert.equal(state.posts.value.length, 3)
  assert.equal(events.filter(([name]) => name === 'saved').length, 3)
  assert.ok(writes.every(post => post.selection.format === 'colors' && post.kind === 'prediction' && post.model === 'table/weekday-color-table-v1'))
  assert.deepEqual(writes.map(post => post.selection.date), ['2026-10-03', '2026-10-04', '2026-10-05'])
  for (const post of state.posts.value) await state.copy(post)
  assert.equal(clipboard.length, 3)
  assert.match(clipboard[0], /^สีมงคลวันเสาร์/)
  assert.match(clipboard[1], /^สีมงคลวันอาทิตย์/)
  assert.deepEqual(events.filter(([name]) => name === 'busy').map(([, value]) => value), [true, false])
})

test('a failed day stays visible and copyable while other days save, and saved drafts reopen', async () => {
  failureDate = '2026-10-04'
  const { state } = setup()
  state.mode.value = 'range'
  state.date.value = '2026-10-03'
  state.endDate.value = '2026-10-05'
  await state.generate()
  await nextTick()
  assert.equal(state.posts.value.length, 3)
  assert.match(state.posts.value[1].saveError, /ไม่สำเร็จ/)
  assert.ok(state.posts.value[0].id && state.posts.value[2].id)
  const reopened = setup(state.posts.value[0]).state
  assert.equal(reopened.mode.value, 'single')
  assert.equal(reopened.date.value, '2026-10-03')
  assert.equal(reopened.posts.value[0].text, state.posts.value[0].text)
  failureDate = null
})
