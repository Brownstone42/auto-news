<script setup>
import { computed, ref, watch } from 'vue'
import { zodiacSigns } from '@/data/astrology'
import { getBirthProfile, childPostTopics, defaultChildTopics, normalizeChildTopic } from '@/data/birthProfile'
import { calculateChildKua } from '@/data/childKua'
import { generateChildPrediction, generateForecastPrediction } from '@/services/prediction'
import { forecastTopics, getForecastContext, expandForecastGroups } from '@/data/forecast'
import { saveHoroscopePost } from '@/services/firebase'
import { presentPrediction } from '@/data/predictionPresentation'
import ColorPostPlanner from './ColorPostPlanner.vue'

const props = defineProps({ draft: { type: Object, default: null } })
const emit = defineEmits(['busy', 'saved'])

const formats = [
  { id: 'forecast', icon: '🔮', label: 'ดวงตามช่วงเวลา', description: 'รายวัน รายสัปดาห์ รายเดือน' },
  { id: 'child', icon: '👶', label: 'เด็กเกิดวันนี้', description: 'เลขศาสตร์ ราศี ปีนักษัตร และทิศส่งเสริม' },
  { id: 'colors', icon: '🎨', label: 'สีมงคล', description: 'เลือกวันหรือช่วงวันที่ ครบทุกหัวข้อ' },
  { id: 'calendar', icon: '🗓️', label: 'ปฏิทินดวง', description: 'รัก งาน เงิน และสุขภาวะ' },
  { id: 'ranking', icon: '🏆', label: 'จัดอันดับดวงเด่น', description: 'เงินพุ่ง รักเด่น งานปัง' },
  { id: 'good-news', icon: '✨', label: 'ข่าวดีที่กำลังมา', description: 'เรื่องน่าจับตาในช่วงที่เลือก' },
  { id: 'relief', icon: '🌤️', label: 'จังหวะคลี่คลาย — พ้นเคราะห์', description: 'เรื่องที่เบาลงและโอกาสตั้งหลัก' },
]
const weekdays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
const adultTopics = forecastTopics
const childTopics = childPostTopics
const formatId = ref('forecast')
const period = ref('weekly')
const date = ref(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
const groupBy = ref('weekday')
const groupIds = ref(['0'])
const focus = ref('การงาน')
const gender = ref('boy')
const topics = ref([...adultTopics])
const output = ref('')
const generatedSelection = ref(null)
const calculation = ref(null)
const isGenerating = ref(false)
const generationError = ref('')
const copied = ref('')
const currentId = ref(null)
const isSaving = ref(false)
const colorBusy = ref(false)
const storageMessage = ref('')
const storageError = ref(false)
watch([isGenerating, isSaving, colorBusy], () => emit('busy', isGenerating.value || isSaving.value || colorBusy.value))
const format = computed(() => formats.find(item => item.id === formatId.value))
const isChild = computed(() => formatId.value === 'child')
const isForecast = computed(() => formatId.value === 'forecast')
const supportsGeneration = computed(() => isChild.value || isForecast.value)
const isColors = computed(() => formatId.value === 'colors')
const isCalendar = computed(() => formatId.value === 'calendar')
const isRanking = computed(() => formatId.value === 'ranking')
const effectivePeriod = computed(() => isChild.value ? 'daily' : isCalendar.value ? 'monthly' : isColors.value ? 'weekly' : period.value)
const groups = computed(() => groupBy.value === 'weekday' || isColors.value
  ? weekdays.map((name, index) => ({ id: String(index), name: `คนเกิดวัน${name}`, shortName: name })) : zodiacSigns)
const selectedGroups = computed(() => groups.value.filter(item => groupIds.value.includes(item.id)))
const previewGroups = computed(() => isForecast.value ? expandForecastGroups(selectedGroups.value, groupBy.value) : selectedGroups.value)
const parsedDate = computed(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return null
  const value = new Date(`${date.value}T00:00:00Z`)
  return Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== date.value ? null : value
})
function shortDate(value) { return value.toLocaleDateString('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) }
const range = computed(() => {
  if (!parsedDate.value) return null
  const start = new Date(parsedDate.value)
  const end = new Date(start)
  if (effectivePeriod.value === 'weekly') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
    end.setTime(start.getTime())
    end.setUTCDate(end.getUTCDate() + 6)
  } else if (effectivePeriod.value === 'monthly') {
    start.setUTCDate(1)
    end.setUTCMonth(end.getUTCMonth() + 1, 0)
  }
  return { start, end, label: effectivePeriod.value === 'daily' ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}` }
})
const dailyDates = computed(() => {
  if (!range.value) return []
  const length = effectivePeriod.value === 'monthly' ? range.value.end.getUTCDate() : 7
  return Array.from({ length }, (_, index) => {
    const day = new Date(range.value.start)
    day.setUTCDate(day.getUTCDate() + index)
    return { id: day.toISOString(), label: `${weekdays[(day.getUTCDay() + 6) % 7]} ${day.getUTCDate()}` }
  })
})
const childFacts = computed(() => parsedDate.value ? {
  ...getBirthProfile(date.value),
  weekday: weekdays[(parsedDate.value.getUTCDay() + 6) % 7],
} : null)
const childKua = computed(() => childFacts.value ? calculateChildKua(date.value, gender.value, childFacts.value) : null)
function changeFormat(id) {
  if (isGenerating.value || isSaving.value || colorBusy.value) return
  if (formatId.value !== id) {
    output.value = ''
    generatedSelection.value = null
    calculation.value = null
    generationError.value = ''
    copied.value = ''
    currentId.value = null
    storageMessage.value = ''
  }
  formatId.value = id
  topics.value = [...(id === 'child' ? defaultChildTopics : adultTopics)]
  focus.value = 'การงาน'
  if (id === 'colors') groupBy.value = 'weekday'
  if (id === 'forecast') groupBy.value = 'weekday'
  changeGrouping()
}
function changeGrouping() {
  groupIds.value = groupIds.value.filter(id => groups.value.some(item => item.id === id))
}
function toggleAllGroups() {
  groupIds.value = selectedGroups.value.length === groups.value.length ? [] : groups.value.map(item => item.id)
}
const title = computed(() => `${format.value.label}${isRanking.value || isCalendar.value ? ` · ${focus.value}` : ''}`)
function forecastSelection() {
  return { format: 'forecast', date: date.value, period: period.value, groupBy: groupBy.value, scope: 'multiple', groupIds: selectedGroups.value.map(item => item.id), topics: [...topics.value], includeDaily: false }
}
const canGenerate = computed(() => {
  if (isGenerating.value || isSaving.value || !supportsGeneration.value || !topics.value.length) return false
  if (isChild.value) return !!childFacts.value
  if (!parsedDate.value || parsedDate.value.getUTCFullYear() < 1900 || parsedDate.value.getUTCFullYear() > 2100) return false
  try { getForecastContext(forecastSelection()); return true } catch { return false }
})
const displayedPost = computed(() => presentPrediction(output.value))
async function generatePost() {
  if (!canGenerate.value) return
  const snapshot = isForecast.value ? forecastSelection() : { format: 'child', date: date.value, gender: gender.value, topics: [...topics.value] }
  output.value = ''
  generationError.value = ''
  copied.value = ''
  generatedSelection.value = snapshot
  calculation.value = null
  currentId.value = null
  storageMessage.value = ''
  storageError.value = false
  isGenerating.value = true
  try {
    const generator = snapshot.format === 'forecast' ? generateForecastPrediction : generateChildPrediction
    await generator(snapshot, text => { output.value += text }, report => { calculation.value = report })
    if (!output.value.trim()) throw new Error('ยังไม่ได้รับข้อความ กรุณาลองสร้างอีกครั้ง')
    await saveGenerated()
  } catch (error) { generationError.value = error.message || 'สร้างโพสต์ไม่สำเร็จ กรุณาลองอีกครั้ง' }
  finally { isGenerating.value = false }
}
async function saveGenerated() {
  if (!output.value.trim() || !generatedSelection.value || isSaving.value) return
  isSaving.value = true
  storageError.value = false
  try {
    currentId.value = await saveHoroscopePost({ id: currentId.value, kind: 'prediction', selection: generatedSelection.value, output: output.value, calculation: calculation.value, model: generatedSelection.value.format === 'child' ? `rules/${calculation.value?.method.version || 'child-date-based-readings-v4'}` : undefined })
    storageMessage.value = 'บันทึกในฐานข้อมูลแล้ว'
    emit('saved', { id: currentId.value, kind: 'prediction', selection: generatedSelection.value, output: output.value, calculation: calculation.value })
  } catch { storageError.value = true; storageMessage.value = 'บันทึกอัตโนมัติไม่สำเร็จ กรุณาคัดลอกข้อความเก็บไว้' }
  finally { isSaving.value = false }
}
watch(() => props.draft, post => {
  if (!post || (post.id === currentId.value && post.output === output.value)) return
  const value = post.selection
  if (value.format === 'colors' && isColors.value) return
  changeFormat(value.format)
  date.value = value.date
  period.value = value.period || 'weekly'
  groupBy.value = value.groupBy || 'weekday'
  changeGrouping()
  groupIds.value = value.scope === 'all' ? groups.value.map(item => item.id) : value.groupIds || []
  gender.value = value.gender || 'unspecified'
  const allowed = value.format === 'child' ? childTopics : adultTopics
  topics.value = value.topics?.map(topic => value.format === 'child' ? normalizeChildTopic(topic) : topic).filter(topic => allowed.includes(topic)) || [...allowed]
  if (!topics.value.length) topics.value = [...allowed]
  currentId.value = post.id
  generatedSelection.value = value
  output.value = post.output
  calculation.value = post.calculation || null
  storageMessage.value = 'เปิดโพสต์จากฐานข้อมูลแล้ว'
  storageError.value = false
}, { immediate: true })
async function copyOutput() {
  try { await navigator.clipboard.writeText(displayedPost.value.text); copied.value = 'post' }
  catch { generationError.value = 'คัดลอกไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง' }
}
</script>

<template>
  <div class="planner">
    <div class="intro"><span>โพสต์ดูดวง</span><h2>เลือกแนวโพสต์ที่อยากทำ</h2><p>คำทำนายอยู่ครบในโพสต์ อ่านจบได้เลย ไม่ต้องรอแอดมินตอบ</p></div>
    <div class="format-grid" aria-label="รูปแบบโพสต์ดูดวง">
      <button v-for="item in formats" :key="item.id" :class="['format-card', { active: formatId === item.id }]" :aria-pressed="formatId === item.id" :disabled="isGenerating || isSaving || colorBusy" @click="changeFormat(item.id)"><span aria-hidden="true">{{ item.icon }}</span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></button>
    </div>
    <ColorPostPlanner v-if="isColors" :draft="draft" @busy="colorBusy = $event" @saved="emit('saved', $event)" />
    <div v-else class="workspace">
      <aside class="settings" aria-label="ตั้งค่ารูปแบบโพสต์ดูดวง">
        <fieldset class="form-fields" :disabled="isGenerating || isSaving">
        <h3>{{ format.icon }} {{ format.label }}</h3>
        <template v-if="!isChild && !isColors && !isCalendar"><label for="prediction-period">ช่วงเวลา</label><select id="prediction-period" v-model="period"><option value="daily">รายวัน</option><option value="weekly">รายสัปดาห์</option><option value="monthly">รายเดือน</option></select></template>
        <label for="prediction-date">{{ isChild ? 'วันเดือนปีเกิด' : isCalendar ? 'เลือกวันที่ในเดือนที่ต้องการ' : 'วันที่อ้างอิง' }} (ค.ศ.)</label><input id="prediction-date" v-model="date" type="date" />
        <p class="note">{{ range ? range.label : 'กรุณาเลือกวันที่ให้ครบ' }}</p>
        <template v-if="isChild">
          <label for="child-gender">เด็กเพศอะไร</label><select id="child-gender" v-model="gender"><option value="boy">เด็กผู้ชาย</option><option value="girl">เด็กผู้หญิง</option><option value="unspecified">ไม่ระบุ</option></select>
          <div v-if="childFacts" class="birth-facts" aria-live="polite"><strong>ข้อมูลจากวันเกิดเด็ก</strong><dl><dt>วันเกิด</dt><dd>วัน{{ childFacts.weekday }}</dd><dt>ราศีอาทิตย์</dt><dd>{{ childFacts.zodiac || 'วันย้ายราศี — เว้นคำอ่านราศี' }}</dd><dt>ปีนักษัตร</dt><dd>{{ childFacts.chineseYear ? `ปี${childFacts.chineseYear.animal} (${childFacts.chineseYear.animalThai})` : 'เว้นคำอ่านปีนักษัตร — ปฏิทินจีนไม่พร้อม' }}</dd><dt>เลขกัวจากปีเกิดและเพศ</dt><dd>{{ childKua?.status === 'available' ? childKua.kua : childKua?.reason }}</dd></dl></div>
          <p class="note">ราศีใช้ช่วงวันเกิดแบบตะวันตกโดยประมาณ ปีนักษัตรจีนเปลี่ยนปีเมื่อถึงวันตรุษจีน</p>
        </template>
        <template v-else>
          <template v-if="!isColors"><label for="prediction-group">แบ่งกลุ่มตาม</label><select id="prediction-group" v-model="groupBy" @change="changeGrouping"><option value="weekday">วันเกิด จันทร์–อาทิตย์</option><option value="zodiac">ราศี</option></select><p v-if="isForecast" class="note">{{ groupBy === 'zodiac' ? 'ใช้ดาวจรและเรือนตามราศี รองรับ ค.ศ. 1900–2100' : 'ใช้ทักษาวันเกิดร่วมกับดาวจร เลือกพุธแล้วแยกกลางวัน / กลางคืนในโพสต์ รองรับ ค.ศ. 1900–2100' }}</p></template>
          <fieldset class="group-picker"><legend>{{ groupBy === 'zodiac' && !isColors ? 'เลือกราศี' : 'เลือกวันเกิด' }}</legend><button type="button" class="select-all" @click="toggleAllGroups">{{ selectedGroups.length === groups.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด' }}</button><div class="group-checks"><label v-for="item in groups" :key="item.id" :class="['check', 'group-check', { selected: groupIds.includes(item.id) }]"><input v-model="groupIds" type="checkbox" :value="item.id" />{{ item.shortName || item.name }}</label></div><p class="note">เลือกแล้ว {{ selectedGroups.length }} กลุ่ม · รวมในโพสต์เดียว</p></fieldset>
          <template v-if="isColors || isRanking || isCalendar"><label for="prediction-focus">เรื่องที่เน้น</label><select id="prediction-focus" v-model="focus"><option>การงาน</option><option>การเงิน</option><option>ความรัก</option><option v-if="isColors">โชคลาภ</option><option v-if="isCalendar">สุขภาวะ</option></select></template>
        </template>
        <fieldset v-if="!isColors && !isRanking && !isCalendar"><legend>หัวข้อในโพสต์</legend><label v-for="topic in isChild ? childTopics : adultTopics" :key="topic" class="check"><input v-model="topics" type="checkbox" :value="topic" />{{ topic }}</label></fieldset>
        </fieldset>
        <template v-if="supportsGeneration"><button class="generate-btn" :disabled="!canGenerate" @click="generatePost">{{ isGenerating ? 'กำลังสร้างโพสต์…' : 'สร้างโพสต์' }}</button><p class="note">{{ isChild ? 'ได้โพสต์ตามวันเกิดกับหัวข้อที่เลือก' : 'ได้โพสต์ครบทุกกลุ่มและหัวข้อที่เลือก' }}</p></template>
      </aside>
      <section class="preview" aria-label="ตัวอย่างโครงโพสต์" aria-live="polite">
        <p v-if="generationError && supportsGeneration" class="error" role="alert">{{ generationError }}</p><p v-if="storageError && supportsGeneration" class="error" role="alert">{{ storageMessage }}</p>
        <template v-if="supportsGeneration && (output || isGenerating)">
          <h2 class="post-title">{{ displayedPost.title }}</h2>
          <div class="post-output" :aria-busy="isGenerating" aria-live="off">{{ displayedPost.body }}<span v-if="isGenerating"> ▍</span></div>
          <button v-if="displayedPost.text" class="action-btn" :disabled="isGenerating" @click="copyOutput">{{ copied === 'post' ? 'คัดลอกแล้ว' : 'คัดลอกโพสต์' }}</button>
        </template>
        <template v-else>
        <span class="badge">ตัวอย่างโครงโพสต์</span><h3>{{ title }}</h3><p>{{ range?.label || 'รอเลือกวันที่' }}</p>
        <p class="notice">{{ isChild ? 'เลือกวันเกิดเด็กและหัวข้อ แล้วกดสร้างโพสต์ได้เลย' : isForecast ? 'เลือกวันเกิดหรือราศี ช่วงเวลา และหัวข้อ แล้วกดสร้างโพสต์' : 'ตอนนี้ลองจัดรูปแบบได้ ยังไม่มีคำทำนายจริง เราจะกำหนดหลักการทำนายในขั้นต่อไป' }}</p>
        <template v-if="range">
          <template v-if="isChild"><h4>{{ gender === 'boy' ? 'เด็กผู้ชาย' : gender === 'girl' ? 'เด็กผู้หญิง' : 'เด็ก' }}เกิดวันที่ {{ range.label }}</h4><p>เลขวันเกิด {{ childFacts.birthNumber }} · เส้นทางชีวิต {{ childFacts.lifePath }}</p><p class="note">ใช้ศาสตร์เท่าที่ข้อมูลครบ วันเกิดอิงเวลาไทย เพศมีผลต่อเลขกัวและทิศส่งเสริม หากเป็นวันย้ายราศีหรือวันลี่ชุนจะเว้นส่วนที่ต้องใช้เวลาเกิด</p><div v-for="topic in topics" :key="topic" class="outline"><strong>{{ topic }}</strong><span>{{ topic === 'ทิศส่งเสริม' && childKua?.status !== 'available' ? 'เว้นหัวข้อนี้ เพราะข้อมูลยังไม่พอ' : 'คำอ่านและคำแนะนำสั้นจากข้อมูลที่ใช้ได้' }}</span></div><p v-if="!topics.length" class="note">เลือกอย่างน้อยหนึ่งหัวข้อเพื่อดูโครงโพสต์</p></template>
          <template v-else-if="isRanking"><h4>จัดอันดับ{{ focus }}เด่น · {{ groupBy === 'weekday' ? 'ตามวันเกิด' : 'ตามราศี' }}</h4><div v-for="rank in 3" :key="rank" class="outline"><strong>อันดับ {{ rank }}</strong><span>กลุ่มที่เด่น · เรื่องที่น่าจับตา · คำแนะนำ</span></div><p class="note">ยังไม่จัดอันดับกลุ่มจริงจนกว่าจะกำหนดเกณฑ์</p></template>
          <template v-else><p v-if="!selectedGroups.length" class="note">เลือกอย่างน้อยหนึ่งกลุ่มเพื่อดูโครงโพสต์</p><article v-for="group in previewGroups" :key="group.id" class="group-outline"><h4>{{ group.name }}</h4>
            <template v-if="isColors"><div v-for="topic in ['โชคลาภ', 'การงาน', 'การเงิน', 'ความรัก']" :key="topic" class="outline"><strong>สีเสริม{{ topic }}{{ topic === focus ? ' · เรื่องที่เน้น' : '' }}</strong><span>พื้นที่สำหรับสีและคำอธิบายสั้น ๆ</span></div><div class="outline"><strong>สีที่ควรเลี่ยง</strong><span>พื้นที่สำหรับสีและคำอธิบายสั้น ๆ</span></div></template>
            <template v-else-if="isCalendar"><div v-for="day in dailyDates" :key="day.id" class="outline"><strong>{{ day.label }}</strong><span>{{ focus }}: เรื่องเด่น / ควรระวัง</span></div></template>
            <template v-else><div v-if="formatId === 'good-news' || formatId === 'relief'" class="outline"><strong>{{ formatId === 'good-news' ? 'ข่าวดีที่น่าจับตา' : 'เรื่องที่เริ่มคลี่คลาย' }}</strong><span>พื้นที่สำหรับประเด็นหลักและคำแนะนำ</span></div><div v-for="topic in topics" :key="topic" class="outline"><strong>{{ topic }}</strong><span>คำทำนายสั้น ๆ · คำแนะนำที่นำไปใช้ได้</span></div><p v-if="!topics.length" class="note">เลือกหัวข้อที่จะใส่ในโพสต์</p>
            </template>
          </article></template>
        </template>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.planner { max-width: 1400px; margin: auto; padding: 32px 24px; font-family: inherit; }
.post-title { margin: 0; font-size: clamp(22px, 2.5vw, 30px); line-height: 1.5; color: #322344; overflow-wrap: anywhere; }
.group-picker { min-width: 0; }.group-checks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }.group-check { border: 1px solid #e8ddf5; border-radius: 8px; padding: 9px; font-size: 12px; cursor: pointer; }.group-check.selected { background: #f3e8ff; border-color: #a78bfa; }.select-all { border: 0; background: transparent; color: #7c3aed; font: inherit; font-size: 12px; cursor: pointer; padding: 4px 0; }.select-all:focus-visible { outline: 2px solid #7c3aed; outline-offset: 3px; }
.intro span { color: #7c3aed; font-size: 13px; font-weight: 600; }.intro h2 { margin: 10px 0; }.intro p, .note { color: #71627f; line-height: 1.7; font-size: 13px; }
.format-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }.format-card { display: flex; flex-direction: column; text-align: left; gap: 8px; padding: 18px; border: 1px solid #ddd0ed; border-radius: 12px; background: white; color: #322344; font: inherit; cursor: pointer; }.format-card span { font-size: 24px; }.format-card small { color: #71627f; line-height: 1.6; }.format-card.active { border-color: #7c3aed; background: #f3e8ff; }.format-card:hover { border-color: #7c3aed; }.format-card:focus-visible { outline: 3px solid #a78bfa; outline-offset: 3px; }
.workspace { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 24px; align-items: start; }.settings, .preview { padding: 24px; background: white; border: 1px solid #e8ddf5; border-radius: 14px; }.settings { display: flex; flex-direction: column; gap: 10px; }.settings h3 { margin: 0 0 12px; }.settings label, legend { font-size: 13px; font-weight: 600; }.settings select, .settings input:not([type=checkbox]) { width: 100%; min-width: 0; padding: 10px; border: 1px solid #ddd0ed; border-radius: 8px; background: white; color: #322344; font: inherit; font-size: 13px; }.settings input:focus-visible, .settings select:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }fieldset { margin: 8px 0; padding: 14px; border: 1px solid #e8ddf5; border-radius: 8px; }.check { display: flex; gap: 8px; align-items: center; padding: 6px 0; font-weight: 400 !important; }.check input { accent-color: #7c3aed; }
.badge { color: #6d28d9; background: #f3e8ff; padding: 6px 10px; border-radius: 20px; font-size: 12px; }.preview h3 { margin-top: 20px; }.preview h4 { margin: 20px 0 12px; }.preview h5 { font-size: 13px; }.notice { background: #faf7ff; border-left: 3px solid #a78bfa; padding: 12px; color: #71627f; font-size: 13px; line-height: 1.8; }.group-outline { border-top: 1px solid #e8ddf5; margin-top: 20px; }.outline { display: flex; flex-direction: column; gap: 5px; padding: 10px 0; font-size: 13px; line-height: 1.7; }.outline span { color: #9b86ad; }.closing { border-top: 1px solid #e8ddf5; padding-top: 16px; font-size: 13px; color: #71627f; line-height: 1.8; }
.birth-facts { background: #faf7ff; border: 1px solid #e8ddf5; border-radius: 10px; padding: 14px; font-size: 13px; }.birth-facts dl { display: grid; grid-template-columns: 1fr; gap: 5px; margin-bottom: 0; }.birth-facts dt { color: #71627f; margin-top: 6px; }.birth-facts dd { margin: 0; font-weight: 600; }
.settings select { appearance: none; padding-right: 38px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371627f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; }
@media (forced-colors: active) { .settings select { appearance: auto; background-image: none; } }
.form-fields { display: flex; flex-direction: column; gap: 10px; border: 0; padding: 0; margin: 0; min-width: 0; }.generate-btn, .action-btn { padding: 12px 16px; border: 0; border-radius: 8px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }.generate-btn { background: #7c3aed; color: white; }.action-btn { background: #f3e8ff; color: #6d28d9; margin: 12px 0; }.generate-btn:disabled, .action-btn:disabled, .format-card:disabled { opacity: .6; cursor: default; }.post-output { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.85; font-size: 14px; margin-top: 20px; }.error { background: #fef2f2; color: #b91c1c; padding: 12px; border-radius: 8px; font-size: 13px; overflow-wrap: anywhere; }.edit-output { margin-top: 20px; }.edit-output summary { cursor: pointer; font-size: 13px; }.edit-output label { display: block; margin: 10px 0; }.edit-output textarea { width: 100%; border: 1px solid #ddd0ed; border-radius: 8px; padding: 12px; font: inherit; font-size: 13px; line-height: 1.8; resize: vertical; }
@media(max-width: 1000px) { .format-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.workspace { grid-template-columns: 300px minmax(0, 1fr); } }@media(max-width: 700px) { .planner { padding: 24px 16px; }.workspace { grid-template-columns: 1fr; }.settings, .preview { padding: 18px; }.format-card { padding: 14px; } }
</style>
