// Display dates in Thai order while retaining ISO dates in selections/database.
export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function displayDate(value) {
  if (!isValidIsoDate(value)) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
export function parseDisplayDate(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim())
  if (!match) return ''
  const [, day, month, year] = match
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return isValidIsoDate(iso) ? iso : ''
}
