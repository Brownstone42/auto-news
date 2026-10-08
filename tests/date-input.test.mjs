import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import { reactive, nextTick } from 'vue'
import { displayDate, parseDisplayDate } from '../src/data/dateInput.js'

test('date display always uses day/month/year and converts ambiguous dates back to ISO correctly', () => {
  assert.equal(displayDate('2026-10-03'), '03/10/2026')
  assert.equal(parseDisplayDate('03/10/2026'), '2026-10-03')
  assert.equal(parseDisplayDate('10/03/2026'), '2026-03-10')
  assert.equal(parseDisplayDate('3/10/2026'), '2026-10-03')
  assert.equal(parseDisplayDate('29/02/2024'), '2024-02-29')
  for (const value of ['29/02/2026', '31/04/2026', '10/13/2026', '2026-10-03', '03/10/', '']) assert.equal(parseDisplayDate(value), '')
  assert.equal(displayDate('2026-02-30'), '')
})

const filename = new URL('../src/components/DateInput.vue', import.meta.url)
const { descriptor } = parse(await readFile(filename, 'utf8'))
const source = compileScript(descriptor, { id: 'date-input-test' }).content
  .replace(/from 'vue'/g, `from '${import.meta.resolve('vue')}'`)
  .replace(/from '@\/data\/([^']+)'/g, (_, name) => `from '${new URL(`../src/data/${name}.js`, import.meta.url).href}'`)
const { default: component } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
function setup(value = '2026-10-03', min = '', max = '') {
  const props = reactive({ id: 'date', modelValue: value, min, max })
  const values = []
  const state = component.setup(props, { expose() {}, emit(name, value) { values.push(value); props.modelValue = value } })
  return { state, props, values }
}

test('typing retains incomplete input and invalid dates never become valid saved selections', async () => {
  const { state, props, values } = setup()
  assert.equal(state.text.value, '03/10/2026')
  state.onTextInput({ target: { value: '04/10/' } })
  await nextTick()
  assert.equal(state.text.value, '04/10/')
  assert.equal(props.modelValue, '')
  state.onTextInput({ target: { value: '31/04/2026' } })
  state.onBlur()
  assert.ok(state.validation.value)
  assert.equal(values.at(-1), '')
  state.onTextInput({ target: { value: '4/10/2026' } })
  await nextTick()
  state.onBlur()
  assert.equal(props.modelValue, '2026-10-04')
  assert.equal(state.text.value, '04/10/2026')
  props.modelValue = '2026-12-25'
  await nextTick()
  assert.equal(state.text.value, '25/12/2026')
})

test('calendar choices show day first, preserve ISO, enforce bounds and allow clearing', () => {
  const { state, props } = setup('2026-10-03', '2026-10-01', '2026-10-31')
  state.onCalendarInput({ target: { value: '2026-10-08' } })
  assert.equal(state.text.value, '08/10/2026')
  assert.equal(props.modelValue, '2026-10-08')
  state.onTextInput({ target: { value: '30/09/2026' } })
  assert.equal(props.modelValue, '')
  assert.match(state.validation.value, /01\/10\/2026/)
  state.onCalendarInput({ target: { value: '' } })
  assert.equal(props.modelValue, '')
  assert.equal(state.text.value, '')
})
