<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { tarotCards, tarotCategories, validateTarotSelection } from '@/data/tarot'
import { astrologyCategories, astrologyTraditions, getAstrologyEntities, validateAstrologySelection } from '@/data/astrology'
import { numerologyTraditions, getNumerologyCategories, getNumerologyEntities, validateNumerologySelection } from '@/data/numerology'
import { baziCategories, getBaziEntities, validateBaziSelection } from '@/data/bazi'
import { generateHoroscopePost } from '@/services/horoscope'
import PredictionPlanner from '@/components/PredictionPlanner.vue'
import { saveHoroscopePost, fetchHoroscopePosts, importLegacyHoroscopePosts, deleteHoroscopePost } from '@/services/firebase'
import { presentPrediction } from '@/data/predictionPresentation'

const sectionId = ref('education')
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
const historyLoading = ref(false)
const historyError = ref('')
const historyFilter = ref('all')
const historySearch = ref('')
const deletingId = ref(null)
const historyDialog = ref(null)
const openedPost = ref(null)
const modalCopied = ref(false)
const modalError = ref('')
const modalResult = computed(() => presentPrediction(openedPost.value?.output || ''))
const predictionDraft = ref(null)
const predictionBusy = ref(false)
const isSaving = ref(false)
const currentId = ref(null)
const currentSelection = ref(null)
const history = ref([])
const STORAGE_KEY = 'auto-news.horoscope.posts.v1'
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  if (!Array.isArray(stored)) throw new Error('Invalid history')
  history.value = stored.filter((post) => post && typeof post.id === 'string' && typeof post.output === 'string' && post.selection && validSelection(post.selection, true)).slice(0, 50).map(post => ({ ...post, id: `horoscope_legacy_${post.id}`, legacyId: post.id, kind: 'education' }))
} catch {
  storageMessage.value = 'เปิดประวัติในเบราว์เซอร์ไม่ได้ ยังสร้างและคัดลอกโพสต์ได้'
}
const historyCounts = computed(() => ({ all: history.value.length, education: history.value.filter(post => post.kind === 'education').length, prediction: history.value.filter(post => post.kind === 'prediction').length }))
const historyTabs = [{ id: 'all', label: 'ทั้งหมด' }, { id: 'education', label: 'ให้ความรู้' }, { id: 'prediction', label: 'ดูดวง' }]
const filteredHistory = computed(() => history.value.filter(post => (historyFilter.value === 'all' || post.kind === historyFilter.value) && `${draftTitle(post)} ${post.output}`.toLocaleLowerCase().includes(historySearch.value.trim().toLocaleLowerCase())))
function historyHeadline(post) {
  if (post.kind === 'prediction') return post.selection.format === 'child' ? 'เด็กเกิดวันนี้' : `ดวง${{ daily: 'รายวัน', weekly: 'รายสัปดาห์', monthly: 'รายเดือน' }[post.selection.period] || 'ตามช่วงเวลา'}`
  return [post.selection.entity?.name || (post.selection.category.needsCard && post.selection.card?.name) || post.selection.category.label, post.selection.angle.label].filter(Boolean).join(' · ')
}
function historySubtitle(post) {
  if (post.kind === 'prediction') return [post.selection.date, post.selection.topics?.join(' · ')].filter(Boolean).join(' / ')
  return [selectionLabel(post.selection), post.selection.category.label].filter(Boolean).join(' / ')
}
function historyExcerpt(post) { return post.output.replace(/^\s*\[โพสต์\]\s*/, '').split('[ข้อความบนภาพ]')[0].trim() }
async function loadHistory() {
  if (historyLoading.value || deletingId.value) return
  historyLoading.value = true
  historyError.value = ''
  try {
    try {
      const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(legacy) && legacy.length) await importLegacyHoroscopePosts(legacy.filter(post => post?.selection && validSelection(post.selection, true)))
    } catch { historyError.value = 'ย้ายประวัติเดิมจากเบราว์เซอร์ยังไม่สำเร็จ ข้อมูลเดิมยังอยู่ สามารถลองโหลดใหม่ได้' }
    history.value = await fetchHoroscopePosts()
  } catch {
    historyError.value = 'โหลดประวัติจากฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่ โพสต์เดิมในเบราว์เซอร์ยังอยู่'
  } finally { historyLoading.value = false }
}
async function toggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) await loadHistory()
}
async function deleteDraft(post) {
  if (deletingId.value || historyLoading.value) return
  if (!window.confirm(`ลบโพสต์ “${historyHeadline(post)}” ออกจากประวัติ?\nเมื่อลบแล้วจะกู้คืนไม่ได้`)) return
  deletingId.value = post.id
  historyError.value = ''
  try {
    await deleteHoroscopePost(post.id)
    history.value = history.value.filter(item => item.id !== post.id)
    if (currentId.value === post.id) {
      currentId.value = null
      currentSelection.value = null
      output.value = ''
    }
    if (predictionDraft.value?.id === post.id) predictionDraft.value = null
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(stored)) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.filter(item => item.id !== post.legacyId && `horoscope_legacy_${item.id}` !== post.id)))
    } catch { /* The database marker prevents re-import if local storage is unavailable. */ }
  } catch { historyError.value = 'ลบโพสต์ไม่สำเร็จ กรุณาลองใหม่' }
  finally { deletingId.value = null }
}
onMounted(loadHistory)
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
const canGenerate = computed(() => sectionId.value === 'education' && ['tarot', 'astrology', 'numerology', 'bazi'].includes(scienceId.value) && category.value?.available !== false && validSelection(selection.value) && !isGenerating.value && !isSaving.value)
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
function selectSection(id) {
  sectionId.value = id
  showHistory.value = false
}
function changeTradition() {
  if (!availableCategories.value.some((item) => item.id === categoryId.value)) {
    selectCategory(availableCategories.value[0].id)
    return
  }
  entityId.value = entities.value[0]?.id || ''
}
async function saveDraft() {
  if (!output.value.trim() || !currentSelection.value || isSaving.value) return
  isSaving.value = true
  try {
    currentId.value = await saveHoroscopePost({ id: currentId.value, kind: 'education', selection: currentSelection.value, output: output.value })
    storageMessage.value = 'บันทึกในฐานข้อมูลแล้ว'
  } catch {
    storageMessage.value = 'บันทึกในฐานข้อมูลไม่สำเร็จ ลองบันทึกอีกครั้งหรือคัดลอกข้อความเก็บไว้'
  } finally { isSaving.value = false }
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
    await saveDraft()
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
async function openDraft(post) {
  openedPost.value = post
  modalCopied.value = false
  modalError.value = ''
  await nextTick()
  historyDialog.value.showModal()
}
function closeHistoryPost() {
  historyDialog.value.close()
}
async function copyHistoryPost() {
  try {
    await navigator.clipboard.writeText(modalResult.value.text)
    modalCopied.value = true
    modalError.value = ''
  } catch { modalError.value = 'คัดลอกไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง' }
}
function draftTitle(post) {
  if (post.kind === 'prediction') return [{ child: 'เด็กเกิดวันนี้', colors: 'สีมงคลประจำวัน', forecast: 'ดวงตามช่วงเวลา' }[post.selection.format] || 'โพสต์ดูดวง', post.selection.date, { daily: 'รายวัน', weekly: 'รายสัปดาห์', monthly: 'รายเดือน' }[post.selection.period], post.selection.topics?.join(' / ')].filter(Boolean).join(' · ')
  return [selectionLabel(post.selection), post.selection.category.label, post.selection.entity?.name, post.selection.category.needsCard && post.selection.card?.name, post.selection.category.needsSecondCard && post.selection.secondCard?.name, post.selection.angle.label].filter(Boolean).join(' · ')
}
function selectionLabel(value) {
  if (value.science === 'bazi') return 'ปาจื้อ'
  if (value.science === 'numerology') return numerologyTraditions.find((item) => item.id === value.tradition)?.label || 'เลขศาสตร์'
  return value.science === 'astrology' ? `โหราศาสตร์${value.tradition === 'western' ? 'ตะวันตก' : 'ไทย'}` : 'ไพ่ทาโรต์'
}
function formatDate(date) { return (date?.toDate ? date.toDate() : new Date(date)).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) }
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo" aria-hidden="true">✦</div>
          <div>
            <h1 class="brand-name">ดวง Content Generator</h1>
            <p class="brand-sub">{{ sectionId === 'prediction' ? 'ดูดวง · คำทำนายและคำอธิบายอยู่ครบในโพสต์' : scienceId ? `ให้ความรู้ · ${scienceLabel} · โพสต์เดียวอ่านจบ` : 'ให้ความรู้ · เลือกศาสตร์ แล้วสร้างคอนเทนต์เรื่องดวง' }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="sectionId === 'education' && scienceId && !showHistory" class="nav-btn" :disabled="isGenerating || isSaving" @click="scienceId = ''">‹ เลือกศาสตร์</button>
          <button class="nav-btn" :disabled="isGenerating || isSaving || predictionBusy" @click="toggleHistory">{{ showHistory ? '✦ สร้างโพสต์' : '📋 ประวัติโพสต์ดวง' }}</button>
        </div>
      </div>
    </header>
    <nav v-if="!showHistory" class="content-sections" aria-label="ประเภทโพสต์ดวง">
      <button :class="['section-btn', { active: sectionId === 'education' }]" :aria-pressed="sectionId === 'education'" :disabled="isGenerating || isSaving || predictionBusy" @click="selectSection('education')">📚 ให้ความรู้</button>
      <button :class="['section-btn', { active: sectionId === 'prediction' }]" :aria-pressed="sectionId === 'prediction'" :disabled="isGenerating || isSaving || predictionBusy" @click="selectSection('prediction')">🔮 ดูดวง</button>
    </nav>
    <dialog ref="historyDialog" class="history-post-modal" aria-labelledby="history-post-title" @close="openedPost = null" @click="($event.target === historyDialog) && closeHistoryPost()">
      <div class="modal-heading"><h2 id="history-post-title">{{ modalResult.title }}</h2><button type="button" class="modal-close" aria-label="ปิดโพสต์" autofocus @click="closeHistoryPost">×</button></div>
      <div class="modal-result">{{ modalResult.body }}</div>
      <div class="modal-actions"><p v-if="modalError" role="alert" class="tarot-error">{{ modalError }}</p><button type="button" class="copy-btn" @click="copyHistoryPost">{{ modalCopied ? 'คัดลอกแล้ว' : 'คัดลอกโพสต์' }}</button></div>
    </dialog>
    <main v-if="showHistory" class="tarot-history">
      <div class="history-heading"><div><span class="science-eyebrow">คลังเนื้อหาของทีม</span><h2>ประวัติโพสต์ดวง</h2></div><button class="history-refresh" :disabled="historyLoading" @click="loadHistory">↻ {{ historyLoading ? 'กำลังโหลด…' : 'โหลดใหม่' }}</button></div>
      <div class="history-toolbar"><div class="history-tabs" aria-label="กรองประเภทโพสต์"><button v-for="tab in historyTabs" :key="tab.id" :class="['history-tab', { active: historyFilter === tab.id }]" :aria-pressed="historyFilter === tab.id" @click="historyFilter = tab.id">{{ tab.label }} <span>{{ historyCounts[tab.id] }}</span></button></div><label class="history-search"><span aria-hidden="true">⌕</span><input v-model="historySearch" type="search" placeholder="ค้นหาหัวข้อหรือข้อความ…" aria-label="ค้นหาประวัติโพสต์ดวง" /></label></div>
      <p v-if="historyLoading" class="history-note" role="status">กำลังโหลดประวัติจากฐานข้อมูล…</p><p v-if="historyError" class="tarot-error" role="alert">{{ historyError }}</p>
      <div v-if="!historyLoading && !historyError && !filteredHistory.length" class="history-empty"><span aria-hidden="true">✦</span><h3>{{ historySearch ? 'ไม่พบโพสต์ที่ค้นหา' : 'ยังไม่มีโพสต์ในหมวดนี้' }}</h3><p>{{ historySearch ? 'ลองเปลี่ยนคำค้นหรือเลือกดูทั้งหมด' : 'เริ่มสร้างโพสต์ แล้วระบบจะบันทึกมาไว้ที่นี่' }}</p><button v-if="historySearch" class="history-refresh" @click="historySearch = ''">ล้างคำค้น</button></div>
      <div class="history-grid"><article v-for="post in filteredHistory" :key="post.id" :class="['draft-item', { 'prediction-card': post.kind === 'prediction' }]">
        <button class="draft-open" :disabled="!!deletingId" @click="openDraft(post)">
        <div class="draft-top"><span class="draft-kind">{{ post.kind === 'prediction' ? '🔮 ดูดวง' : '📚 ให้ความรู้' }}</span><span class="draft-arrow" aria-hidden="true">↗</span></div>
        <strong class="draft-title">{{ historyHeadline(post) }}</strong><span class="draft-meta">{{ historySubtitle(post) }}</span>
        <p class="draft-excerpt">{{ historyExcerpt(post) }}</p>
        </button>
        <div class="draft-footer"><time>{{ formatDate(post.updatedAt || post.createdAt) }}</time><button class="draft-delete" :disabled="!!deletingId || historyLoading" :aria-label="`ลบโพสต์ ${historyHeadline(post)}`" @click="deleteDraft(post)">{{ deletingId === post.id ? 'กำลังลบ…' : 'ลบโพสต์' }}</button></div>
      </article></div>
    </main>
    <main v-else-if="sectionId === 'prediction'"><PredictionPlanner :draft="predictionDraft" @busy="predictionBusy = $event" @saved="predictionDraft = $event" /></main>
    <main v-else-if="!scienceId" class="science-home">
      <div class="science-intro">
        <span class="science-eyebrow">โพสต์ให้ความรู้</span>
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
        <fieldset class="tarot-controls" :disabled="isGenerating || isSaving">
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
            <details class="edit-draft"><summary>แก้ไขข้อความก่อนนำไปโพสต์</summary><label for="draft-text" class="field-note">คงหัวข้อ [โพสต์] และ [ข้อความบนภาพ] ไว้เพื่อคัดลอกแยกส่วน</label><textarea id="draft-text" v-model="output" :disabled="isSaving" rows="14" class="reference-input" /><button class="history-btn" :disabled="isSaving" @click="saveDraft">{{ isSaving ? 'กำลังบันทึก…' : 'บันทึกฉบับแก้ไข' }}</button></details>
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
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371627f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  width: 100%;
  padding: 9px 38px 9px 11px;
  border: 1px solid #ddd0ed;
  border-radius: 8px;
  font-size: 13.5px;
  color: #322344;
  background-color: white;
  cursor: pointer;
  outline: none;
}
@media (forced-colors: active) { .product-select { appearance: auto; background-image: none; } }
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
.content-sections { display: flex; gap: 10px; padding: 16px 24px; background: white; border-bottom: 1px solid #e8ddf5; }
.section-btn { border: 1px solid #ddd0ed; border-radius: 9px; background: white; color: #71627f; padding: 11px 20px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.section-btn.active { background: #f3e8ff; border-color: #7c3aed; color: #6d28d9; }
.section-btn:hover:not(:disabled) { background: #faf7ff; }
.section-btn:focus-visible { outline: 3px solid #a78bfa; outline-offset: 3px; }
.section-btn:disabled { opacity: .65; cursor: default; }
.prediction-placeholder { padding: 28px; background: white; border: 1px solid #ddd0ed; border-radius: 14px; }
.prediction-placeholder h3 { margin: 16px 0 10px; font-size: 18px; }
.prediction-placeholder p { color: #71627f; font-size: 14px; line-height: 1.8; }
.prediction-status { display: inline-block; margin-top: 8px; background: #f3e8ff; color: #6d28d9; border-radius: 20px; padding: 6px 12px; font-size: 12px; }
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
.tarot-history { max-width: 1200px; margin: auto; padding: 38px 24px 60px; }
.history-heading { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-bottom: 24px; }.history-heading h2 { font-size: 28px; margin: 8px 0; letter-spacing: -.5px; }.history-note { color: #71627f; font-size: 13px; line-height: 1.7; }
.history-refresh { border: 1px solid #ddd0ed; border-radius: 10px; background: white; padding: 10px 15px; color: #6d28d9; font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }.history-refresh:disabled { opacity: .6; cursor: default; }
.history-toolbar { display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 14px; border: 1px solid #e8ddf5; border-radius: 16px; background: white; margin-bottom: 24px; }.history-tabs { display: flex; flex-wrap: wrap; gap: 6px; }.history-tab { display: flex; gap: 9px; align-items: center; border: 0; border-radius: 9px; background: transparent; color: #71627f; padding: 10px 13px; font: inherit; font-size: 13px; cursor: pointer; }.history-tab span { background: #f5f2f8; border-radius: 6px; font-size: 11px; padding: 2px 6px; }.history-tab.active { background: #f3e8ff; color: #6d28d9; font-weight: 600; }.history-tab.active span { background: #e9d5ff; }
.history-search { display: flex; gap: 9px; align-items: center; color: #9b86ad; background: #faf7ff; border: 1px solid #e8ddf5; border-radius: 10px; padding: 9px 12px; min-width: 0; }.history-search input { width: 220px; max-width: 100%; min-width: 0; border: 0; outline: none; background: transparent; font: inherit; font-size: 13px; color: #322344; }.history-search:focus-within { border-color: #7c3aed; outline: 2px solid #ede9fe; }
.history-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }.draft-item { display: flex; flex-direction: column; gap: 12px; min-width: 0; width: 100%; text-align: left; font: inherit; background: white; border: 1px solid #e8ddf5; border-radius: 16px; padding: 22px; color: #322344; transition: border-color .15s, box-shadow .15s; }.draft-item:has(.draft-open:hover:not(:disabled)) { border-color: #a78bfa; box-shadow: 0 8px 24px #6d28d912; }.draft-item:focus-visible, .history-tab:focus-visible, .history-refresh:focus-visible { outline: 3px solid #a78bfa; outline-offset: 3px; }.draft-top { display: flex; align-items: center; justify-content: space-between; }.draft-kind { background: #f3e8ff; color: #6d28d9; font-size: 11px; border-radius: 20px; padding: 5px 10px; }.prediction-card .draft-kind { background: #fff3e6; color: #9a602c; }.draft-arrow { color: #b8a6ca; font-size: 20px; }.draft-title { font-size: 17px; line-height: 1.6; overflow-wrap: anywhere; }.draft-meta { color: #9b86ad; font-size: 11px; line-height: 1.7; }.draft-excerpt { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; color: #71627f; font-size: 13px; line-height: 1.9; margin: 0 0 8px; white-space: pre-line; }.draft-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid #f0e8f8; padding-top: 14px; margin-top: auto; }.draft-footer time { color: #9b86ad; font-size: 10px; }.draft-footer span { color: #7c3aed; font-size: 11px; font-weight: 600; }
.history-empty { text-align: center; background: white; border: 1px dashed #ddd0ed; border-radius: 18px; padding: 50px 20px; }.history-empty > span { color: #a78bfa; font-size: 38px; }.history-empty h3 { margin: 12px 0; font-size: 18px; }.history-empty p { color: #71627f; font-size: 13px; }
.draft-delete:hover:not(:disabled) { background: #ffe4e6; color: #9f1239; }.draft-delete:active:not(:disabled) { background: #fecdd3; }
.history-post-modal { width: min(720px, calc(100% - 32px)); max-height: calc(100dvh - 48px); padding: 28px; border: 1px solid #e8ddf5; border-radius: 20px; background: white; color: #322344; box-shadow: 0 24px 80px #1e103344; overflow-y: auto; }.history-post-modal::backdrop { background: #1e103380; backdrop-filter: blur(4px); }.modal-heading { display: flex; align-items: flex-start; gap: 18px; justify-content: space-between; }.modal-heading h2 { margin: 0; font-size: clamp(22px, 3vw, 28px); line-height: 1.5; overflow-wrap: anywhere; }.modal-close { flex-shrink: 0; width: 34px; height: 34px; border: 0; border-radius: 50%; background: #f5f2f8; color: #71627f; font-size: 24px; cursor: pointer; }.modal-result { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.9; font-size: 14px; padding: 24px 0; }.modal-actions { border-top: 1px solid #e8ddf5; padding-top: 18px; display: flex; flex-direction: column; gap: 12px; }.modal-close:focus-visible { outline: 2px solid #7c3aed; outline-offset: 3px; }@media(max-width: 600px) { .history-post-modal { padding: 20px; } }
.draft-open { display: flex; flex-direction: column; gap: 12px; width: 100%; padding: 0; border: 0; background: transparent; font: inherit; color: inherit; text-align: left; cursor: pointer; }.draft-delete { border: 0; border-radius: 6px; padding: 8px 12px; background: #fff1f2; color: #be123c; font: inherit; font-size: 11px; cursor: pointer; }.draft-footer { align-items: center; }.draft-open:focus-visible, .draft-delete:focus-visible { outline: 2px solid #a78bfa; outline-offset: 4px; }.draft-open:disabled, .draft-delete:disabled { opacity: .6; cursor: default; }
@media (max-width: 1000px) { .history-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }@media (max-width: 700px) { .tarot-history { padding: 26px 16px; }.history-heading { align-items: flex-start; }.history-heading h2 { font-size: 23px; }.history-toolbar { flex-direction: column; align-items: stretch; }.history-search input { width: 100%; }.history-grid { grid-template-columns: 1fr; }.draft-item { padding: 20px; } }
</style>
