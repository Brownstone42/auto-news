import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

const db = getFirestore(app)

export async function savePost({ product, postType, angle, aiGenerated, model }) {
  const ref = await addDoc(collection(db, 'posts'), {
    product: { id: product.id, name: product.name, group: product.group },
    postType: { id: postType.id, label: postType.label },
    angle: { id: angle.id, label: angle.label },
    aiGenerated,
    finalVersion: '',
    status: 'generated',
    model,
    versions: [{ versionNumber: 1, text: aiGenerated, score: null, feedback: '', createdAt: new Date().toISOString() }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

// Add a newly generated version to an existing post
export async function addVersion(postId, text) {
  const snap = await getDoc(doc(db, 'posts', postId))
  const data = snap.data()
  const versions = data.versions?.length
    ? data.versions
    : [{ versionNumber: 1, text: data.aiGenerated, score: null, feedback: '', createdAt: null }]
  const nextNumber = Math.max(...versions.map((v) => v.versionNumber)) + 1
  const newVersions = [...versions, { versionNumber: nextNumber, text, score: null, feedback: '', createdAt: new Date().toISOString() }]
  await updateDoc(doc(db, 'posts', postId), { versions: newVersions, updatedAt: serverTimestamp() })
  return { versions: newVersions, nextNumber }
}

// Save score + feedback for a specific version number
export async function updateVersion(postId, versionNumber, { score, feedback }) {
  const snap = await getDoc(doc(db, 'posts', postId))
  const data = snap.data()
  const versions = (
    data.versions?.length
      ? data.versions
      : [{ versionNumber: 1, text: data.aiGenerated, score: null, feedback: '', createdAt: null }]
  ).map((v) => (v.versionNumber === versionNumber ? { ...v, score, feedback } : v))
  const hasScore = versions.some((v) => v.score !== null)
  const status = data.status === 'generated' && hasScore ? 'scored' : data.status
  await updateDoc(doc(db, 'posts', postId), { versions, status, updatedAt: serverTimestamp() })
  return { versions, status }
}

// Save generated image data onto a specific version
export async function saveVersionImage(postId, versionNumber, { url, prompt, model, aspectRatio }) {
  const snap = await getDoc(doc(db, 'posts', postId))
  const data = snap.data()
  const versions = (
    data.versions?.length
      ? data.versions
      : [{ versionNumber: 1, text: data.aiGenerated, score: null, feedback: '', createdAt: null }]
  ).map((v) =>
    v.versionNumber === versionNumber
      ? { ...v, image: { url, prompt, model, aspectRatio, savedAt: new Date().toISOString() } }
      : v
  )
  await updateDoc(doc(db, 'posts', postId), { versions, updatedAt: serverTimestamp() })
  return versions
}

export async function updatePost(id, updates) {
  await updateDoc(doc(db, 'posts', id), { ...updates, updatedAt: serverTimestamp() })
}

export async function fetchPosts() {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(post => post.business !== 'horoscope')
}

// Fetch context for few-shot prompting.
// Returns finalized style examples + scored review signals.
// Prefers same postType+angle; falls back to any matching status.
export async function fetchExamples({ postTypeId, angleId }) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => d.data()).filter(post => post.business !== 'horoscope').slice(0, 30)

  const sameAngle = (d) => d.postType?.id === postTypeId && d.angle?.id === angleId

  // Finalized posts — prefer same angle, fall back to any
  const finalizedSame = all.filter((d) => d.status === 'finalized' && d.finalVersion && sameAngle(d)).map((d) => d.finalVersion).slice(0, 2)
  const finalizedAny = all.filter((d) => d.status === 'finalized' && d.finalVersion && !sameAngle(d)).map((d) => d.finalVersion).slice(0, 2 - finalizedSame.length)
  const finalized = [...finalizedSame, ...finalizedAny]

  // Scored posts (not finalized) — carry score + feedback as improvement signal
  const reviewedSame = all.filter((d) => d.status === 'scored' && d.score !== null && sameAngle(d)).map((d) => ({ score: d.score, feedback: d.feedback })).slice(0, 3)
  const reviewedAny = all.filter((d) => d.status === 'scored' && d.score !== null && !sameAngle(d)).map((d) => ({ score: d.score, feedback: d.feedback })).slice(0, 3 - reviewedSame.length)
  const reviewed = [...reviewedSame, ...reviewedAny]

  return { finalized, reviewed }
}

// Horoscope posts share the existing database, with their own business marker.
// No review, rating or scored versions are added to these documents.
const cleanHoroscopeData = value => JSON.parse(JSON.stringify(value))
export async function saveHoroscopePost({ id, kind, selection, output, calculation = null, model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-6-luna' }) {
  if (!['education', 'prediction'].includes(kind) || !selection || !output?.trim()) throw new Error('ข้อมูลโพสต์ดวงไม่ครบ')
  if (id) {
    const target = doc(db, 'posts', id)
    const snap = await getDoc(target)
    if (!snap.exists() || snap.data().business !== 'horoscope') throw new Error('ไม่พบโพสต์ดวงในฐานข้อมูล')
    await updateDoc(target, { output, finalVersion: output, updatedAt: serverTimestamp() })
    return id
  }
  const result = await addDoc(collection(db, 'posts'), {
    business: 'horoscope', kind, selection: cleanHoroscopeData(selection), output,
    aiGenerated: output, finalVersion: '', status: 'generated', model,
    calculation: calculation ? cleanHoroscopeData({ method: calculation.method, promptData: calculation.promptData }) : null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return result.id
}

export async function fetchHoroscopePosts() {
  const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')))
  return snap.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => item.business === 'horoscope')
}

export async function deleteHoroscopePost(id) {
  if (typeof id !== 'string' || !id || id.includes('/')) throw new Error('รหัสโพสต์ดวงไม่ถูกต้อง')
  const target = doc(db, 'posts', id)
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(target)
    if (!snap.exists()) {
      if (id.startsWith('horoscope_legacy_')) transaction.set(doc(db, 'horoscopeDeletedPosts', id), { deletedAt: serverTimestamp() })
      return
    }
    if (snap.data().business !== 'horoscope') throw new Error('ไม่ใช่โพสต์ดวง')
    // Keep a migration marker so another browser cannot re-import a deleted legacy draft.
    if (id.startsWith('horoscope_legacy_')) transaction.set(doc(db, 'horoscopeDeletedPosts', id), { deletedAt: serverTimestamp() })
    transaction.delete(target)
  })
}

export async function importLegacyHoroscopePosts(posts) {
  for (const post of posts) {
    if (typeof post?.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(post.id) || !post.selection || typeof post.output !== 'string' || !post.output.trim()) continue
    const target = doc(db, 'posts', `horoscope_legacy_${post.id}`)
    const timestamp = value => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? serverTimestamp() : Timestamp.fromDate(date)
    }
    await runTransaction(db, async transaction => {
      if ((await transaction.get(doc(db, 'horoscopeDeletedPosts', target.id))).exists()) return
      if ((await transaction.get(target)).exists()) return
      transaction.set(target, {
      business: 'horoscope', kind: 'education', selection: cleanHoroscopeData(post.selection),
      output: post.output, aiGenerated: post.output, finalVersion: '', status: 'generated',
      model: null, calculation: null, legacyId: post.id,
      createdAt: timestamp(post.createdAt), updatedAt: timestamp(post.updatedAt),
      })
    })
  }
}
