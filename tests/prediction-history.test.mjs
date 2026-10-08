import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import { reactive, nextTick } from 'vue'

const writes = []
let failWrite = false
globalThis.predictionHistoryMocks = {
  generateChildPrediction: async (_, chunk) => chunk('[โพสต์] child'),
  generateForecastPrediction: async (_, chunk, calculated) => {
    calculated({ method: { version: 'test' }, promptData: { groups: [] } })
    chunk('[โพสต์] forecast')
  },
  saveHoroscopePost: async value => {
    if (failWrite) throw new Error('offline')
    writes.push(JSON.parse(JSON.stringify(value)))
    return value.id || `post-${writes.length}`
  },
}
const filename = new URL('../src/components/PredictionPlanner.vue', import.meta.url)
const { descriptor } = parse(await readFile(filename, 'utf8'))
let source = compileScript(descriptor, { id: 'prediction-history-test' }).content
source = source.replace(/from 'vue'/g, `from '${import.meta.resolve('vue')}'`)
  .replace(/from '@\/data\/([^']+)'/g, (_, name) => `from '${new URL(`../src/data/${name}.js`, import.meta.url).href}'`)
  .replace(/import \{([^}]+)\} from '@\/services\/(?:prediction|firebase)'/g, 'const {$1} = globalThis.predictionHistoryMocks')
const { default: component } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
function setup(draft = null) {
  const props = reactive({ draft })
  const events = []
  const state = component.setup(props, { expose() {}, emit: (...args) => events.push(args) })
  return { props, state, events }
}

test('forecast auto-saves, edits the same record, and reopens saved selection', async () => {
  writes.length = 0
  const { state, props, events } = setup()
  state.date.value = '2026-10-08'
  state.groupBy.value = 'zodiac'
  state.groupIds.value = ['sign-1']
  assert.deepEqual(state.topics.value, ['การงาน', 'การเงิน', 'ความรัก', 'สุขภาพ', 'เรื่องควรระวัง'])
  await state.generatePost()
  assert.equal(writes.length, 1)
  assert.equal(writes[0].kind, 'prediction')
  assert.deepEqual(writes[0].selection.groupIds, ['sign-1'])
  assert.equal(writes[0].selection.includeDaily, false)
  assert.equal(state.currentId.value, 'post-1')
  state.output.value = '[โพสต์] edited'
  state.date.value = '2026-11-01'
  await state.saveGenerated()
  assert.equal(writes[1].id, 'post-1')
  assert.equal(writes[1].selection.date, '2026-10-08')
  const saved = events.filter(([name]) => name === 'saved').at(-1)[1]
  const reopened = setup(saved).state
  assert.equal(reopened.output.value, '[โพสต์] edited')
  assert.equal(reopened.date.value, '2026-10-08')
  props.draft = { ...saved, id: 'another', output: '[โพสต์] reopened' }
  await nextTick()
  assert.equal(state.currentId.value, 'another')
  assert.equal(state.output.value, '[โพสต์] reopened')
})

test('failed auto-save retains generated text and can be retried without regenerating', async () => {
  failWrite = true
  const { state } = setup()
  state.date.value = '2026-10-08'
  await state.generatePost()
  assert.equal(state.output.value, '[โพสต์] forecast')
  assert.equal(state.currentId.value, null)
  assert.match(state.storageMessage.value, /ไม่สำเร็จ/)
  assert.equal(state.isSaving.value, false)
  failWrite = false
  await state.saveGenerated()
  assert.ok(state.currentId.value)
  assert.equal(state.output.value, '[โพสต์] forecast')
})

test('checkbox groups switch between signs and weekdays, and empty selection cannot generate', () => {
  const { state } = setup()
  state.date.value = '2026-10-08'
  state.groupIds.value = []
  assert.equal(state.canGenerate.value, false)
  state.toggleAllGroups()
  assert.equal(state.selectedGroups.value.length, 7)
  state.groupBy.value = 'zodiac'
  state.changeGrouping()
  assert.equal(state.selectedGroups.value.length, 0)
  state.groupBy.value = 'weekday'
  assert.equal(state.groups.value.length, 7)
  state.toggleAllGroups()
  assert.equal(state.selectedGroups.value.length, 7)
  assert.equal(state.previewGroups.value.length, 8)
  assert.deepEqual(state.previewGroups.value.filter(group => group.weekdayId === '2').map(group => group.name), ['คนเกิดวันพุธกลางวัน', 'คนเกิดวันพุธกลางคืน'])
  assert.equal(state.canGenerate.value, true)
  state.groupBy.value = 'zodiac'
  state.changeGrouping()
  state.groupIds.value = ['sign-1', 'sign-7']
  assert.equal(state.selectedGroups.value.length, 2)
  assert.equal(state.canGenerate.value, true)
})

test('old all-group drafts reopen and new generation omits daily summaries and overview', () => {
  const { state } = setup({ id: 'old', output: 'old post', selection: {
    format: 'forecast', date: '2026-10-08', period: 'weekly', groupBy: 'zodiac', scope: 'all',
    topics: ['โดยรวม', 'การงาน'], includeDaily: true,
  } })
  assert.equal(state.selectedGroups.value.length, 12)
  assert.deepEqual(state.forecastSelection().topics, ['การงาน'])
  assert.equal(state.forecastSelection().includeDaily, false)
  assert.equal(state.output.value, 'old post')
})

test('weekday is the default and Wednesday generates from one checkbox selection', async () => {
  const { state } = setup()
  state.date.value = '2026-10-08'
  assert.equal(state.groupBy.value, 'weekday')
  assert.equal(state.groups.value.length, 7)
  state.groupIds.value = ['2']
  assert.equal(state.canGenerate.value, true)
  await state.generatePost()
  assert.equal(writes.at(-1).selection.groupBy, 'weekday')
  assert.deepEqual(writes.at(-1).selection.groupIds, ['2'])
})
