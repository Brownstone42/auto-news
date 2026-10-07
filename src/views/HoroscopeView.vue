<script setup>
import { computed, ref } from 'vue'
import { tarotCards, tarotCategories, validateTarotSelection } from '@/data/tarot'
import { astrologyCategories, astrologyTraditions, getAstrologyEntities, validateAstrologySelection } from '@/data/astrology'
import { numerologyTraditions, getNumerologyCategories, getNumerologyEntities, validateNumerologySelection } from '@/data/numerology'
import { baziCategories, getBaziEntities, validateBaziSelection } from '@/data/bazi'
import { generateHoroscopePost } from '@/services/horoscope'

const scienceId = ref('')
const sciences = [
  { id: 'tarot', icon: '🃏', label: 'ไพ่ทาโรต์', description: 'ความหมายไพ่ ตำแหน่ง และพื้นฐานการอ่าน', ready: true },
  { id: 'astrology', icon: '🌙', label: 'โหราศาสตร์', description: 'ราศี ลัคนา ดาว และเรือนชะตา', ready: true },
  { id: 'numerology', icon: '🔢', label: 'เลขศาสตร์', description: 'ตัวเลข คู่เลข วันเกิด ชื่อ และพื้นฐาน', ready: true },
  { id: 'bazi', icon: '☯', label: 'ปาจื้อ', description: 'ธาตุ Day Master เสาชะตา และสิบเทพ', ready: true },
]
const categoryId = ref('card')
const cardId = ref('major-0')
const secondCardId = ref('major-1')
const angleId = ref('meaning')
const tradition = ref('thai')
const entityId = ref('sign-1')
const reference = ref('')
const output = ref('')
const isGenerating = ref(false)
const error = ref('')
const storageMessage = ref('')
const copied = ref('')
const showHistory = ref(false)
const currentId = ref(null)
const currentSelection = ref(null)
const history = ref([])
const STORAGE_KEY = 'auto-news.horoscope.posts.v1'
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  if (!Array.isArray(stored)) throw new Error('Invalid history')
  history.value = stored.filter((post) => post && typeof post.id === 'string' && typeof post.output === 'string' && post.selection && validSelection(post.selection, true)).slice(0, 50)
} catch {
  storageMessage.value = 'เปิดประวัติในเบราว์เซอร์ไม่ได้ ยังสร้างและคัดลอกโพสต์ได้'
}
const isAstrology = computed(() => scienceId.value === 'astrology')
const isNumerology = computed(() => scienceId.value === 'numerology')
const isBazi = computed(() => scienceId.value === 'bazi')
const scienceIcon = computed(() => sciences.find((item) => item.id === scienceId.value)?.icon)
const traditions = computed(() => isNumerology.value ? numerologyTraditions : astrologyTraditions)
const scienceLabel = computed(() => sciences.find((item) => item.id === scienceId.value)?.label || 'เรื่องดวง')
const availableCategories = computed(() => (isBazi.value ? baziCategories : isNumerology.value ? getNumerologyCategories(tradition.value) : isAstrology.value ? astrologyCategories : tarotCategories).filter((item) => item.available !== false))
const category = computed(() => availableCategories.value.find((item) => item.id === categoryId.value) || availableCategories.value[0])
const angle = computed(() => category.value?.angles.find((item) => item.id === angleId.value))
const card = computed(() => tarotCards.find((item) => item.id === cardId.value))
const secondCard = computed(() => tarotCards.find((item) => item.id === secondCardId.value))
const entities = computed(() => isBazi.value ? getBaziEntities(category.value) : isNumerology.value ? getNumerologyEntities(category.value, tradition.value) : getAstrologyEntities(category.value, tradition.value))
const entity = computed(() => entities.value.find((item) => item.id === entityId.value))
const selection = computed(() => isBazi.value
  ? { science: 'bazi', category: category.value, angle: angle.value, entity: entity.value, reference: reference.value }
  : isAstrology.value || isNumerology.value
  ? { science: scienceId.value, tradition: tradition.value, category: category.value, angle: angle.value, entity: entity.value, reference: reference.value }
  : { science: 'tarot', category: category.value, angle: angle.value, card: card.value, secondCard: secondCard.value, reference: reference.value })
