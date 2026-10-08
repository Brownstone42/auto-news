import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const records = new Map()
let failWrites = false
let counter = 0
const snap = ref => ({ exists: () => records.has(ref.id), data: () => records.get(ref.id) })
globalThis.horoscopeFirestore = {
  initializeApp: () => ({}), getFirestore: () => ({}), collection: (_, name) => name,
  doc: (_, collection, id) => ({ collection, id, key: collection === 'posts' ? id : `${collection}/${id}` }), serverTimestamp: () => new Date(),
  orderBy: () => ({}), query: collection => collection,
  Timestamp: { fromDate: date => date },
  addDoc: async (_, data) => { if (failWrites) throw new Error('write failed'); const id = `new-${++counter}`; records.set(id, data); return { id } },
  updateDoc: async (ref, data) => { if (failWrites) throw new Error('write failed'); records.set(ref.id, { ...records.get(ref.id), ...data }) },
  getDoc: async ref => snap(ref),
  getDocs: async () => ({ docs: [...records].map(([id, data]) => ({ id, data: () => data })) }),
  runTransaction: async (_, action) => action({ get: async ref => snap({ id: ref.key }), set: (ref, data) => { if (failWrites) throw new Error('write failed'); records.set(ref.key, data) }, delete: ref => { if (failWrites) throw new Error('write failed'); records.delete(ref.key) } }),
}
const source = (await readFile(new URL('../src/services/firebase.js', import.meta.url), 'utf8'))
  .replace(/import \{ initializeApp \} from 'firebase\/app'/, 'const { initializeApp } = globalThis.horoscopeFirestore')
  .replace(/import \{([\s\S]*?)\} from 'firebase\/firestore'/, 'const {$1} = globalThis.horoscopeFirestore')
  .replaceAll(/import\.meta\.env\.VITE_[A-Z_]+/g, "'test-config'")
const db = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))

test('education and prediction share database history without ratings or Idealglobe leakage', async () => {
  records.clear()
  records.set('ideal', { aiGenerated: 'product', status: 'finalized', finalVersion: 'product example' })
  const education = await db.saveHoroscopePost({ kind: 'education', selection: { science: 'tarot', optional: undefined }, output: 'education draft' })
  const prediction = await db.saveHoroscopePost({ kind: 'prediction', selection: { format: 'forecast', date: '2026-10-08' }, output: 'forecast draft', calculation: { method: { version: 'v1' }, promptData: { groups: [] }, days: ['raw samples'] } })
  assert.equal((await db.fetchHoroscopePosts()).length, 2)
  assert.deepEqual((await db.fetchPosts()).map(item => item.id), ['ideal'])
  assert.deepEqual((await db.fetchExamples({})).finalized, ['product example'])
  for (const id of [education, prediction]) {
    const record = records.get(id)
    for (const key of ['score', 'feedback', 'versions', 'rating']) assert.ok(!(key in record))
    assert.equal(record.business, 'horoscope')
  }
  assert.ok(!('days' in records.get(prediction).calculation))
  assert.ok(!('optional' in records.get(education).selection))
  await db.saveHoroscopePost({ id: prediction, kind: 'prediction', selection: { changed: true }, output: 'edited forecast' })
  assert.equal(records.get(prediction).aiGenerated, 'forecast draft')
  assert.equal(records.get(prediction).output, 'edited forecast')
  assert.equal(records.get(prediction).selection.format, 'forecast')
  await assert.rejects(() => db.saveHoroscopePost({ id: 'ideal', kind: 'education', selection: {}, output: 'wrong' }))
  assert.equal(records.get('ideal').aiGenerated, 'product')
})
test('legacy imports are idempotent and do not overwrite edited cloud posts', async () => {
  const old = { id: 'legacy-1', selection: { science: 'tarot' }, output: 'old draft', createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z' }
  await db.importLegacyHoroscopePosts([old])
  const id = 'horoscope_legacy_legacy-1'
  assert.equal(records.get(id).kind, 'education')
  await db.saveHoroscopePost({ id, kind: 'education', selection: old.selection, output: 'cloud edit' })
  await db.importLegacyHoroscopePosts([old])
  assert.equal(records.get(id).output, 'cloud edit')
  const count = records.size
  await db.importLegacyHoroscopePosts([{ ...old, id: 'bad/path' }])
  assert.equal(records.size, count)
})
test('database write failures propagate instead of reporting a successful save', async () => {
  failWrites = true
  await assert.rejects(() => db.saveHoroscopePost({ kind: 'prediction', selection: {}, output: 'new' }), /write failed/)
  failWrites = false
})

test('delete removes horoscope posts, protects other businesses, and prevents legacy resurrection', async () => {
  const id = await db.saveHoroscopePost({ kind: 'prediction', selection: {}, output: 'delete me' })
  failWrites = true
  await assert.rejects(() => db.deleteHoroscopePost(id), /write failed/)
  assert.ok(records.has(id))
  failWrites = false
  await db.deleteHoroscopePost(id)
  assert.ok(!records.has(id))
  await assert.rejects(() => db.deleteHoroscopePost('ideal'), /ไม่ใช่โพสต์ดวง/)
  assert.ok(records.has('ideal'))
  await assert.rejects(() => db.deleteHoroscopePost('bad/path'))
  const legacy = { id: 'delete-legacy', selection: { science: 'tarot' }, output: 'old' }
  await db.importLegacyHoroscopePosts([legacy])
  await db.deleteHoroscopePost('horoscope_legacy_delete-legacy')
  await db.importLegacyHoroscopePosts([legacy])
  assert.ok(!records.has('horoscope_legacy_delete-legacy'))
})
