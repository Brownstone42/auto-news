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

export async function generatePost(product, postType, angle, onChunk) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Please set VITE_OPENAI_API_KEY in your .env file')
  }

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  const userPrompt = `สร้าง Facebook post สำหรับ:

📦 สินค้า: ${product.name}
🏷️ กลุ่มสินค้า: ${product.group}

📝 ประเภท Post: ${postType.label}
💡 มุม Content: ${angle.label}
🎯 แนวทาง: ${angle.prompt}`

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
