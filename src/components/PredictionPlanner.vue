<script setup>
import { computed, ref } from 'vue'
import { zodiacSigns } from '@/data/astrology'

const formats = [
  { id: 'forecast', icon: '🔮', label: 'ดวงตามช่วงเวลา', description: 'รายวัน รายสัปดาห์ รายเดือน' },
  { id: 'child', icon: '👶', label: 'เด็กเกิดวันนี้', description: 'จุดเด่นและแนวทางส่งเสริม' },
  { id: 'colors', icon: '🎨', label: 'สีมงคล', description: 'สีตามวันเกิดและเรื่องที่เน้น' },
  { id: 'calendar', icon: '🗓️', label: 'ปฏิทินดวง', description: 'รัก งาน เงิน และสุขภาวะ' },
  { id: 'ranking', icon: '🏆', label: 'จัดอันดับดวงเด่น', description: 'เงินพุ่ง รักเด่น งานปัง' },
  { id: 'good-news', icon: '✨', label: 'ข่าวดีที่กำลังมา', description: 'เรื่องน่าจับตาในช่วงที่เลือก' },
  { id: 'relief', icon: '🌤️', label: 'จังหวะคลี่คลาย — พ้นเคราะห์', description: 'เรื่องที่เบาลงและโอกาสตั้งหลัก' },
]
const weekdays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
const adultTopics = ['การงาน', 'การเรียน', 'การเงิน', 'สุขภาวะ', 'คนโสด', 'คนมีคู่', 'สถานะยังไม่ชัดเจน', 'เรื่องควรระวัง']
const childTopics = ['นิสัยโดยรวม', 'จุดเด่น', 'การเรียนรู้', 'ความสัมพันธ์กับครอบครัวและเพื่อน', 'สุขภาวะ', 'สิ่งที่ควรส่งเสริม', 'แนวอาชีพเมื่อโตขึ้น', 'เรื่องควรใส่ใจ']
const formatId = ref('forecast')
const period = ref('weekly')
const date = ref(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
const groupBy = ref('weekday')
const scope = ref('all')
const groupId = ref('0')
const groupIds = ref([])
const focus = ref('การงาน')
const gender = ref('boy')
const childZodiac = ref('')
const childYear = ref('')
const includeDaily = ref(true)
const topics = ref([...adultTopics])
const format = computed(() => formats.find(item => item.id === formatId.value))
const isChild = computed(() => formatId.value === 'child')
const isColors = computed(() => formatId.value === 'colors')
const isCalendar = computed(() => formatId.value === 'calendar')
const isRanking = computed(() => formatId.value === 'ranking')
const effectivePeriod = computed(() => isChild.value ? 'daily' : isCalendar.value ? 'monthly' : isColors.value ? 'weekly' : period.value)
const groups = computed(() => groupBy.value === 'weekday' || isColors.value
  ? weekdays.map((name, index) => ({ id: String(index), name: `คนเกิดวัน${name}` })) : zodiacSigns)
const selectedGroups = computed(() => scope.value === 'all' || isRanking.value ? groups.value : groups.value.filter(item => scope.value === 'multiple' ? groupIds.value.includes(item.id) : item.id === groupId.value))
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
function reduceNumber(number) { while (number > 9) number = [...String(number)].reduce((sum, digit) => sum + Number(digit), 0); return number }
const childFacts = computed(() => parsedDate.value ? {
  weekday: weekdays[(parsedDate.value.getUTCDay() + 6) % 7],
  birthNumber: reduceNumber(parsedDate.value.getUTCDate()),
  lifePath: reduceNumber([...date.value.replaceAll('-', '')].reduce((sum, digit) => sum + Number(digit), 0)),
} : null)
function changeFormat(id) {
  formatId.value = id
  topics.value = [...(id === 'child' ? childTopics : adultTopics)]
  focus.value = 'การงาน'
  if (id === 'colors') groupBy.value = 'weekday'
  changeGrouping()
}
function changeGrouping() {
  groupId.value = groups.value[0].id
  groupIds.value = groupIds.value.filter(id => groups.value.some(item => item.id === id))
}
const title = computed(() => `${format.value.label}${isRanking.value || isCalendar.value ? ` · ${focus.value}` : ''}`)
</script>

<template>
  <div class="planner">
    <div class="intro"><span>โพสต์ดูดวง</span><h2>เลือกแนวโพสต์ที่อยากทำ</h2><p>คำทำนายอยู่ครบในโพสต์ อ่านจบได้เลย ไม่ต้องรอแอดมินตอบ</p></div>
    <div class="format-grid" aria-label="รูปแบบโพสต์ดูดวง">
      <button v-for="item in formats" :key="item.id" :class="['format-card', { active: formatId === item.id }]" :aria-pressed="formatId === item.id" @click="changeFormat(item.id)"><span aria-hidden="true">{{ item.icon }}</span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></button>
    </div>
    <div class="workspace">
      <aside class="settings" aria-label="ตั้งค่ารูปแบบโพสต์ดูดวง">
        <h3>{{ format.icon }} {{ format.label }}</h3>
        <template v-if="!isChild && !isColors && !isCalendar"><label for="prediction-period">ช่วงเวลา</label><select id="prediction-period" v-model="period"><option value="daily">รายวัน</option><option value="weekly">รายสัปดาห์</option><option value="monthly">รายเดือน</option></select></template>
        <label for="prediction-date">{{ isChild ? 'วันเดือนปีเกิด' : isCalendar ? 'เลือกวันที่ในเดือนที่ต้องการ' : 'วันที่อ้างอิง' }} (ค.ศ.)</label><input id="prediction-date" v-model="date" type="date" />
        <p class="note">{{ range ? range.label : 'กรุณาเลือกวันที่ให้ครบ' }}</p>
        <template v-if="isChild">
          <label for="child-gender">เด็กเพศอะไร</label><select id="child-gender" v-model="gender"><option value="boy">เด็กผู้ชาย</option><option value="girl">เด็กผู้หญิง</option><option value="unspecified">ไม่ระบุ</option></select>
          <label for="child-zodiac">ราศี (ถ้าทราบ)</label><select id="child-zodiac" v-model="childZodiac"><option value="">ยังไม่ระบุ</option><option v-for="sign in zodiacSigns" :key="sign.id" :value="sign.name">{{ sign.name }}</option></select>
          <label for="child-year">ปีนักษัตร / ธาตุปี (ถ้าทราบ)</label><input id="child-year" v-model="childYear" placeholder="เช่น ปีม้าไฟ" maxlength="80" />
          <p class="note">ราศีและปีนักษัตรรอกำหนดเกณฑ์ปฏิทินก่อนคำนวณอัตโนมัติ</p>
        </template>
        <template v-else>
          <template v-if="!isColors"><label for="prediction-group">แบ่งกลุ่มตาม</label><select id="prediction-group" v-model="groupBy" @change="changeGrouping"><option value="weekday">วันเกิด จันทร์–อาทิตย์</option><option value="zodiac">ราศี</option></select></template>
          <template v-if="!isRanking"><label for="prediction-scope">ขอบเขตโพสต์</label><select id="prediction-scope" v-model="scope"><option value="all">รวมทุกกลุ่มแบบกระชับ</option><option value="single">เจาะกลุ่มเดียว</option><option value="multiple">เลือกหลายกลุ่ม</option></select>
            <template v-if="scope === 'single'"><label for="prediction-target">เลือกกลุ่ม</label><select id="prediction-target" v-model="groupId"><option v-for="item in groups" :key="item.id" :value="item.id">{{ item.name }}</option></select></template>
            <fieldset v-if="scope === 'multiple'"><legend>{{ groupBy === 'zodiac' && !isColors ? 'เลือกราศีที่จะรวมในโพสต์' : 'เลือกวันเกิดที่จะรวมในโพสต์' }}</legend><label v-for="item in groups" :key="item.id" class="check"><input v-model="groupIds" type="checkbox" :value="item.id" />{{ item.name }}</label><p class="note">เลือกแล้ว {{ selectedGroups.length }} กลุ่ม · รวมในโพสต์เดียว</p></fieldset>
          </template>
          <template v-if="isColors || isRanking || isCalendar"><label for="prediction-focus">เรื่องที่เน้น</label><select id="prediction-focus" v-model="focus"><option>การงาน</option><option>การเงิน</option><option>ความรัก</option><option v-if="isColors">โชคลาภ</option><option v-if="isCalendar">สุขภาวะ</option></select></template>
        </template>
        <fieldset v-if="!isColors && !isRanking && !isCalendar"><legend>หัวข้อในโพสต์</legend><label v-for="topic in isChild ? childTopics : adultTopics" :key="topic" class="check"><input v-model="topics" type="checkbox" :value="topic" />{{ topic }}</label></fieldset>
        <label v-if="formatId === 'forecast' && effectivePeriod === 'weekly'" class="check"><input v-model="includeDaily" type="checkbox" />เพิ่มสรุปจันทร์–อาทิตย์: เรื่องเด่น / ควรระวัง</label>
      </aside>
      <section class="preview" aria-label="ตัวอย่างโครงโพสต์" aria-live="polite">
        <span class="badge">ตัวอย่างโครงโพสต์</span><h3>{{ title }}</h3><p>{{ range?.label || 'รอเลือกวันที่' }}</p>
        <p class="notice">ตอนนี้ลองจัดรูปแบบได้ ยังไม่มีคำทำนายจริง เราจะกำหนดหลักการทำนายในขั้นต่อไป</p>
        <template v-if="range">
          <template v-if="isChild"><h4>{{ gender === 'boy' ? 'เด็กผู้ชาย' : gender === 'girl' ? 'เด็กผู้หญิง' : 'เด็ก' }}เกิดวันนี้</h4><p>วัน{{ childFacts.weekday }} · เลขวันเกิด {{ childFacts.birthNumber }} · เส้นทางชีวิต {{ childFacts.lifePath }}{{ childZodiac ? ` · ${childZodiac}` : '' }}{{ childYear ? ` · ${childYear}` : '' }}</p><p class="note">เลขตัวอย่างใช้ผลรวมลดเหลือหลักเดียวและปี ค.ศ. ยังไม่ใช้ข้อยกเว้น Master Numbers</p><div v-for="topic in topics" :key="topic" class="outline"><strong>{{ topic }}</strong><span>พื้นที่สำหรับคำอธิบายและแนวทางส่งเสริม</span></div><p v-if="!topics.length" class="note">เลือกอย่างน้อยหนึ่งหัวข้อเพื่อดูโครงโพสต์</p></template>
          <template v-else-if="isRanking"><h4>จัดอันดับ{{ focus }}เด่น · {{ groupBy === 'weekday' ? 'ตามวันเกิด' : 'ตามราศี' }}</h4><div v-for="rank in 3" :key="rank" class="outline"><strong>อันดับ {{ rank }}</strong><span>กลุ่มที่เด่น · เรื่องที่น่าจับตา · คำแนะนำ</span></div><p class="note">ยังไม่จัดอันดับกลุ่มจริงจนกว่าจะกำหนดเกณฑ์</p></template>
          <template v-else><p v-if="!selectedGroups.length" class="note">เลือกอย่างน้อยหนึ่งกลุ่มเพื่อดูโครงโพสต์</p><article v-for="group in selectedGroups" :key="group.id" class="group-outline"><h4>{{ group.name }}</h4>
            <template v-if="isColors"><div v-for="topic in ['โชคลาภ', 'การงาน', 'การเงิน', 'ความรัก']" :key="topic" class="outline"><strong>สีเสริม{{ topic }}{{ topic === focus ? ' · เรื่องที่เน้น' : '' }}</strong><span>พื้นที่สำหรับสีและคำอธิบายสั้น ๆ</span></div><div class="outline"><strong>สีที่ควรเลี่ยง</strong><span>พื้นที่สำหรับสีและคำอธิบายสั้น ๆ</span></div></template>
            <template v-else-if="isCalendar"><div v-for="day in dailyDates" :key="day.id" class="outline"><strong>{{ day.label }}</strong><span>{{ focus }}: เรื่องเด่น / ควรระวัง</span></div></template>
            <template v-else><div v-if="formatId === 'good-news' || formatId === 'relief'" class="outline"><strong>{{ formatId === 'good-news' ? 'ข่าวดีที่น่าจับตา' : 'เรื่องที่เริ่มคลี่คลาย' }}</strong><span>พื้นที่สำหรับประเด็นหลักและคำแนะนำ</span></div><div v-for="topic in topics" :key="topic" class="outline"><strong>{{ topic }}</strong><span>คำทำนายสั้น ๆ · คำแนะนำที่นำไปใช้ได้</span></div><p v-if="!topics.length" class="note">เลือกหัวข้อที่จะใส่ในโพสต์</p>
              <template v-if="formatId === 'forecast' && effectivePeriod === 'weekly' && includeDaily"><h5>สรุปแต่ละวัน</h5><div v-for="day in dailyDates" :key="day.id" class="outline"><strong>{{ day.label }}</strong><span>เด่น: … / ระวัง: …</span></div></template>
            </template>
          </article></template>
          <p class="closing">ท้ายโพสต์: ชวนบันทึก แชร์ หรือติดตาม พร้อมข้อความสรุปสำหรับภาพ</p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.planner { max-width: 1400px; margin: auto; padding: 32px 24px; font-family: inherit; }
.intro span { color: #7c3aed; font-size: 13px; font-weight: 600; }.intro h2 { margin: 10px 0; }.intro p, .note { color: #71627f; line-height: 1.7; font-size: 13px; }
.format-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }.format-card { display: flex; flex-direction: column; text-align: left; gap: 8px; padding: 18px; border: 1px solid #ddd0ed; border-radius: 12px; background: white; color: #322344; font: inherit; cursor: pointer; }.format-card span { font-size: 24px; }.format-card small { color: #71627f; line-height: 1.6; }.format-card.active { border-color: #7c3aed; background: #f3e8ff; }.format-card:hover { border-color: #7c3aed; }.format-card:focus-visible { outline: 3px solid #a78bfa; outline-offset: 3px; }
.workspace { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 24px; align-items: start; }.settings, .preview { padding: 24px; background: white; border: 1px solid #e8ddf5; border-radius: 14px; }.settings { display: flex; flex-direction: column; gap: 10px; }.settings h3 { margin: 0 0 12px; }.settings label, legend { font-size: 13px; font-weight: 600; }.settings select, .settings input:not([type=checkbox]) { width: 100%; min-width: 0; padding: 10px; border: 1px solid #ddd0ed; border-radius: 8px; background: white; color: #322344; font: inherit; font-size: 13px; }.settings input:focus-visible, .settings select:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }fieldset { margin: 8px 0; padding: 14px; border: 1px solid #e8ddf5; border-radius: 8px; }.check { display: flex; gap: 8px; align-items: center; padding: 6px 0; font-weight: 400 !important; }.check input { accent-color: #7c3aed; }
.badge { color: #6d28d9; background: #f3e8ff; padding: 6px 10px; border-radius: 20px; font-size: 12px; }.preview h3 { margin-top: 20px; }.preview h4 { margin: 20px 0 12px; }.preview h5 { font-size: 13px; }.notice { background: #faf7ff; border-left: 3px solid #a78bfa; padding: 12px; color: #71627f; font-size: 13px; line-height: 1.8; }.group-outline { border-top: 1px solid #e8ddf5; margin-top: 20px; }.outline { display: flex; flex-direction: column; gap: 5px; padding: 10px 0; font-size: 13px; line-height: 1.7; }.outline span { color: #9b86ad; }.closing { border-top: 1px solid #e8ddf5; padding-top: 16px; font-size: 13px; color: #71627f; line-height: 1.8; }
@media(max-width: 1000px) { .format-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.workspace { grid-template-columns: 300px minmax(0, 1fr); } }@media(max-width: 700px) { .planner { padding: 24px 16px; }.workspace { grid-template-columns: 1fr; }.settings, .preview { padding: 18px; }.format-card { padding: 14px; } }
</style>
