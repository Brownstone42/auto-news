<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchPosts, updatePost, addVersion, updateVersion, fetchExamples, saveVersionImage } from '@/services/firebase'
import { generatePost, generateImagePrompt } from '@/services/openai'
import { checkHiggsfieldStatus, generateImage } from '@/services/higgsfield'

const router = useRouter()
const posts = ref([])
const loading = ref(true)
const expandedId = ref(null)
const saving = ref(null)
const isRegening = ref(null)
const statusFilter = ref('all')

// Higgsfield image generation
const hfConnected = ref(false)
const hfModels = [
  { id: 'nano_banana_2', name: 'Nano Banana 2', description: 'Best overall · Cheapest credits · #1 benchmark' },
  { id: 'gpt_image_2',   name: 'GPT Image 2',   description: 'Best instruction-following · Premium quality' },
  { id: 'seedream',      name: 'Seedream',       description: 'Best artistic style · Low cost · Unlimited on Plus' },
  { id: 'flux_2',        name: 'FLUX 2',         description: 'Fast & reliable · Low cost · Unlimited on Plus' },
  { id: 'soul_v2',       name: 'Soul V2',        description: 'Best for people & portraits · Mid cost' },
  // Note: frontend IDs are mapped to correct job_set_types in Firebase Functions (MODEL_IDS map)
]
const imageGenState = ref({}) // { postId: { open, model, prompt, loadingPrompt, loadingImage, imageUrl, error, aspectRatio } }

const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16']

function getImageGen(postId) {
  if (!imageGenState.value[postId]) {
    imageGenState.value[postId] = {
      open: false,
      model: hfModels[0]?.id ?? 'nano_banana_2',
      prompt: '',
      loadingPrompt: false,
      loadingImage: false,
      imageUrl: '',
      error: '',
      aspectRatio: '1:1',
    }
  }
  return imageGenState.value[postId]
}

async function openImagePanel(post) {
  const state = getImageGen(post.id)
  state.open = !state.open
  // Auto-generate image prompt when opening if empty
  if (state.open && !state.prompt) {
    await autoGeneratePrompt(post)
  }
}

function buildFallbackPrompt(post) {
  return `Professional product photography of ${post.product?.name} used in a clean industrial ${post.product?.group} environment. Soft studio lighting, white background, sharp detail, modern aesthetic.`
}

async function autoGeneratePrompt(post) {
  const state = getImageGen(post.id)
  const version = getSelectedVersion(post)
  state.loadingPrompt = true
  state.prompt = ''   // clear immediately so the user sees it reset
  state.error = ''
  try {
    const text = version?.text || ''
    const result = await generateImagePrompt(text)
    console.log('[ImagePrompt] API result:', JSON.stringify(result))
    if (result && result.trim()) {
      state.prompt = result.trim()
    } else {
      console.warn('[ImagePrompt] empty result from API — check openai.js generateImagePrompt')
      state.prompt = buildFallbackPrompt(post)
      state.error = 'API returned empty prompt — using fallback. Check console.'
    }
  } catch (err) {
    console.error('[ImagePrompt] error:', err)
    state.prompt = buildFallbackPrompt(post)
    state.error = `Auto-prompt failed (using fallback): ${err.message}`
  } finally {
    state.loadingPrompt = false
  }
}

async function runImageGeneration(post) {
  const state = getImageGen(post.id)
  if (!state.prompt.trim() || state.loadingImage) return
  state.loadingImage = true
  state.imageUrl = ''
  state.error = ''
  try {
    const result = await generateImage({ model: state.model, prompt: state.prompt, aspectRatio: state.aspectRatio })
    state.imageUrl = result.imageUrl

    // Auto-save image + prompt used onto the current version
    const version = getSelectedVersion(post)
    const imageData = { url: result.imageUrl, prompt: state.prompt, model: state.model, aspectRatio: state.aspectRatio }
    const updatedVersions = await saveVersionImage(post.id, version.versionNumber, imageData)

    // Update local posts array so history shows the image immediately without refetch
    const localPost = posts.value.find((p) => p.id === post.id)
    if (localPost) localPost.versions = updatedVersions
  } catch (err) {
    state.error = err.message
  } finally {
    state.loadingImage = false
  }
}

