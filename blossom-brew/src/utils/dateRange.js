export function isInDateRange(value, fromDate, toDate) {
  if (!fromDate && !toDate) return true
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  if (fromDate) {
    const from = new Date(`${fromDate}T00:00:00`).getTime()
    if (day < from) return false
  }

  if (toDate) {
    const to = new Date(`${toDate}T00:00:00`).getTime()
    if (day > to) return false
  }

  return true
}
