import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

const HF_CREDENTIALS = defineSecret('HF_CREDENTIALS')
const MCP_URL = 'https://mcp.higgsfield.ai/mcp'

function setCORS(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
}

// Parse SSE response: "event: message\ndata: {...}\n\n" → parsed JSON
function parseSse(text) {
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      return JSON.parse(line.slice(6))
    }
  }
  throw new Error(`No data line in SSE response: ${text.slice(0, 200)}`)
}

// Call a Higgsfield MCP tool via HTTP
async function mcpCall(creds, toolName, args) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds}`,
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 200)}`)
  const envelope = parseSse(text)
  if (envelope.error) throw new Error(`MCP error: ${JSON.stringify(envelope.error)}`)
  const content = envelope.result
  if (content?.isError) throw new Error(`Tool error: ${content.content?.[0]?.text ?? JSON.stringify(content)}`)
  // Return structuredContent if available, else parse text content
  if (content?.structuredContent) return content.structuredContent
  try { return JSON.parse(content?.content?.[0]?.text ?? '{}') } catch { return content }
}

export const higgsfieldStatus = onRequest(
  { invoker: 'public', secrets: [HF_CREDENTIALS], region: 'asia-southeast1' },
  async (req, res) => {
    setCORS(res)
    if (req.method === 'OPTIONS') return res.status(204).send('')
    try {
      const creds = HF_CREDENTIALS.value()
      if (!creds) return res.json({ authenticated: false })
      // Probe MCP with a cost-check — if it responds without auth error, we're good
      await mcpCall(creds, 'generate_image', {
        params: { model: 'nano_banana_2', prompt: 'test', aspect_ratio: '1:1', get_cost: true },
      })
      res.json({ authenticated: true })
    } catch (err) {
      const authed = !err.message.includes('401') && !err.message.includes('unauthorized')
      res.json({ authenticated: authed })
    }
  }
)

// Test endpoint: full generate + poll flow via MCP
export const higgsfieldModels = onRequest(
  { invoker: 'public', secrets: [HF_CREDENTIALS], timeoutSeconds: 120, region: 'asia-southeast1' },
  async (req, res) => {
    setCORS(res)
    if (req.method === 'OPTIONS') return res.status(204).send('')
    try {
      const creds = HF_CREDENTIALS.value()

      const genData = await mcpCall(creds, 'generate_image', {
        params: { model: 'nano_banana_2', prompt: 'a red apple on white table', aspect_ratio: '1:1' },
      })
      console.log('[HF] generate_image:', JSON.stringify(genData))

      const jobId = genData?.results?.[0]?.id
      if (!jobId) return res.json({ genData, error: 'no job ID' })

      const statusData = await mcpCall(creds, 'job_status', { jobId, sync: true })
      console.log('[HF] job_status:', JSON.stringify(statusData))

      res.json({ genData, statusData })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
)

export const higgsfieldGenerate = onRequest(
  { invoker: 'public', secrets: [HF_CREDENTIALS], timeoutSeconds: 300, region: 'asia-southeast1' },
  async (req, res) => {
    setCORS(res)
    if (req.method === 'OPTIONS') return res.status(204).send('')
    const { model, prompt, aspectRatio = '1:1' } = req.body
    if (!model || !prompt) return res.status(400).json({ error: 'model and prompt are required' })

    try {
      const creds = HF_CREDENTIALS.value()
      console.log(`[HF] generate model=${model} aspectRatio=${aspectRatio}`)

      // Submit generation via MCP
      const genData = await mcpCall(creds, 'generate_image', {
        params: { model, prompt, aspect_ratio: aspectRatio },
      })
      console.log('[HF] submitted:', JSON.stringify(genData))

      const jobId = genData?.results?.[0]?.id
      if (!jobId) throw new Error(`No job ID in generate response: ${JSON.stringify(genData)}`)

      // Poll until done via MCP job_status (sync=true waits up to ~25s per call)
      let result
      const deadline = Date.now() + 270000
      while (Date.now() < deadline) {
        result = await mcpCall(creds, 'job_status', { jobId, sync: true })
        console.log('[HF] status:', result?.status)
        if (result?.status === 'completed') break
        if (result?.status === 'failed' || result?.status === 'nsfw') {
          throw new Error(`Job ${result.status}: ${JSON.stringify(result)}`)
        }
      }
      if (!result || result.status !== 'completed') throw new Error('Generation timed out')

      // Extract image URL from MCP job_status result
      const imageUrl = result?.result_url ?? result?.images?.[0]?.url ?? result?.results?.[0]?.url
      if (!imageUrl) throw new Error(`No image URL in result: ${JSON.stringify(result)}`)

      res.json({ imageUrl })
    } catch (err) {
      console.error('[HF] error:', err.message)
      res.status(500).json({ error: err.message })
    }
  }
)