// Per-version score+feedback local state: key = `${postId}-v${n}`
const localScores = ref({})
// Per-post final version local state
const localFinals = ref({})
// Streaming text during regen: key = postId
const regenText = ref({})
// Which version is currently shown per post: key = postId
const selectedVersionMap = ref({})

// Backward compat: old posts have no versions[] array
function getVersions(post) {
  if (post.versions?.length) return post.versions
  return [{ versionNumber: 1, text: post.aiGenerated, score: post.score ?? null, feedback: post.feedback ?? '', createdAt: null }]
}

function getSelectedVersion(post) {
  const versions = getVersions(post)
  const selected = selectedVersionMap.value[post.id] ?? versions[versions.length - 1].versionNumber
  return versions.find((v) => v.versionNumber === selected) ?? versions[versions.length - 1]
}

function selectVersion(postId, vn) {
  selectedVersionMap.value[postId] = vn
}

function getLocalScore(postId, versionNumber) {
  const key = `${postId}-v${versionNumber}`
  if (!localScores.value[key]) {
    const post = posts.value.find((p) => p.id === postId)
    const version = getVersions(post).find((v) => v.versionNumber === versionNumber)
    localScores.value[key] = { score: version?.score ?? null, feedback: version?.feedback ?? '' }
  }
  return localScores.value[key]
}

function getLocalFinal(post) {
  if (!(post.id in localFinals.value)) {
    localFinals.value[post.id] = post.finalVersion ?? ''
  }
  return localFinals.value[post.id]
}

onMounted(async () => {
  posts.value = await fetchPosts()
  loading.value = false

  // Check Higgsfield connection
  try {
    const status = await checkHiggsfieldStatus()
    hfConnected.value = status.authenticated
  } catch {
    // Server not running — Higgsfield features will be hidden
  }
})

const filteredPosts = computed(() => {
  if (statusFilter.value === 'all') return posts.value
  return posts.value.filter((p) => p.status === statusFilter.value)
})

const counts = computed(() => ({
  all: posts.value.length,
  generated: posts.value.filter((p) => p.status === 'generated').length,
  scored: posts.value.filter((p) => p.status === 'scored').length,
  finalized: posts.value.filter((p) => p.status === 'finalized').length,
}))

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function applyToPost(id, updates) {
  const idx = posts.value.findIndex((p) => p.id === id)
  if (idx !== -1) posts.value[idx] = { ...posts.value[idx], ...updates }
}

async function saveReview(post) {
  const version = getSelectedVersion(post)
  const local = getLocalScore(post.id, version.versionNumber)
  if (local.score === null) return
  saving.value = post.id
  const result = await updateVersion(post.id, version.versionNumber, { score: local.score, feedback: local.feedback })
  applyToPost(post.id, { versions: result.versions, status: result.status })
  saving.value = null
}

async function regenerate(post) {
  const version = getSelectedVersion(post)
  isRegening.value = post.id
  regenText.value[post.id] = ''

  try {
    // Current version's feedback is the primary signal; supplement with broader history
    const history = await fetchExamples({ postTypeId: post.postType.id, angleId: post.angle.id }).catch(() => ({ finalized: [], reviewed: [] }))
    const primarySignal = { score: version.score, feedback: version.feedback }
    const examples = {
      finalized: history.finalized,
      reviewed: [primarySignal, ...history.reviewed.filter((r) => r.feedback !== version.feedback)],
    }

    await generatePost(post.product, post.postType, post.angle, examples, (chunk) => {
      regenText.value[post.id] = (regenText.value[post.id] ?? '') + chunk
    })

    const result = await addVersion(post.id, regenText.value[post.id])
    applyToPost(post.id, { versions: result.versions })
    selectedVersionMap.value[post.id] = result.nextNumber
  } finally {
    regenText.value[post.id] = ''
    isRegening.value = null
  }
}

