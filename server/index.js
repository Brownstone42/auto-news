import express from 'express'
import { spawn } from 'child_process'

const app = express()
app.use(express.json())

// higgsfield.cmd is just a thin wrapper around hf.exe — call hf directly for cleaner output
const HF = process.platform === 'win32' ? 'hf.exe' : 'higgsfield'

// Hardcoded T2I fallback in case `higgsfield model list` output can't be parsed
const FALLBACK_MODELS = [
  { id: 'nano_banana_2', name: 'Nano Banana 2', description: 'Best overall · Cheapest credits · #1 benchmark' },
  { id: 'gpt_image_2',   name: 'GPT Image 2',   description: 'Best instruction-following · Premium quality' },
  { id: 'seedream',      name: 'Seedream',       description: 'Best artistic style · Low cost · Unlimited on Plus' },
  { id: 'flux_2',        name: 'FLUX 2',         description: 'Fast & reliable · Low cost · Unlimited on Plus' },
  { id: 'soul_v2',       name: 'Soul V2',        description: 'Best for people & portraits · Mid cost' },
]

function runCLI(args, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    // shell: false so Node passes each arg as-is — no shell quoting mangling for prompt text
    const proc = spawn(HF, args, { shell: false })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    const timer = setTimeout(() => { proc.kill(); reject(new Error('CLI timeout')) }, timeoutMs)
    proc.on('close', (code) => {
      clearTimeout(timer)
      const combined = stdout + '\n' + stderr
      if (code === 0) resolve(combined)
      else reject(new Error(combined.trim() || `Exit code ${code}`))
    })
    proc.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

// The CLI mixes progress noise with multi-line JSON — extract fields by regex.
function extractField(raw, field) {
  const m = raw.match(new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`))
  return m ? m[1] : null
}

// Check if the user is authenticated
app.get('/api/higgsfield/status', async (_req, res) => {
  try {
    await runCLI(['auth', 'status'])
    res.json({ authenticated: true })
  } catch {
    res.json({ authenticated: false, hint: 'Run: higgsfield auth login' })
  }
})

// Always return the 5 curated T2I models
app.get('/api/higgsfield/models', (_req, res) => {
  res.json({ models: FALLBACK_MODELS })
})

// Generate an image in one step:
//   hf --json generate create <model> --prompt "..." --aspect_ratio <r> --wait
//
// IMPORTANT details discovered from the real CLI:
//   - `--json` is a GLOBAL flag and MUST come before the subcommand, otherwise the
//     CLI renders an interactive terminal UI (hence the old "[LAPTOP-...]" garbage).
//   - Model params use UNDERSCORES: it's `--aspect_ratio`, not `--aspect-ratio`.
//   - With `--wait`, `create` returns a JSON array of completed job objects:
//       [ { "id": "...", "status": "completed", "result_url": "https://...", ... } ]
//   - The image URL lives in the `result_url` field.
app.post('/api/higgsfield/generate', async (req, res) => {
  const { model, prompt, aspectRatio = '1:1' } = req.body
  if (!model || !prompt) return res.status(400).json({ error: 'model and prompt are required' })

  try {
    // Submit + wait in one call (up to 3 min). --json first, then subcommand, then params.
    const out = await runCLI(
      [
        '--json',
        'generate', 'create', model,
        '--prompt', prompt,
        '--aspect_ratio', aspectRatio,
        '--wait',
      ],
      180000,
    )
    console.log('[HF generate] raw:', out)

    const status = extractField(out, 'status')
    if (status && status !== 'completed') throw new Error(`Job did not complete (status: ${status})`)

    const imageUrl = extractField(out, 'result_url')
    if (!imageUrl) throw new Error(`No result_url in CLI output: ${out.slice(0, 400)}`)

    const jobId = extractField(out, 'id')
    res.json({ imageUrl, jobId })
  } catch (err) {
    console.error('[HF generate] error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

const PORT = 3001
app.listen(PORT, () => console.log(`Higgsfield proxy running on http://localhost:${PORT}`))
