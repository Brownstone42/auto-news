// Normalize old drafts as well as streamed text into a plain, ready-to-copy post.
export function presentPrediction(output) {
  const post = output.split('[ข้อความบนภาพ]')[0].replace(/^\s*\[โพสต์\]\s*/, '')
  const lines = post.split(/\r?\n/).map(line => line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, '')
    .replace(/(?:^|\s)#[\p{L}\p{M}\p{N}_]+/gu, '')
    .replace(/\s*\\\s*$/, '')
    .trim())
    .filter(line => !/(บันทึกไว้ทบทวน|แชร์ให้เพื่อน|กดแชร์|กดติดตาม|อย่าลืม.*(?:แชร์|ติดตาม|บันทึก)|ชวน(?:บันทึก|แชร์|ติดตาม))/.test(line))
  const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  const [title = '', ...body] = text.split('\n')
  return { title, body: body.join('\n').trim(), text }
}
