<script setup>
import { computed, ref, watch } from 'vue'
import { getColorDates, buildColorReport, renderColorPost } from '@/data/dailyColors'
import { presentPrediction } from '@/data/predictionPresentation'
import { saveHoroscopePost } from '@/services/firebase'
import DateInput from './DateInput.vue'

const props = defineProps({ draft: { type: Object, default: null } })
const emit = defineEmits(['busy', 'saved'])
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const mode = ref('single')
const date = ref(today)
const endDate = ref(today)
const busy = ref(false)
const posts = ref([])
const error = ref('')
const dates = computed(() => {
  try { return { values: getColorDates({ mode: mode.value, date: date.value, endDate: endDate.value }), error: '' } }
  catch (error) { return { values: [], error: error.message } }
})
watch(() => props.draft, post => {
  if (!post || post.selection?.format !== 'colors') return
  if (busy.value || posts.value.some(item => item.id === post.id && item.output === post.output)) return
  mode.value = 'single'
  date.value = post.selection.date
  endDate.value = date.value
  posts.value = [{ ...post, ...presentPrediction(post.output), copied: false, copyError: '', saveError: '' }]
}, { immediate: true })
async function generate() {
  if (busy.value || !dates.value.values.length) return
  const selectedDates = [...dates.value.values]
  const requestRange = { start: selectedDates[0], end: selectedDates.at(-1) }
  error.value = ''
  // Prepare every result first; save failures must never hide generated text.
  posts.value = selectedDates.map(day => {
    const calculation = buildColorReport(day)
    const output = renderColorPost(calculation)
    return { id: null, kind: 'prediction', selection: { format: 'colors', date: day, mode: 'single', requestRange }, calculation, output, ...presentPrediction(output), copied: false, copyError: '', saveError: '' }
  })
  busy.value = true
  emit('busy', true)
  try {
    for (const post of posts.value) {
      try {
        post.id = await saveHoroscopePost({ kind: post.kind, selection: post.selection, output: post.output, calculation: post.calculation, model: `table/${post.calculation.method.version}` })
        emit('saved', { id: post.id, kind: post.kind, selection: post.selection, output: post.output, calculation: post.calculation })
      } catch { post.saveError = 'บันทึกอัตโนมัติไม่สำเร็จ กรุณาคัดลอกโพสต์นี้เก็บไว้' }
    }
  } finally { busy.value = false; emit('busy', false) }
}
async function copy(post) {
  try { await navigator.clipboard.writeText(post.text); post.copied = true; post.copyError = '' }
  catch { post.copyError = 'คัดลอกไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง' }
}
</script>

<template>
  <div class="color-workspace">
    <aside class="color-settings">
      <h3>สีมงคลประจำวัน</h3>
      <fieldset :disabled="busy">
        <label for="color-mode">รูปแบบวันที่</label>
        <select id="color-mode" v-model="mode"><option value="single">วันเดียว</option><option value="range">ช่วงวันที่</option></select>
        <label for="color-date">{{ mode === 'range' ? 'วันเริ่มต้น' : 'วันที่ต้องการ' }} (ค.ศ.)</label>
        <DateInput id="color-date" v-model="date" min="1900-01-01" max="2100-12-31" />
        <template v-if="mode === 'range'"><label for="color-end-date">วันสิ้นสุด (ค.ศ.)</label><DateInput id="color-end-date" v-model="endDate" :min="date" max="2100-12-31" /></template>
      </fieldset>
      <p class="color-note">{{ dates.error || `สร้าง ${dates.values.length} โพสต์ แยกวันละโพสต์ ครบทุกหัวข้อ` }}</p>
      <p v-if="mode === 'range'" class="color-note">เลือกได้ครั้งละไม่เกิน 31 วัน</p>
      <button class="color-generate" :disabled="busy || !dates.values.length" @click="generate">{{ busy ? 'กำลังสร้างและบันทึก…' : 'สร้างโพสต์' }}</button>
    </aside>
    <section class="color-results" aria-label="ผลลัพธ์สีมงคลประจำวัน" :aria-busy="busy">
      <p v-if="error" class="color-error" role="alert">{{ error }}</p>
      <template v-if="posts.length">
        <article v-for="post in posts" :key="post.selection.date" class="color-post">
          <h2>{{ post.title }}</h2><div class="color-output">{{ post.body }}</div>
          <p v-if="post.saveError || post.copyError" class="color-error" role="alert">{{ post.saveError || post.copyError }}</p>
          <button class="color-copy" @click="copy(post)">{{ post.copied ? 'คัดลอกแล้ว' : 'คัดลอกโพสต์' }}</button>
        </article>
      </template>
      <div v-else class="color-empty"><h3>เตรียมโพสต์สีมงคลได้ล่วงหน้า</h3><p>เลือกวันเดียวหรือช่วงวันที่ แล้วกดสร้างโพสต์</p><p>แสดงครบทั้งการงาน การเงิน โชคลาภ เสน่ห์ อำนาจบารมี และสีกาลกิณี</p></div>
    </section>
  </div>
</template>

<style scoped>
.color-workspace{display:grid;grid-template-columns:300px minmax(0,1fr);gap:22px;margin-top:24px}.color-settings,.color-post,.color-empty{background:white;border:1px solid #e8e1ef;border-radius:16px;padding:24px}.color-settings{align-self:start}.color-settings h3,.color-empty h3{margin:0 0 18px;color:#503669}.color-settings fieldset{border:0;padding:0;margin:0;min-width:0}.color-settings label{display:block;margin:16px 0 8px;font-weight:600;font-size:14px;color:#51445f}.color-settings select,.color-settings input{box-sizing:border-box;width:100%;font:inherit;border:1px solid #ded4e7;border-radius:9px;padding:11px 12px;background-color:#fff;color:#33263f}.color-settings select{appearance:none;padding-right:38px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='m4 6 4 4 4-4' fill='none' stroke='%2376638a' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}.color-note,.color-empty p{font-size:14px;line-height:1.7;color:#807087}.color-generate,.color-copy{font:inherit;font-weight:600;border-radius:9px;padding:11px 17px;cursor:pointer}.color-generate{width:100%;border:0;background:#8055ad;color:white;margin-top:12px}.color-generate:disabled{opacity:.5;cursor:not-allowed}.color-results{display:grid;gap:18px;align-content:start;min-width:0}.color-post h2{font-size:23px;line-height:1.5;color:#473058;margin:0 0 20px}.color-output{white-space:pre-wrap;line-height:1.9;color:#403648}.color-copy{margin-top:20px;border:1px solid #ded1eb;color:#68408b;background:#faf6fe}.color-copy:hover{background:#f1e8fb}.color-error{color:#b03d58;font-size:14px;line-height:1.6}.color-settings input:focus-visible,.color-settings select:focus-visible,button:focus-visible{outline:2px solid #9d75c8;outline-offset:3px}@media(max-width:800px){.color-workspace{grid-template-columns:1fr}.color-settings,.color-post,.color-empty{padding:20px}.color-post h2{font-size:21px}}@media(forced-colors:active){.color-settings select{appearance:auto;background-image:none}}
</style>
