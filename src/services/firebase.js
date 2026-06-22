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
  limit,
  serverTimestamp,
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

export async function updatePost(id, updates) {
  await updateDoc(doc(db, 'posts', id), { ...updates, updatedAt: serverTimestamp() })
}

export async function fetchPosts() {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Fetch context for few-shot prompting.
// Returns finalized style examples + scored review signals.
// Prefers same postType+angle; falls back to any matching status.
export async function fetchExamples({ postTypeId, angleId }) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30))
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => d.data())

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
