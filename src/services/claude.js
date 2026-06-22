import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `คุณเป็นนักเขียน Content Social Media ให้กับบริษัท Idealglobe (อีดอลโกลบ) ผู้จัดจำหน่าย B2B สินค้าความปลอดภัยอุตสาหกรรมและ Cleanroom ในประเทศไทย ร้าน Shopee ชื่อว่า Goodbooch (กู๊ดบุ้ช)

กลุ่มเป้าหมาย: ผู้จัดการโรงงาน, หัวหน้า QC, วิศวกร, และฝ่ายจัดซื้อในโรงงานอุตสาหกรรมไทย

แนวทางการเขียน:
- ภาษาไทยเท่านั้น (ยกเว้น hashtag และคำศัพท์เทคนิค เช่น ESD, PCB, GMP)
- โทน: มืออาชีพ เป็นมิตร ให้ความรู้ — เหมือนผู้เชี่ยวชาญแชร์ความรู้ให้เพื่อนร่วมงาน
- เน้น SEO และ Awareness ไม่ใช่การขายแบบ Hard Sell
- ความยาว Post Body: 200–300 คำ (ไม่นับ Hashtag)
- ใช้ Emoji 2–4 ตัวอย่างเหมาะสม ไม่มากเกินไป
- ห้ามใช้ภาษาการตลาดที่ดูเกินจริง เช่น "อย่ารอช้า!", "ราคาสุดพิเศษ!", "ลดราคาวันนี้เท่านั้น!"
- เขียนภาษาไทยธรรมชาติ ไม่ใช่แปลจากอังกฤษ

Format Output (ต้องตามนี้ทุกครั้ง):
[ประโยคเปิด Hook 1 บรรทัด — เป็นคำถามหรือประโยคกระตุ้นความสนใจที่เกี่ยวกับปัญหาหรือความสงสัยของกลุ่มเป้าหมาย]

[เนื้อหา Post ภาษาไทย]

─────────────────────────
[Hashtag 5–7 ตัว คละไทย-อังกฤษ เกี่ยวกับสินค้าและอุตสาหกรรม — ห้ามใช้ #Goodbooch หรือชื่อแบรนด์]`

function buildExamplesBlock({ finalized = [], reviewed = [] } = {}) {
  const parts = []

  if (finalized.length > 0) {
    const block = finalized.map((e, i) => `--- ตัวอย่างที่ ${i + 1} ---\n${e}`).join('\n\n')
    parts.push(`✅ ตัวอย่าง Post ที่ผ่านการแก้ไขและโพสต์จริง (เขียนในลักษณะเดียวกัน ห้ามคัดลอก):\n\n${block}\n---`)
  }

  const withFeedback = reviewed.filter((r) => r.feedback?.trim())
  if (withFeedback.length > 0) {
    const lines = withFeedback.map((r) => `- คะแนน ${r.score}/10: "${r.feedback.trim()}"`)
    parts.push(`🔍 Feedback จาก Post ที่ผ่านการรีวิว (เรียนรู้และหลีกเลี่ยงปัญหาเหล่านี้):\n${lines.join('\n')}`)
  }

  const highScored = reviewed.filter((r) => r.score >= 8 && !r.feedback?.trim())
  if (highScored.length > 0) {
    const lines = highScored.map((r) => `- Post ที่ได้คะแนน ${r.score}/10 ถือว่าดี — รักษาแนวทางนี้ไว้`)
    parts.push(`👍 สัญญาณคุณภาพจาก Post ที่ผ่านมา:\n${lines.join('\n')}`)
  }

  if (parts.length === 0) return ''
  return `\n\n📌 อ้างอิงจากประวัติการสร้าง Post:\n\n${parts.join('\n\n')}`
}

export async function generatePost(product, postType, angle, examples, onChunk) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Please set VITE_ANTHROPIC_API_KEY in your .env file')
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const examplesBlock = buildExamplesBlock(examples)

  const userPrompt = `สร้าง Facebook post สำหรับ:

📦 สินค้า: ${product.name}
🏷️ กลุ่มสินค้า: ${product.group}

📝 ประเภท Post: ${postType.label}
💡 มุม Content: ${angle.label}
🎯 แนวทาง: ${angle.prompt}${examplesBlock}`

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  for await (const text of stream.text_stream) {
    onChunk(text)
  }
}
