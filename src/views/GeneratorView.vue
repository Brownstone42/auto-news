<script setup>
import { ref, computed } from 'vue'
import { products } from '@/data/products'
import { postTypes } from '@/data/topics'
import { generatePost } from '@/services/openai'

const selectedId = ref('')
const selectedTypeId = ref('')
const selectedAngleId = ref('')
const outputText = ref('')
const isGenerating = ref(false)
const errorMsg = ref('')
const copied = ref(false)

const selectedProduct = computed(() => products.find((p) => p.id === selectedId.value) ?? null)
const selectedType = computed(() => postTypes.find((t) => t.id === selectedTypeId.value) ?? null)
const selectedAngle = computed(
  () => selectedType.value?.angles.find((a) => a.id === selectedAngleId.value) ?? null,
)

const canGenerate = computed(
  () => selectedProduct.value && selectedType.value && selectedAngle.value && !isGenerating.value,
)

const groupedProducts = computed(() => {
  const groups = {}
  for (const p of products) {
    if (!groups[p.group]) groups[p.group] = []
    groups[p.group].push(p)
  }
  return groups
})

const outputParts = computed(() => {
  if (!outputText.value) return { body: '', hashtags: '' }
  const sepIdx = outputText.value.indexOf('─')
  if (sepIdx === -1) return { body: outputText.value, hashtags: '' }
  return {
    body: outputText.value.slice(0, sepIdx).trim(),
    hashtags: outputText.value.slice(sepIdx).replace(/─+/g, '').trim(),
  }
})

function selectType(typeId) {
  selectedTypeId.value = typeId
  selectedAngleId.value = ''
}

async function generate() {
  if (!canGenerate.value) return
  outputText.value = ''
  errorMsg.value = ''
  isGenerating.value = true
  try {
    await generatePost(selectedProduct.value, selectedType.value, selectedAngle.value, (chunk) => {
      outputText.value += chunk
    })
  } catch (err) {
    errorMsg.value = err.message || 'Generation failed. Check your API key in .env'
  } finally {
    isGenerating.value = false
  }
}

async function copyPost() {
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    errorMsg.value = 'Failed to copy — try selecting and copying manually'
  }
}

