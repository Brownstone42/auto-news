import { test } from 'node:test'
import assert from 'node:assert/strict'
import { presentPrediction } from '../src/data/predictionPresentation.js'

test('old posts display and copy only a plain title and prediction', () => {
  const post = presentPrediction(`[โพสต์]
**ดวงรายสัปดาห์ ราศีเมษ | 5–11 ตุลาคม 2569** ♈

### การงาน 💼
งานเดินหน้าเร็ว เช็กเอกสารก่อนตกลง

บันทึกไว้ทบทวนและแชร์ให้เพื่อนราศีเมษ ♈
#ดวงรายสัปดาห์ #ราศีเมษ #ดูดวง2569
[ข้อความบนภาพ]
ข้อความบนภาพที่ไม่แสดง`)
  assert.equal(post.title, 'ดวงรายสัปดาห์ ราศีเมษ | 5–11 ตุลาคม 2569')
  assert.equal(post.body, 'การงาน\nงานเดินหน้าเร็ว เช็กเอกสารก่อนตกลง')
  assert.ok(!/[#*]|ข้อความบนภาพ|แชร์|♈|💼/.test(post.text))
})

test('streamed and plain posts retain their content without extra sections', () => {
  assert.deepEqual(presentPrediction(''), { title: '', body: '', text: '' })
  assert.equal(presentPrediction('[โพสต์]\nดวงรายวัน\n\nการเงิน\nจัดงบให้ชัด').body, 'การเงิน\nจัดงบให้ชัด')
  assert.equal(presentPrediction('ดวงรายวัน\nเรื่องควรระวัง\nอย่าตัดสินใจเร็ว').text, 'ดวงรายวัน\nเรื่องควรระวัง\nอย่าตัดสินใจเร็ว')
})
