const BASE = '/api/higgsfield'

export async function checkHiggsfieldStatus() {
  const res = await fetch(`${BASE}/status`)
  if (!res.ok) return { authenticated: false }
  return res.json()
}

export async function generateImage({ model, prompt, aspectRatio = '1:1' }) {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, aspectRatio }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Image generation failed')
  return data
}