function formatSales(n) {
  return `฿${(n / 1_000_000).toFixed(2)}M`
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">IG</div>
          <div>
            <h1 class="brand-name">Idealglobe Content Generator</h1>
            <p class="brand-sub">Generate Thai Facebook posts for your top products</p>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <!-- Left: Controls -->
      <aside class="panel-left">
        <!-- Step 1 -->
        <section class="panel-section">
          <h2 class="section-title"><span class="step">1</span> Select Product</h2>
          <select class="product-select" v-model="selectedId">
            <option value="">Choose a product...</option>
            <optgroup v-for="(prods, group) in groupedProducts" :key="group" :label="group">
              <option v-for="p in prods" :key="p.id" :value="p.id">
                #{{ p.rank }} · {{ p.name }}{{ p.onShopee ? ' 🛒' : '' }}
              </option>
            </optgroup>
          </select>
          <div v-if="selectedProduct" class="product-card">
            <span class="product-rank">#{{ selectedProduct.rank }}</span>
            <span class="product-name-text">{{ selectedProduct.name }}</span>
            <span :class="['shopee-badge', selectedProduct.onShopee ? 'shopee-yes' : 'shopee-no']">
              {{ selectedProduct.onShopee ? 'Shopee ✓' : 'Inquiry only' }}
            </span>
            <span class="sales-text">{{ formatSales(selectedProduct.sales) }}</span>
          </div>
        </section>

        <!-- Step 2 -->
        <section class="panel-section">
          <h2 class="section-title"><span class="step">2</span> Post Type</h2>
          <div class="type-grid">
            <button
              v-for="type in postTypes"
              :key="type.id"
              :class="['type-card', { active: selectedTypeId === type.id }]"
              @click="selectType(type.id)"
            >
              <span class="type-icon">{{ type.icon }}</span>
              <span class="type-label">{{ type.label }}</span>
              <span class="type-desc">{{ type.description }}</span>
            </button>
          </div>
        </section>

        <!-- Step 3 -->
        <section v-if="selectedType" class="panel-section">
          <h2 class="section-title"><span class="step">3</span> Content Angle</h2>
          <div class="angle-list">
            <label
              v-for="angle in selectedType.angles"
              :key="angle.id"
              :class="['angle-item', { active: selectedAngleId === angle.id }]"
            >
              <input type="radio" :value="angle.id" v-model="selectedAngleId" class="sr-only" />
              <span class="angle-dot" :class="{ 'angle-dot-active': selectedAngleId === angle.id }" />
              <span class="angle-label">{{ angle.label }}</span>
            </label>
          </div>
        </section>

        <button class="generate-btn" :disabled="!canGenerate" @click="generate">
          <span v-if="isGenerating" class="spin">⟳</span>
          {{ isGenerating ? 'Generating...' : 'Generate Post' }}
        </button>
      </aside>

      <!-- Right: Output -->
      <section class="panel-right">
        <!-- Empty state -->
        <div v-if="!outputText && !isGenerating && !errorMsg" class="empty-state">
          <div class="empty-icon">✍️</div>
          <h3>Ready to generate</h3>
          <p>Pick a product, post type, and content angle — then click Generate.</p>
          <div class="tip-box">
            <strong>Tip:</strong> 🛒 products get a Shopee CTA, others get an Inbox CTA automatically.
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="errorMsg && !isGenerating" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p class="error-text">{{ errorMsg }}</p>
          <button class="retry-btn" @click="generate" :disabled="!canGenerate">Try Again</button>
        </div>

        <!-- Output -->
        <div v-else class="output-area">
          <div class="output-meta">
            <span v-if="selectedProduct" class="meta-chip product-chip">{{ selectedProduct.name }}</span>
            <span v-if="selectedType" class="meta-chip type-chip">{{ selectedType.icon }} {{ selectedType.label }}</span>
            <span v-if="selectedAngle" class="meta-chip angle-chip">{{ selectedAngle.label }}</span>
          </div>

          <div class="post-card">
            <div class="post-header">
              <div class="post-avatar">IG</div>
              <div>
                <div class="post-author">Idealglobe</div>
                <div class="post-handle">@idealglobe · Facebook</div>
              </div>
            </div>
            <div class="post-body">
              <span class="post-text">{{ outputParts.body }}</span>
              <span v-if="isGenerating && !outputParts.hashtags" class="cursor">|</span>
            </div>
            <div v-if="outputParts.hashtags || (isGenerating && outputParts.body)" class="post-hashtags">
              <span v-if="outputParts.hashtags">{{ outputParts.hashtags }}</span>
              <span v-if="isGenerating && outputParts.body && !outputParts.hashtags" class="cursor">|</span>
            </div>
          </div>

          <div v-if="!isGenerating && outputText" class="output-actions">
            <button class="copy-btn" @click="copyPost" :class="{ copied }">
              {{ copied ? '✓ Copied!' : '📋 Copy Post' }}
            </button>
            <button class="regen-btn" @click="generate">↺ Regenerate</button>
          </div>
        </div>
      </section>
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

/* ── Header ── */
.header {
  background: #0a6b5e;
  padding: 0 24px;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 14px 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
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
  border-right: 1px solid #d0e6e2;
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
  color: #4d7a73;
  display: flex;
  align-items: center;
  gap: 7px;
}
.step {
  width: 18px;
  height: 18px;
  background: #0a6b5e;
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
  border: 1px solid #c5ddd8;
  border-radius: 8px;
  font-size: 13.5px;
  color: #1b2a27;
  background: white;
  cursor: pointer;
  outline: none;
  appearance: auto;
}
.product-select:focus {
  border-color: #0a6b5e;
  box-shadow: 0 0 0 3px rgba(10, 107, 94, 0.1);
}
.product-card {
  background: #e8f4f2;
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
  color: #0a6b5e;
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
  color: #4d7a73;
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
  border: 1.5px solid #d0e6e2;
  border-radius: 9px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.type-card:hover {
  border-color: #0a6b5e;
  background: #f0faf8;
}
.type-card.active {
  border-color: #0a6b5e;
  background: #e8f4f2;
  box-shadow: 0 0 0 2px rgba(10, 107, 94, 0.15);
}
.type-icon {
  font-size: 15px;
  line-height: 1;
  margin-bottom: 2px;
}
.type-label {
  font-size: 12px;
  font-weight: 600;
  color: #1b2a27;
}
.type-desc {
  font-size: 10px;
  color: #85a89f;
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
  border: 1.5px solid #d0e6e2;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.angle-item:hover {
  border-color: #0a6b5e;
  background: #f0faf8;
}
.angle-item.active {
  border-color: #0a6b5e;
  background: #e8f4f2;
}
.angle-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #c5ddd8;
  flex-shrink: 0;
  transition: all 0.15s;
}
.angle-dot-active {
  border-color: #0a6b5e;
  background: #0a6b5e;
  box-shadow: inset 0 0 0 2px white;
}
.angle-label {
  font-size: 13px;
  color: #1b2a27;
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
  background: #0a6b5e;
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
  background: #085748;
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
  color: #4d7a73;
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
  color: #1b2a27;
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
  background: #e8f4f2;
  border-radius: 8px;
  font-size: 13px;
  color: #1b2a27;
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
  background: #0a6b5e;
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
  background: #e8f4f2;
  color: #0a6b5e;
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
  border: 1px solid #d0e6e2;
  border-radius: 12px;
  overflow: hidden;
}
.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f0f5f4;
}
.post-avatar {
  width: 36px;
  height: 36px;
  background: #0a6b5e;
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
  color: #1b2a27;
}
.post-handle {
  font-size: 11px;
  color: #85a89f;
}
.post-body {
  padding: 14px 16px;
  font-size: 14.5px;
  line-height: 1.75;
  color: #1b2a27;
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
  color: #0a6b5e;
  font-weight: 500;
  white-space: pre-wrap;
  border-top: 1px solid #f0f5f4;
}
.cursor {
  display: inline-block;
  color: #0a6b5e;
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
  background: #0a6b5e;
  color: white;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.copy-btn:hover {
  background: #085748;
}
.copy-btn.copied {
  background: #16a34a;
}
.regen-btn {
  padding: 11px 16px;
  background: transparent;
  color: #4d7a73;
  border: 1.5px solid #d0e6e2;
  border-radius: 9px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.regen-btn:hover {
  border-color: #0a6b5e;
  color: #0a6b5e;
}
</style>
