<script setup>
import { computed, ref, watch } from 'vue'
import { displayDate, parseDisplayDate, isValidIsoDate } from '@/data/dateInput'

defineOptions({ inheritAttrs: false })
const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, required: true },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const text = ref(displayDate(props.modelValue))
const lastEmitted = ref(props.modelValue)
const touched = ref(false)
const picker = ref(null)
const iso = computed(() => parseDisplayDate(text.value))
const validation = computed(() => {
  if (!text.value) return ''
  if (!iso.value) return 'กรอกวันที่เป็น วัน/เดือน/ปี เช่น 03/10/2026'
  if (props.min && iso.value < props.min) return `วันที่ต้องไม่ก่อน ${displayDate(props.min)}`
  if (props.max && iso.value > props.max) return `วันที่ต้องไม่หลัง ${displayDate(props.max)}`
  return ''
})
watch(() => props.modelValue, value => {
  // Keep the user's partially typed date while the parent receives an empty ISO.
  if (value === lastEmitted.value) return
  text.value = displayDate(value)
  lastEmitted.value = value
  touched.value = false
})
function updateModel(value) {
  lastEmitted.value = value
  emit('update:modelValue', value)
}
function onTextInput(event) {
  text.value = event.target.value
  touched.value = false
  updateModel(validation.value ? '' : iso.value)
}
function onBlur() {
  touched.value = true
  if (iso.value && !validation.value) text.value = displayDate(iso.value)
}
function onCalendarInput(event) {
  const value = event.target.value
  if (!value) { text.value = ''; touched.value = false; updateModel(''); return }
  if (!isValidIsoDate(value)) return
  text.value = displayDate(value)
  touched.value = true
  updateModel(validation.value ? '' : value)
}
function openCalendar() {
  if (picker.value?.disabled || picker.value?.matches(':disabled')) return
  try { picker.value?.showPicker?.() } catch { picker.value?.focus() }
}
</script>

<template>
  <div class="date-input">
    <div :class="['date-field', { invalid: touched && validation }]">
      <input :id="id" class="date-text" type="text" :value="text" placeholder="วัน/เดือน/ปี" maxlength="10" autocomplete="off" v-bind="$attrs" :aria-invalid="touched && !!validation" :aria-describedby="touched && validation ? `${id}-error` : undefined" @input="onTextInput" @blur="onBlur" />
      <span class="date-calendar">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
        <input :id="`${id}-picker`" ref="picker" class="date-picker" type="date" lang="th-TH" :value="modelValue" :min="min || undefined" :max="max || undefined" aria-label="เลือกวันที่จากปฏิทิน" @click="openCalendar" @change="onCalendarInput" />
      </span>
    </div>
    <p v-if="touched && validation" :id="`${id}-error`" class="date-error" role="alert">{{ validation }}</p>
  </div>
</template>

<style scoped>
.date-input{width:100%;min-width:0}.date-field{display:flex;align-items:center;position:relative;border:1px solid #ded4e7;border-radius:9px;background:#fff;color:#33263f;min-width:0}.date-text{box-sizing:border-box;display:block;min-width:0;width:100%;font:inherit;color:inherit;line-height:1.5;border:0!important;border-radius:9px;background:transparent;padding:11px 42px 11px 12px!important;outline:none}.date-text::placeholder{color:#9b909f}.date-calendar{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:20px;height:22px;color:#76638a;display:grid;place-items:center}.date-picker{position:absolute;inset:0;width:100%!important;height:100%;margin:0!important;padding:0!important;opacity:0;border:0!important;cursor:pointer}.date-picker::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;cursor:pointer}.date-field:focus-within{outline:2px solid #9d75c8;outline-offset:2px}.date-field.invalid{border-color:#b03d58}.date-error{font-size:12px;color:#b03d58;line-height:1.6;margin:7px 0 0}.date-text:disabled{opacity:.55;cursor:not-allowed}@media(forced-colors:active){.date-field{border:1px solid CanvasText}.date-calendar{color:CanvasText}}
</style>