async function finalize(post) {
  const finalText = getLocalFinal(post)
  if (!finalText.trim()) return
  saving.value = post.id
  await updatePost(post.id, { finalVersion: finalText, status: 'finalized' })
  applyToPost(post.id, { finalVersion: finalText, status: 'finalized' })
  saving.value = null
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABEL = { generated: 'AI Draft', scored: 'Reviewed', finalized: 'Finalized' }
const STATUS_CLASS = { generated: 'badge-draft', scored: 'badge-reviewed', finalized: 'badge-final' }

function scoreColor(n) {
  if (n <= 3) return 'score-low'
  if (n <= 6) return 'score-mid'
  if (n <= 8) return 'score-good'
  return 'score-great'
}

function bestScore(post) {
  const versions = getVersions(post)
  const scores = versions.map((v) => v.score).filter((s) => s !== null)
  return scores.length ? Math.max(...scores) : null
}

// A version is locked once a newer version has been generated from it
function isVersionLocked(post, version) {
  return getVersions(post).some((v) => v.versionNumber > version.versionNumber)
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">IG</div>
          <div>
            <h1 class="brand-name">Post History</h1>
            <p class="brand-sub">Review, score, and finalize your generated posts</p>
          </div>
        </div>
        <button class="nav-btn" @click="router.push('/')">✦ Generator</button>
      </div>
    </header>

    <main class="main">
      <div class="filter-bar">
        <button
          v-for="f in ['all', 'generated', 'scored', 'finalized']"
          :key="f"
          :class="['filter-btn', { active: statusFilter === f }]"
          @click="statusFilter = f"
        >
          {{ f === 'all' ? 'All' : STATUS_LABEL[f] }}
          <span class="filter-count">{{ counts[f] }}</span>
        </button>
      </div>

      <div v-if="loading" class="empty-state"><p>Loading history...</p></div>

      <div v-else-if="filteredPosts.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No posts yet</h3>
        <p>Generate your first post and it will appear here.</p>
        <button class="go-btn" @click="router.push('/')">Go to Generator</button>
      </div>

      <div v-else class="post-list">
        <div
          v-for="post in filteredPosts"
          :key="post.id"
          :class="['post-card', { expanded: expandedId === post.id }]"
        >
          <!-- Card header -->
          <div class="card-header" @click="toggleExpand(post.id)">
            <div class="card-meta">
              <span class="chip chip-product">{{ post.product?.name }}</span>
              <span class="chip chip-type">{{ post.postType?.label }}</span>
              <span class="chip chip-angle">{{ post.angle?.label }}</span>
              <span class="chip chip-versions">{{ getVersions(post).length }} version{{ getVersions(post).length > 1 ? 's' : '' }}</span>
            </div>
            <div class="card-right">
              <span class="date-text">{{ formatDate(post.createdAt) }}</span>
              <span :class="['status-badge', STATUS_CLASS[post.status]]">{{ STATUS_LABEL[post.status] }}</span>
              <span v-if="bestScore(post) !== null" :class="['score-chip', scoreColor(bestScore(post))]">
                {{ bestScore(post) }}/10
              </span>
              <span class="expand-icon">{{ expandedId === post.id ? '▲' : '▼' }}</span>
            </div>
          </div>

          <!-- Card body -->
          <div v-if="expandedId === post.id" class="card-body">

            <!-- Version tabs + text -->
            <section class="review-section">
              <div class="section-header">
                <h3 class="section-title">AI Generated Post</h3>
                <div class="version-tabs">
                  <button
                    v-for="v in getVersions(post)"
                    :key="v.versionNumber"
                    :class="['version-tab', {
                      active: getSelectedVersion(post).versionNumber === v.versionNumber,
                      scored: v.score !== null
                    }]"
                    @click="selectVersion(post.id, v.versionNumber)"
                  >
                    v{{ v.versionNumber }}
                    <span v-if="v.score !== null" :class="['vtab-score', scoreColor(v.score)]">{{ v.score }}</span>
                  </button>
                </div>
              </div>

              <!-- Streaming output while regenerating -->
              <div v-if="isRegening === post.id" class="regen-state">
                <div class="regen-label">✦ Generating v{{ getVersions(post).length + 1 }}...</div>
                <pre class="post-text streaming">{{ regenText[post.id] }}<span class="cursor">|</span></pre>
              </div>
              <pre v-else class="post-text readonly">{{ getSelectedVersion(post).text }}</pre>

              <!-- Saved image for this version -->
              <div v-if="getSelectedVersion(post).image?.url" class="saved-image-block">
                <img :src="getSelectedVersion(post).image.url" alt="Generated image" class="saved-img" />
                <div class="saved-img-meta">
                  <span class="saved-img-label">🎨 {{ getSelectedVersion(post).image.model }} · {{ getSelectedVersion(post).image.aspectRatio }}</span>
                  <a :href="getSelectedVersion(post).image.url" target="_blank" download class="download-btn">↓ Download</a>
                </div>
                <p class="saved-img-prompt">{{ getSelectedVersion(post).image.prompt }}</p>
              </div>

              <!-- Regenerate button -->
              <button
                v-if="getSelectedVersion(post).score !== null && isRegening !== post.id"
                class="regen-history-btn"
                :disabled="isRegening !== null"
                @click="regenerate(post)"
              >
                ↺ Regenerate using v{{ getSelectedVersion(post).versionNumber }} feedback
              </button>

              <!-- Generate Image button — only when Higgsfield is connected -->
              <button
                v-if="hfConnected"
                :class="['image-gen-btn', { active: getImageGen(post.id).open }]"
                @click="openImagePanel(post)"
              >
                🎨 {{ getImageGen(post.id).open ? 'Close Image Panel' : 'Generate Image' }}
              </button>

              <!-- Image generation panel -->
              <div v-if="hfConnected && getImageGen(post.id).open" class="image-panel">
                <!-- Model selector -->
                <div class="field-group">
                  <span class="label">Model</span>
                  <div class="model-pills">
                    <button
                      v-for="m in hfModels"
                      :key="m.id"
                      :class="['model-pill', { active: getImageGen(post.id).model === m.id }]"
                      @click="getImageGen(post.id).model = m.id"
                    >
                      <span class="model-name">{{ m.name }}</span>
                      <span class="model-desc">{{ m.description }}</span>
                    </button>
                  </div>
                </div>

                <!-- Aspect ratio -->
                <div class="field-group">
                  <span class="label">Aspect Ratio</span>
                  <div class="ratio-pills">
                    <button
                      v-for="r in ASPECT_RATIOS"
                      :key="r"
                      :class="['ratio-pill', { active: getImageGen(post.id).aspectRatio === r }]"
                      @click="getImageGen(post.id).aspectRatio = r"
                    >
                      {{ r }}
                    </button>
                  </div>
                </div>

                <!-- Image prompt -->
                <div class="field-group">
                  <div class="label-row">
                    <span class="label">Image Prompt</span>
                    <button class="reprompt-btn" :disabled="getImageGen(post.id).loadingPrompt" @click="autoGeneratePrompt(post)">
                      {{ getImageGen(post.id).loadingPrompt ? 'Generating...' : '↺ Re-generate prompt' }}
                    </button>
                  </div>
                  <textarea
                    class="feedback-input"
                    v-model="getImageGen(post.id).prompt"
                    :placeholder="getImageGen(post.id).loadingPrompt ? 'Generating image prompt...' : 'Describe the image you want...'"
                    rows="3"
                  />
                </div>

                <!-- Error -->
                <div v-if="getImageGen(post.id).error" class="image-error">
                  ⚠ {{ getImageGen(post.id).error }}
                </div>

                <!-- Generate button -->
                <button
                  class="generate-image-btn"
                  :disabled="!getImageGen(post.id).prompt.trim() || getImageGen(post.id).loadingImage || getImageGen(post.id).loadingPrompt"
                  @click="runImageGeneration(post)"
                >
                  <span v-if="getImageGen(post.id).loadingImage" class="spin">⟳</span>
                  {{ getImageGen(post.id).loadingImage ? 'Generating...' : '🎨 Generate' }}
                </button>

                <!-- Result -->
                <div v-if="getImageGen(post.id).imageUrl" class="image-result">
                  <img :src="getImageGen(post.id).imageUrl" alt="Generated image" class="result-img" />
                  <a :href="getImageGen(post.id).imageUrl" target="_blank" download class="download-btn">
                    ↓ Download
                  </a>
                </div>
              </div>
            </section>

            <div class="divider" />

            <!-- Score & Feedback — per selected version -->
            <section class="review-section">
              <div class="section-header">
                <h3 class="section-title">
                  Review
                  <span class="section-sub">— v{{ getSelectedVersion(post).versionNumber }}</span>
                </h3>
                <span v-if="isVersionLocked(post, getSelectedVersion(post))" class="locked-badge">
                  🔒 Locked — used for regeneration
                </span>
              </div>

              <!-- Locked: read-only display -->
              <template v-if="isVersionLocked(post, getSelectedVersion(post))">
                <div class="score-row">
                  <span class="label">Score</span>
                  <span
                    v-if="getSelectedVersion(post).score !== null"
                    :class="['score-readonly', scoreColor(getSelectedVersion(post).score)]"
                  >
                    {{ getSelectedVersion(post).score }}/10
                  </span>
                  <span v-else class="score-empty">Not scored</span>
                </div>
                <div v-if="getSelectedVersion(post).feedback" class="field-group">
                  <span class="label">Feedback</span>
                  <div class="feedback-readonly">{{ getSelectedVersion(post).feedback }}</div>
                </div>
                <div v-else class="feedback-empty">No feedback recorded</div>
              </template>

              <!-- Editable -->
              <template v-else>
                <div class="score-row">
                  <span class="label">Score (1–10)</span>
                  <div class="score-buttons">
                    <button
                      v-for="n in 10"
                      :key="n"
                      :class="['score-btn', { selected: getLocalScore(post.id, getSelectedVersion(post).versionNumber).score === n }, scoreColor(n)]"
                      @click="getLocalScore(post.id, getSelectedVersion(post).versionNumber).score = n"
                    >
                      {{ n }}
                    </button>
                  </div>
                </div>

                <div class="field-group">
                  <label class="label">What was wrong / what to improve</label>
                  <textarea
                    class="feedback-input"
                    v-model="getLocalScore(post.id, getSelectedVersion(post).versionNumber).feedback"
                    placeholder="เช่น โทนดูเป็นทางการเกินไป, Hook ยังไม่ดึงดูด, ควรมีตัวอย่างการใช้งานจริง..."
                    rows="3"
                  />
                </div>

                <button
                  class="save-btn"
                  :disabled="getLocalScore(post.id, getSelectedVersion(post).versionNumber).score === null || saving === post.id"
                  @click="saveReview(post)"
                >
                  {{ saving === post.id ? 'Saving...' : 'Save Review' }}
                </button>
              </template>
            </section>

            <div class="divider" />

            <!-- Final Version -->
            <section class="review-section">
              <h3 class="section-title">
                Final Version
                <span class="section-sub">— the post you actually publish</span>
              </h3>
              <p class="helper-text">
                Edit any version into your final post. Finalized posts become style references for future generations.
              </p>
              <textarea
                class="final-input"
                v-model="localFinals[post.id]"
                @focus="getLocalFinal(post)"
                :placeholder="getSelectedVersion(post).text"
                rows="12"
              />
              <div class="finalize-row">
                <span v-if="post.status === 'finalized'" class="finalized-badge">✓ Finalized — used as style reference</span>
                <button
                  class="finalize-btn"
                  :disabled="!getLocalFinal(post).trim() || saving === post.id"
                  @click="finalize(post)"
                >
                  {{ saving === post.id ? 'Saving...' : post.status === 'finalized' ? '↺ Update Final Version' : '✓ Finalize Post' }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f0f5f4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1b2a27;
}