const displayedSelection = computed(() => output.value && currentSelection.value ? currentSelection.value : selection.value)
const canGenerate = computed(() => ['tarot', 'astrology', 'numerology', 'bazi'].includes(scienceId.value) && category.value?.available !== false && validSelection(selection.value) && !isGenerating.value)
const parts = computed(() => {
  const marker = '[ข้อความบนภาพ]'
  const index = output.value.indexOf(marker)
  const post = (index < 0 ? output.value : output.value.slice(0, index)).replace(/^\s*\[โพสต์\]\s*/, '').trim()
  return { post, image: index < 0 ? '' : output.value.slice(index + marker.length).trim() }
})
function selectCategory(id) {
  categoryId.value = id
  angleId.value = availableCategories.value.find((item) => item.id === id).angles[0].id
  entityId.value = entities.value[0]?.id || ''
}
function validSelection(value, allowLegacyPairs = false) {
  if (value.science === 'bazi') return validateBaziSelection(value)
  if (value.science === 'numerology') return validateNumerologySelection(value, { allowLegacyPairs })
  if (value.science === 'astrology') return validateAstrologySelection(value)
  return (!value.science || value.science === 'tarot') && validateTarotSelection(value)
}
function selectScience(id) {
  scienceId.value = id
  tradition.value = 'thai'
  selectCategory(availableCategories.value[0].id)
  output.value = ''
  reference.value = ''
  currentId.value = null
  currentSelection.value = null
  error.value = ''
  storageMessage.value = ''
}
function changeTradition() {
  if (!availableCategories.value.some((item) => item.id === categoryId.value)) {
    selectCategory(availableCategories.value[0].id)
    return
  }
  entityId.value = entities.value[0]?.id || ''
}
function saveDraft() {
  if (!output.value.trim() || !currentSelection.value) return
  const id = currentId.value || crypto.randomUUID()
  const existing = history.value.find((item) => item.id === id)
  const entry = { id, output: output.value, selection: currentSelection.value, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
  const next = [entry, ...history.value.filter((item) => item.id !== id)].slice(0, 50)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    history.value = next
    currentId.value = id
    storageMessage.value = 'บันทึกในเบราว์เซอร์นี้แล้ว'
  } catch {
    storageMessage.value = 'บันทึกไม่สำเร็จ กรุณาคัดลอกข้อความเก็บไว้ก่อนปิดหน้านี้'
  }
}
async function generate() {
  if (!canGenerate.value) return
  const snapshot = JSON.parse(JSON.stringify(selection.value))
  output.value = ''
  error.value = ''
  storageMessage.value = ''
  currentId.value = null
  currentSelection.value = snapshot
  isGenerating.value = true
  try {
    await generateHoroscopePost(snapshot, (text) => { output.value += text })
    if (!output.value.trim()) throw new Error('ยังไม่ได้รับข้อความจากระบบ กรุณาลองอีกครั้ง')
    saveDraft()
  } catch (err) {
    error.value = err.message || 'สร้างโพสต์ไม่สำเร็จ กรุณาลองอีกครั้ง'
  } finally {
    isGenerating.value = false
  }
}
async function copyPart(part) {
  try {
    await navigator.clipboard.writeText(parts.value[part])
    copied.value = part
    setTimeout(() => { copied.value = '' }, 2000)
  } catch { error.value = 'คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความแล้วคัดลอก' }
}
function openDraft(post) {
  scienceId.value = post.selection.science || 'tarot'
  tradition.value = post.selection.tradition || 'thai'
  currentId.value = post.id
  currentSelection.value = post.selection
  output.value = post.output
  const activeCategory = availableCategories.value.find((item) => item.id === post.selection.category.id) || availableCategories.value[0]
  categoryId.value = activeCategory.id
  angleId.value = activeCategory.angles.some((item) => item.id === post.selection.angle.id) ? post.selection.angle.id : activeCategory.angles[0].id
  cardId.value = post.selection.card?.id || 'major-0'
  secondCardId.value = post.selection.secondCard?.id || 'major-1'
  entityId.value = post.selection.entity?.id || entities.value[0]?.id || ''
  if (scienceId.value === 'numerology' && category.value.id === 'number-pairs' && /^pair-\d{2}$/.test(entityId.value)) {
    entityId.value = `pair-range-${Math.floor(Number(entityId.value.slice(5)) / 10)}`
  }
  reference.value = post.selection.reference || ''
  showHistory.value = false
  error.value = ''
  storageMessage.value = ''
}
function draftTitle(post) {
  return [selectionLabel(post.selection), post.selection.category.label, post.selection.entity?.name, post.selection.category.needsCard && post.selection.card?.name, post.selection.category.needsSecondCard && post.selection.secondCard?.name, post.selection.angle.label].filter(Boolean).join(' · ')
}
function selectionLabel(value) {
  if (value.science === 'bazi') return 'ปาจื้อ'
  if (value.science === 'numerology') return numerologyTraditions.find((item) => item.id === value.tradition)?.label || 'เลขศาสตร์'
  return value.science === 'astrology' ? `โหราศาสตร์${value.tradition === 'western' ? 'ตะวันตก' : 'ไทย'}` : 'ไพ่ทาโรต์'
}
function formatDate(date) { return new Date(date).toLocaleString('th-TH') }
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo" aria-hidden="true">✦</div>
          <div>
            <h1 class="brand-name">ดวง Content Generator</h1>
            <p class="brand-sub">{{ scienceId ? `${scienceLabel} · โพสต์เดียวอ่านจบ พร้อมนำไปปรับใช้` : 'เลือกศาสตร์ แล้วสร้างคอนเทนต์ให้ความรู้เรื่องดวง' }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="scienceId && !showHistory" class="nav-btn" :disabled="isGenerating" @click="scienceId = ''">‹ เลือกศาสตร์</button>
          <button class="nav-btn" :disabled="isGenerating" @click="showHistory = !showHistory">{{ showHistory ? '✦ สร้างโพสต์' : '📋 ประวัติโพสต์ดวง' }}</button>
        </div>
      </div>
    </header>
    <main v-if="showHistory" class="tarot-history">
      <h2>ประวัติโพสต์ดวง</h2>
      <p class="history-note">เก็บเฉพาะในเบราว์เซอร์นี้ สูงสุด 50 โพสต์ ยังไม่ซิงก์ข้ามเครื่อง</p>
      <p v-if="!history.length">ยังไม่มีโพสต์ เริ่มสร้างโพสต์แรกจากเมนูได้เลย</p>
      <button v-for="post in history" :key="post.id" class="draft-item" @click="openDraft(post)">
        <strong>{{ draftTitle(post) }}</strong>
        <time>{{ formatDate(post.updatedAt) }}</time>
        <span>{{ post.output.replace('[โพสต์]', '').slice(0, 140) }}…</span>
      </button>
    </main>
    <main v-else-if="!scienceId" class="science-home">
      <div class="science-intro">
        <span class="science-eyebrow">ความรู้เรื่องดวง</span>
        <h2>เลือกศาสตร์ที่อยากเล่า</h2>
        <p>แต่ละศาสตร์มีหมวดความรู้และหัวข้อของตัวเอง เลือกหมวดเพื่อเริ่มสร้างโพสต์</p>
      </div>
      <div class="science-grid" aria-label="หมวดศาสตร์">
        <button v-for="science in sciences" :key="science.id" class="science-card" :disabled="!science.ready" @click="selectScience(science.id)">
          <span class="science-icon" aria-hidden="true">{{ science.icon }}</span>
          <strong>{{ science.label }}</strong>
          <span class="science-description">{{ science.description }}</span>
          <span class="science-status">{{ science.ready ? 'เลือกหัวข้อ →' : 'เร็ว ๆ นี้' }}</span>
        </button>
      </div>
    </main>
    <main v-else class="main">
      <aside class="panel-left" aria-label="ตั้งค่าคอนเทนต์เรื่องดวง">
        <div class="product-card"><span class="product-name-text">{{ scienceIcon }} หมวด{{ scienceLabel }}</span><span class="sales-text">ความรู้เรื่องดวง › {{ scienceLabel }}</span></div>
        <fieldset class="tarot-controls" :disabled="isGenerating">
          <section v-if="isAstrology || isNumerology" class="panel-section">
            <label :for="`${scienceId}-tradition`" class="section-title">แนว{{ scienceLabel }}</label>
            <select :id="`${scienceId}-tradition`" v-model="tradition" class="product-select" @change="changeTradition">
              <option v-for="item in traditions" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
            <p class="field-note">ใช้แนวที่เลือกเป็นกรอบของโพสต์นี้</p>
          </section>
          <section class="panel-section">
            <h2 class="section-title"><span class="step">1</span>เลือกหัวข้อความรู้{{ scienceLabel }}</h2>
            <div class="type-grid">
              <button v-for="item in availableCategories" :key="item.id" :class="['type-card', { active: categoryId === item.id }]" :aria-pressed="categoryId === item.id" @click="selectCategory(item.id)">
                <span class="type-icon" aria-hidden="true">{{ item.icon }}</span><span class="type-label">{{ item.label }}</span><span class="type-desc">{{ item.description }}</span>
              </button>
            </div>
          </section>
          <section v-if="(isAstrology || isNumerology || isBazi) && category.entityType" class="panel-section">
            <h2 class="section-title"><span class="step">2</span><label :for="`${scienceId}-entity`">{{ category.entityLabel }}</label></h2>
            <select :id="`${scienceId}-entity`" v-model="entityId" class="product-select">
              <option v-for="item in entities" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <p v-if="category.entityType === 'pair-range'" class="field-note">หนึ่งโพสต์สรุปครบ 10 คู่ในช่วงที่เลือก คู่ละหนึ่งบรรทัด</p>
          </section>
          <section v-if="category.needsCard" class="panel-section">
            <h2 class="section-title"><span class="step">2</span><label for="tarot-card">เลือกไพ่</label></h2>
            <select id="tarot-card" class="product-select" v-model="cardId">
              <option v-for="item in tarotCards" :key="item.id" :value="item.id">{{ item.number }} · {{ item.name }}</option>
            </select>
            <p class="field-note">เริ่มด้วย Major Arcana 22 ใบ</p>
            <template v-if="category.needsSecondCard">
              <label for="second-card" class="section-title">ไพ่ใบที่สอง</label>
              <select id="second-card" class="product-select" v-model="secondCardId">
                <option v-for="item in tarotCards" :key="item.id" :value="item.id" :disabled="item.id === cardId">{{ item.number }} · {{ item.name }}</option>
              </select>
              <p v-if="cardId === secondCardId" class="field-note">กรุณาเลือกไพ่สองใบที่ต่างกัน</p>
            </template>
          </section>
          <section class="panel-section">
            <h2 class="section-title"><span class="step">{{ category.needsCard || category.entityType ? '3' : '2' }}</span><label v-if="isAstrology || isNumerology || isBazi || category.id === 'basics'" for="basics-topic">เลือกประเด็น</label><span v-else>เลือกประเด็น</span></h2>
            <template v-if="isAstrology || isNumerology || isBazi || category.id === 'basics'">
              <select id="basics-topic" v-model="angleId" class="product-select">
                <option v-for="item in category.angles" :key="item.id" :value="item.id">{{ item.label }}</option>
              </select>
              <p class="field-note">{{ category.angles.length }} ประเด็นความรู้ในหมวดนี้</p>
            </template>
            <div v-else class="angle-list" role="radiogroup" aria-label="ประเด็นของโพสต์">
              <label v-for="item in category.angles" :key="item.id" :class="['angle-item', { active: angleId === item.id }]">
                <input type="radio" name="tarot-angle" :value="item.id" v-model="angleId" class="sr-only" />
                <span class="angle-dot" :class="{ 'angle-dot-active': angleId === item.id }" aria-hidden="true" /><span class="angle-label">{{ item.label }}</span>
              </label>
            </div>
          </section>
          <section class="panel-section">
            <label for="reference" class="section-title">ข้อมูลจากทีม / แนวตีความ (ถ้ามี)</label>
            <textarea id="reference" v-model="reference" class="reference-input" rows="3" maxlength="6000" placeholder="วางข้อมูลหรือแนวตีความที่อยากให้โพสต์ยึดตาม" />
          </section>
        </fieldset>
        <div class="generation-controls">
          <button class="generate-btn" :disabled="!canGenerate" @click="generate"><span v-if="isGenerating" class="spin">⟳</span>{{ isGenerating ? 'กำลังสร้าง…' : 'สร้างโพสต์' }}</button>
          <p class="coming-soon">ได้ทั้งโพสต์และข้อความบนภาพ ไม่ต้องตอบหรือส่งเฉลยภายหลัง</p>
        </div>
      </aside>
      <section class="panel-right" aria-label="พื้นที่แสดงโพสต์" :aria-busy="isGenerating">
        <div class="output-meta">
          <span class="meta-chip product-chip">{{ selectionLabel(displayedSelection) }}</span>
          <span class="meta-chip type-chip">{{ displayedSelection.category.label }}</span>
          <span v-if="displayedSelection.entity" class="meta-chip product-chip">{{ displayedSelection.entity.name }}</span>
          <span v-if="displayedSelection.category.needsCard" class="meta-chip product-chip">{{ displayedSelection.card.name }}</span>
          <span v-if="displayedSelection.category.needsSecondCard" class="meta-chip product-chip">{{ displayedSelection.secondCard.name }}</span>
          <span class="meta-chip angle-chip">{{ displayedSelection.angle.label }}</span>
        </div>
        <p v-if="error" class="tarot-error" role="alert">{{ error }}</p>
        <p v-if="storageMessage" class="field-note" role="status">{{ storageMessage }}</p>
        <div v-if="!output && !isGenerating" class="empty-state">
          <div class="empty-icon" aria-hidden="true">{{ scienceIcon }}</div><h3>{{ isBazi ? 'ปาจื้อ เล่าให้เข้าใจทีละเรื่อง' : isNumerology ? 'ตัวเลขหนึ่งตัว เล่าได้หลายมุม' : isAstrology ? 'เรื่องดาว เล่าให้เข้าใจง่าย' : 'ไพ่หนึ่งใบ เล่าได้หลายโพสต์' }}</h3>
          <p>{{ isBazi ? 'ลอง “ปาจื้อคืออะไร” หรือเลือกธาตุในหมวด “ธาตุทั้งห้า” แล้วเล่าความหมายผ่านตัวอย่างที่เข้าใจง่าย' : isNumerology ? 'ลองหมวด “รู้จักตัวเลข” เลือกเลข 5 แล้วเลือกประเด็น “เลขนี้สื่อถึงอะไร” หรือเล่าพื้นฐานเรื่องผลรวมและคู่เลข' : isAstrology ? 'ลอง “ลัคนาคืออะไร” หรือเลือกดาวในหมวด “รู้จักดาว” เพื่อสร้างโพสต์ความรู้' : 'ลอง The Fool ในหมวด “รู้จักไพ่ทีละใบ” แล้วเปลี่ยนไปเล่าเรื่องความรักหรือตำแหน่งคำแนะนำ' }}</p>
          <div class="tip-box">เลือกหมวด หัวข้อ และประเด็น แล้วกดสร้างโพสต์ แต่ละโพสต์มีคำอธิบาย ตัวอย่าง และสรุปครบในตัว</div>
        </div>
        <div v-else class="output-area tarot-output">
          <div class="post-card">
            <div class="post-header"><div class="post-avatar">✦</div><div><div class="post-author">ความรู้เรื่องดวง</div><div class="post-handle">ร่างโพสต์สำหรับทีม social</div></div></div>
            <div class="post-body">{{ parts.post }}<span v-if="isGenerating" class="cursor">|</span></div>
          </div>
          <section v-if="parts.image" class="image-copy"><h3>ข้อความบนภาพ</h3><p>{{ parts.image }}</p><button class="regen-btn" :disabled="isGenerating" @click="copyPart('image')">{{ copied === 'image' ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อความบนภาพ' }}</button></section>
          <template v-if="!isGenerating && output">
            <div class="output-actions"><button class="copy-btn" @click="copyPart('post')">{{ copied === 'post' ? '✓ คัดลอกแล้ว' : '📋 คัดลอกโพสต์' }}</button><button class="regen-btn" :disabled="!canGenerate" @click="generate">↺ สร้างใหม่</button></div>
            <details class="edit-draft"><summary>แก้ไขข้อความก่อนนำไปโพสต์</summary><label for="draft-text" class="field-note">คงหัวข้อ [โพสต์] และ [ข้อความบนภาพ] ไว้เพื่อคัดลอกแยกส่วน</label><textarea id="draft-text" v-model="output" rows="14" class="reference-input" /><button class="history-btn" @click="saveDraft">บันทึกฉบับแก้ไข</button></details>
            <p class="field-note">ตรวจความหมายและแนวตีความก่อนเผยแพร่ หากไม่มีข้อมูลจากทีม ข้อความนี้เป็นร่างตามแนวตีความทั่วไป</p>
          </template>
        </div>
      </section>
    </main>
  </div>
</template>
<style scoped>
.page {
  min-height: 100vh;
  background: #faf7ff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #322344;
}

/* ── Header ── */
.header {
  background: #7c3aed;
  padding: 0 24px;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.nav-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.brand-logo {
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  color: white;
  letter-spacing: 0.5px;
}
.brand-name {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: white;
}
.brand-sub {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

/* ── Main layout ── */
.main {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  min-height: calc(100vh - 67px);
}

/* ── Left panel ── */
.panel-left {
  width: 360px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e8ddf5;
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
}
.panel-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #71627f;
  display: flex;
  align-items: center;
  gap: 7px;
}
.step {
  width: 18px;
  height: 18px;
  background: #7c3aed;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Product select */
.product-select {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid #ddd0ed;
  border-radius: 8px;
  font-size: 13.5px;
  color: #322344;
  background: white;
  cursor: pointer;
  outline: none;
  appearance: auto;
}
.product-select:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}
.product-card {
  background: #f3e8ff;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.product-rank {
  font-size: 10px;
  font-weight: 700;
  color: #7c3aed;
  background: white;
  padding: 2px 6px;
  border-radius: 5px;
}
.product-name-text {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}
.shopee-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}
.shopee-yes {
  background: #fef3c7;
  color: #92400e;
}
.shopee-no {
  background: #f1f5f4;
  color: #6b7280;
}
.sales-text {
  font-size: 11px;
  color: #71627f;
  font-weight: 500;
}

/* Post type cards */
.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}
.type-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 10px 11px;
  border: 1.5px solid #e8ddf5;
  border-radius: 9px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.type-card:hover {
  border-color: #7c3aed;
  background: #faf7ff;
}
.type-card.active {
  border-color: #7c3aed;
  background: #f3e8ff;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}
.type-icon {
  font-size: 15px;
  line-height: 1;
  margin-bottom: 2px;
}
.type-label {
  font-size: 12px;
  font-weight: 600;
  color: #322344;
}
.type-desc {
  font-size: 10px;
  color: #9b86ad;
}

/* Angle list */
.angle-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.angle-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border: 1.5px solid #e8ddf5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.angle-item:hover {
  border-color: #7c3aed;
  background: #faf7ff;
}
.angle-item.active {
  border-color: #7c3aed;
  background: #f3e8ff;
}
.angle-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #ddd0ed;
  flex-shrink: 0;
  transition: all 0.15s;
}
.angle-dot-active {
  border-color: #7c3aed;
  background: #7c3aed;
  box-shadow: inset 0 0 0 2px white;
}
.angle-label {
  font-size: 13px;
  color: #322344;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

/* Generate button */
.generate-btn {
  margin-top: auto;
  padding: 13px 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.generate-btn:hover:not(:disabled) {
  background: #6d28d9;
}
.generate-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
  font-size: 16px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Right panel ── */
.panel-right {
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  text-align: center;
  gap: 10px;
  color: #71627f;
}
.empty-icon {
  font-size: 52px;
  line-height: 1;
  margin-bottom: 4px;
}
.empty-state h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #322344;
}
.empty-state p {
  margin: 0;
  font-size: 14px;
  max-width: 340px;
  line-height: 1.5;
}
.tip-box {
  margin-top: 6px;
  padding: 10px 16px;
  background: #f3e8ff;
  border-radius: 8px;
  font-size: 13px;
  color: #322344;
  max-width: 380px;
  line-height: 1.5;
}

/* Error state */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  text-align: center;
  gap: 10px;
}
.error-icon {
  font-size: 48px;
}
.error-state h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.error-text {
  margin: 0;
  font-size: 14px;
  color: #dc2626;
  max-width: 400px;
  line-height: 1.5;
  background: #fef2f2;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #fecaca;
}
.retry-btn {
  margin-top: 4px;
  padding: 9px 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.retry-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Output */
.output-area {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
}
.output-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.meta-chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}
.product-chip {
  background: #f3e8ff;
  color: #7c3aed;
}
.type-chip {
  background: #eff6ff;
  color: #1e40af;
}
.angle-chip {
  background: #f5f3ff;
  color: #6d28d9;
}

/* Post card mock-up */
.post-card {
  background: white;
  border: 1px solid #e8ddf5;
  border-radius: 12px;
  overflow: hidden;
}
.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #faf7ff;
}
.post-avatar {
  width: 36px;
  height: 36px;
  background: #7c3aed;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}
.post-author {
  font-size: 14px;
  font-weight: 600;
  color: #322344;
}
.post-handle {
  font-size: 11px;
  color: #9b86ad;
}
.post-body {
  padding: 14px 16px;
  font-size: 14.5px;
  line-height: 1.75;
  color: #322344;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 80px;
}
.post-text {
  white-space: pre-wrap;
}
.post-hashtags {
  padding: 10px 16px 14px;
  font-size: 13.5px;
  line-height: 1.8;
  color: #7c3aed;
  font-weight: 500;
  white-space: pre-wrap;
  border-top: 1px solid #faf7ff;
}
.cursor {
  display: inline-block;
  color: #7c3aed;
  font-weight: 700;
  animation: blink 0.75s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Action buttons */
.output-actions {
  display: flex;
  gap: 10px;
}
.copy-btn {
  flex: 1;
  padding: 11px 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.copy-btn:hover {
  background: #6d28d9;
}
.copy-btn.copied {
  background: #16a34a;
}
.regen-btn {
  padding: 11px 16px;
  background: transparent;
  color: #71627f;
  border: 1.5px solid #e8ddf5;
  border-radius: 9px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.regen-btn:hover {
  border-color: #7c3aed;
  color: #7c3aed;
}
.history-btn {
  padding: 11px 16px;
  background: #f3e8ff;
  color: #7c3aed;
  border: 1.5px solid #a8d5ce;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.history-btn:hover {
  background: #d0e9e5;
}
</style>

<style scoped>
.generation-controls { margin-top: auto; }
.coming-soon { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: #71627f; }
.nav-btn:disabled { opacity: .65; cursor: default; }
.angle-item:focus-within { outline: 2px solid #7c3aed; outline-offset: 2px; }
@media (max-width: 700px) {
  .header-inner { flex-wrap: wrap; gap: 12px; }
  .main { flex-direction: column; }
  .panel-left { width: 100%; border-right: 0; border-bottom: 1px solid #e8ddf5; }
  .panel-right { padding: 24px 20px; }
  .empty-state { min-height: 240px; }
}
</style>
<style scoped>
.tarot-controls { border: 0; padding: 0; margin: 0; min-width: 0; display: flex; flex-direction: column; gap: 22px; }
.header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.science-home { max-width: 1100px; margin: auto; padding: 48px 24px; }
.science-intro { margin-bottom: 28px; }
.science-eyebrow { color: #7c3aed; font-size: 13px; font-weight: 600; }
.science-intro h2 { margin: 10px 0; font-size: 28px; }
.science-intro p { color: #71627f; font-size: 14px; line-height: 1.8; }
.science-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.science-card { display: flex; flex-direction: column; align-items: flex-start; text-align: left; gap: 12px; padding: 26px; border: 1px solid #ddd0ed; border-radius: 14px; background: white; color: #322344; font: inherit; cursor: pointer; }
.science-card:hover:not(:disabled) { border-color: #7c3aed; background: #f3e8ff; }
.science-card:focus-visible { outline: 3px solid #7c3aed; outline-offset: 3px; }
.science-card:disabled { background: #f5f2f8; color: #71627f; cursor: default; }
.science-icon { font-size: 30px; }
.science-card strong { font-size: 19px; }
.science-description { color: #71627f; font-size: 13px; line-height: 1.7; }
.science-status { margin-top: auto; color: #7c3aed; font-size: 13px; font-weight: 600; }
.science-card:disabled .science-status { color: #71627f; }
@media (max-width: 600px) { .science-grid { grid-template-columns: 1fr; } .science-home { padding: 28px 16px; } }
.tarot-controls:disabled { opacity: .7; }
.reference-input { width: 100%; padding: 11px; border: 1px solid #ddd0ed; border-radius: 8px; font: inherit; font-size: 13px; line-height: 1.7; resize: vertical; color: #322344; }
.field-note { font-size: 12px; color: #71627f; line-height: 1.7; margin: 4px 0; }
.tarot-output { margin-top: 18px; }
.tarot-error { color: #b91c1c; background: #fef2f2; padding: 12px; border-radius: 8px; font-size: 13px; overflow-wrap: anywhere; }
.image-copy, .edit-draft { background: white; border: 1px solid #e8ddf5; border-radius: 10px; padding: 16px; }
.image-copy h3 { font-size: 14px; margin: 0 0 10px; }
.image-copy p { white-space: pre-wrap; line-height: 1.8; font-size: 14px; }
.edit-draft summary { cursor: pointer; font-size: 13px; margin-bottom: 10px; }
.edit-draft .history-btn { margin-top: 10px; }
.tarot-history { max-width: 1000px; margin: auto; padding: 30px 24px; }
.history-note { color: #71627f; font-size: 13px; }
.draft-item { display: flex; flex-direction: column; gap: 10px; width: 100%; text-align: left; font: inherit; background: white; border: 1px solid #e8ddf5; border-radius: 12px; padding: 20px; margin: 14px 0; cursor: pointer; color: #322344; }
.draft-item:hover { border-color: #7c3aed; }
.draft-item time, .draft-item span { font-size: 12px; color: #71627f; line-height: 1.6; }
</style>
