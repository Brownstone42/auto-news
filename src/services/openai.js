import OpenAI from 'openai'

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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Please set VITE_OPENAI_API_KEY in your .env file')
  }

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  const examplesBlock = buildExamplesBlock(examples)

  const userPrompt = `สร้าง Facebook post สำหรับ:

📦 สินค้า: ${product.name}
🏷️ กลุ่มสินค้า: ${product.group}

📝 ประเภท Post: ${postType.label}
💡 มุม Content: ${angle.label}
🎯 แนวทาง: ${angle.prompt}${examplesBlock}`

  const stream = await client.chat.completions.create({
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) onChunk(text)
  }
}

// Convert a Thai product post into an English visual image prompt for Higgsfield
export async function generateImagePrompt(postText) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Please set VITE_OPENAI_API_KEY in your .env file')
  }
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  // Strip hashtag section before sending
  const body = postText.split('─')[0].trim()

  const res = await client.chat.completions.create({
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an image prompt generator for AI image generation tools like Higgsfield. Convert Thai B2B industrial product social media posts into concise English visual prompts. Output only the image prompt — no explanation, no Thai text.',
      },
      {
        role: 'user',
        content: `Convert this Thai industrial product post into an English image generation prompt for Higgsfield AI.

Focus on: the product, its industrial or cleanroom setting, professional lighting, clean and modern aesthetic.
Style: professional product photography, studio quality, high detail.
Max 80 words. English only.

Post:
${body}`,
      },
    ],
  })

  const choice = res.choices?.[0]
  console.log('[generateImagePrompt] finish_reason:', choice?.finish_reason, '| content:', choice?.message?.content)
  return choice?.message?.content?.trim() ?? ''
}