.header { background: #0a6b5e; padding: 0 24px; }
.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand { display: flex; align-items: center; gap: 12px; }
.brand-logo {
  width: 38px; height: 38px;
  background: rgba(255,255,255,0.18);
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 13px; color: white;
}
.brand-name { margin: 0; font-size: 17px; font-weight: 700; color: white; }
.brand-sub { margin: 0; font-size: 12px; color: rgba(255,255,255,0.72); }
.nav-btn {
  padding: 8px 16px;
  background: rgba(255,255,255,0.15);
  color: white; border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.nav-btn:hover { background: rgba(255,255,255,0.25); }

.main { max-width: 1100px; margin: 0 auto; padding: 24px 24px 48px; }

.filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border: 1.5px solid #d0e6e2; border-radius: 20px;
  background: white; font-size: 13px; font-weight: 500; color: #4d7a73; cursor: pointer;
}
.filter-btn:hover { border-color: #0a6b5e; color: #0a6b5e; }
.filter-btn.active { background: #0a6b5e; border-color: #0a6b5e; color: white; }
.filter-count {
  background: rgba(0,0,0,0.1); border-radius: 10px;
  padding: 1px 6px; font-size: 11px; font-weight: 700;
}
.filter-btn.active .filter-count { background: rgba(255,255,255,0.25); }

.empty-state { text-align: center; padding: 80px 0; color: #4d7a73; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state h3 { margin: 0 0 8px; font-size: 20px; color: #1b2a27; }
.empty-state p { margin: 0 0 20px; font-size: 14px; }
.go-btn {
  padding: 10px 24px; background: #0a6b5e; color: white;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
}

.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-card {
  background: white; border: 1.5px solid #d0e6e2;
  border-radius: 12px; overflow: hidden;
}
.post-card.expanded { border-color: #0a6b5e; }

.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; cursor: pointer; gap: 12px; flex-wrap: wrap;
}
.card-header:hover { background: #f8fcfb; }
.card-meta { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.chip {
  font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: 10px;
}
.chip-product { background: #e8f4f2; color: #0a6b5e; }
.chip-type    { background: #eff6ff; color: #1e40af; }
.chip-angle   { background: #f5f3ff; color: #6d28d9; }
.chip-versions{ background: #f1f5f4; color: #4d7a73; }
.card-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.date-text { font-size: 11px; color: #85a89f; }
.status-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 10px; }
.badge-draft    { background: #fef3c7; color: #92400e; }
.badge-reviewed { background: #dbeafe; color: #1e40af; }
.badge-final    { background: #dcfce7; color: #166534; }
.score-chip { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 8px; }
.expand-icon { font-size: 10px; color: #85a89f; }

.card-body {
  border-top: 1px solid #e8f0ee;
  padding: 22px 22px 26px;
  display: flex; flex-direction: column;
}
.divider { height: 1px; background: #e8f0ee; margin: 22px 0; }
.review-section { display: flex; flex-direction: column; gap: 12px; }

.section-header {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.section-title {
  margin: 0; font-size: 13px; font-weight: 700;
  color: #1b2a27; text-transform: uppercase; letter-spacing: 0.06em;
}
.section-sub {
  font-weight: 400; text-transform: none; letter-spacing: 0;
  color: #85a89f; font-size: 12px;
}

/* Version tabs */
.version-tabs { display: flex; gap: 5px; flex-wrap: wrap; }
.version-tab {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 6px; border: 1.5px solid #d0e6e2;
  background: white; font-size: 12px; font-weight: 600;
  color: #4d7a73; cursor: pointer; transition: all 0.12s;
}
.version-tab:hover { border-color: #0a6b5e; color: #0a6b5e; }
.version-tab.active { background: #0a6b5e; border-color: #0a6b5e; color: white; }
.version-tab.active .vtab-score { color: rgba(255,255,255,0.85); }
.vtab-score { font-size: 10px; font-weight: 700; opacity: 0.8; }

/* Post text */
.post-text {
  background: #f8fcfb; border: 1px solid #d0e6e2; border-radius: 8px;
  padding: 14px 16px; font-size: 13.5px; line-height: 1.75;
  color: #1b2a27; white-space: pre-wrap; word-break: break-word;
  font-family: inherit; margin: 0;
}
.post-text.readonly { user-select: text; }
.post-text.streaming { border-color: #0a6b5e; background: #f0faf8; }

/* Regen state */
.regen-state { display: flex; flex-direction: column; gap: 8px; }
.regen-label {
  font-size: 12px; font-weight: 600; color: #0a6b5e;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.cursor {
  display: inline-block; color: #0a6b5e; font-weight: 700;
  animation: blink 0.75s step-end infinite;
}
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

/* Regenerate button */
.regen-history-btn {
  align-self: flex-start;
  padding: 8px 16px;
  background: white; color: #6d28d9;
  border: 1.5px solid #c4b5fd; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.regen-history-btn:hover:not(:disabled) { background: #f5f3ff; border-color: #a78bfa; }
.regen-history-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Score */
.score-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.label { font-size: 12px; font-weight: 600; color: #4d7a73; white-space: nowrap; }
.score-buttons { display: flex; gap: 5px; flex-wrap: wrap; }
.score-btn {
  width: 34px; height: 34px; border-radius: 8px;
  border: 1.5px solid #d0e6e2; background: white;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.12s;
}
.score-btn.selected { color: white; border-color: transparent; }
.score-low  { color: #dc2626; }
.score-mid  { color: #d97706; }
.score-good { color: #16a34a; }
.score-great{ color: #0a6b5e; }
.score-btn.selected.score-low  { background: #dc2626; }
.score-btn.selected.score-mid  { background: #d97706; }
.score-btn.selected.score-good { background: #16a34a; }
.score-btn.selected.score-great{ background: #0a6b5e; }
.score-chip.score-low  { background: #fee2e2; color: #dc2626; }
.score-chip.score-mid  { background: #fef3c7; color: #d97706; }
.score-chip.score-good { background: #dcfce7; color: #16a34a; }
.score-chip.score-great{ background: #e8f4f2; color: #0a6b5e; }

.locked-badge {
  font-size: 11px; font-weight: 600;
  color: #92400e; background: #fef3c7;
  padding: 4px 10px; border-radius: 8px;
}
.score-readonly {
  font-size: 15px; font-weight: 700; padding: 4px 10px;
  border-radius: 8px; background: #f1f5f4;
}
.score-readonly.score-low  { background: #fee2e2; color: #dc2626; }
.score-readonly.score-mid  { background: #fef3c7; color: #d97706; }
.score-readonly.score-good { background: #dcfce7; color: #16a34a; }
.score-readonly.score-great{ background: #e8f4f2; color: #0a6b5e; }
.score-empty { font-size: 13px; color: #85a89f; font-style: italic; }
.feedback-readonly {
  padding: 10px 12px; background: #f8fcfb;
  border: 1px solid #d0e6e2; border-radius: 8px;
  font-size: 13.5px; line-height: 1.6; color: #1b2a27;
  white-space: pre-wrap;
}
.feedback-empty { font-size: 13px; color: #85a89f; font-style: italic; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.feedback-input, .final-input {
  width: 100%; padding: 10px 12px;
  border: 1.5px solid #d0e6e2; border-radius: 8px;
  font-size: 13.5px; font-family: inherit; line-height: 1.7;
  color: #1b2a27; resize: vertical; outline: none; box-sizing: border-box;
}
.feedback-input:focus, .final-input:focus {
  border-color: #0a6b5e;
  box-shadow: 0 0 0 3px rgba(10, 107, 94, 0.08);
}
.helper-text { margin: 0; font-size: 12px; color: #85a89f; line-height: 1.5; }

.save-btn {
  align-self: flex-start; padding: 9px 20px;
  background: #1e40af; color: white; border: none;
  border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.save-btn:hover:not(:disabled) { background: #1d3a8a; }
.save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.finalize-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.finalize-btn {
  padding: 10px 22px; background: #0a6b5e; color: white;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.finalize-btn:hover:not(:disabled) { background: #085748; }
.finalize-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.finalized-badge {
  font-size: 12px; font-weight: 600; color: #166534;
  background: #dcfce7; padding: 5px 12px; border-radius: 8px;
}

/* ── Image generation ── */
.image-gen-btn {
  align-self: flex-start;
  padding: 8px 16px;
  background: white; color: #7c3aed;
  border: 1.5px solid #ddd6fe; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.image-gen-btn:hover { background: #f5f3ff; border-color: #a78bfa; }
.image-gen-btn.active { background: #f5f3ff; border-color: #7c3aed; }

.image-panel {
  display: flex; flex-direction: column; gap: 14px;
  padding: 18px; background: #faf8ff;
  border: 1.5px solid #ddd6fe; border-radius: 10px;
}

.model-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.model-pill {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 8px 14px; border-radius: 10px;
  border: 1.5px solid #ddd6fe; background: white;
  cursor: pointer; transition: all 0.12s; text-align: left;
}
.model-pill:hover { border-color: #7c3aed; background: #f5f3ff; }
.model-pill.active { background: #7c3aed; border-color: #7c3aed; }
.model-name { font-size: 12px; font-weight: 700; color: #7c3aed; line-height: 1.3; }
.model-pill.active .model-name { color: white; }
.model-desc { font-size: 10px; font-weight: 400; color: #a78bfa; line-height: 1.3; margin-top: 2px; }
.model-pill.active .model-desc { color: rgba(255,255,255,0.75); }

.ratio-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.ratio-pill {
  padding: 5px 12px; border-radius: 20px;
  border: 1.5px solid #ddd6fe; background: white;
  font-size: 12px; font-weight: 600; color: #7c3aed; cursor: pointer; transition: all 0.12s;
}
.ratio-pill:hover { border-color: #7c3aed; background: #f5f3ff; }
.ratio-pill.active { background: #7c3aed; border-color: #7c3aed; color: white; }

.label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.reprompt-btn {
  font-size: 11px; font-weight: 600; color: #7c3aed;
  background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline;
}
.reprompt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.image-error {
  font-size: 12px; color: #dc2626;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; padding: 8px 12px;
}

.generate-image-btn {
  align-self: flex-start;
  padding: 10px 22px; background: #7c3aed; color: white;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; gap: 7px; transition: background 0.15s;
}
.generate-image-btn:hover:not(:disabled) { background: #6d28d9; }
.generate-image-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.spin { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.image-result {
  display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
}
.result-img {
  max-width: 100%; max-height: 480px;
  border-radius: 10px; border: 1px solid #ddd6fe;
  object-fit: contain;
}
.download-btn {
  padding: 8px 18px; background: #7c3aed; color: white;
  border-radius: 8px; font-size: 13px; font-weight: 600;
  text-decoration: none; transition: background 0.15s; display: inline-block;
}
.download-btn:hover { background: #6d28d9; }

.saved-image-block {
  margin-top: 14px; display: flex; flex-direction: column; gap: 8px;
  border-top: 1px solid #ede9fe; padding-top: 14px;
}
.saved-img {
  max-width: 100%; max-height: 400px; border-radius: 10px;
  border: 1px solid #ddd6fe; object-fit: contain;
}
.saved-img-meta {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.saved-img-label {
  font-size: 12px; color: #7c3aed; font-weight: 600;
  background: #f5f3ff; padding: 3px 10px; border-radius: 20px;
}
.saved-img-prompt {
  font-size: 12px; color: #6b7280; font-style: italic;
  margin: 0; line-height: 1.5;
}
</style>
