// Zones in the catalogue are all Ukrainian airspace (Kyiv, Odesa, Lviv,
// Zhytomyr, Dnipro, Kharkiv) and the governing documents (OH-1, ZC-2026.1,
// TSD-4) are Ukrainian regulatory sources. No document or schema field
// states a timezone explicitly, so "zone-local time" is taken to mean
// Europe/Kyiv for every zone. Flag this if a zone outside Ukraine is ever
// added to the catalogue — it would need a real per-zone timezone field.
export const ZONE_TIMEZONE = 'Europe/Kyiv'

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function isMinuteInCurfew(minuteOfDay: number, curfewStartMin: number, curfewEndMin: number): boolean {
  if (curfewStartMin === curfewEndMin) return false
  if (curfewStartMin < curfewEndMin) {
    return minuteOfDay >= curfewStartMin && minuteOfDay < curfewEndMin
  }
  // Crosses midnight — one continuous period per TSD-4 §4.
  return minuteOfDay >= curfewStartMin || minuteOfDay < curfewEndMin
}

function zoneLocalMinuteOfDay(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant)
  const hour = Number(parts.find((p) => p.type === 'hour')!.value)
  const minute = Number(parts.find((p) => p.type === 'minute')!.value)
  return (hour % 24) * 60 + minute
}

const MS_PER_MIN = 60_000

// Evaluated minute-by-minute across the whole window per TSD-4 §4, not just
// the endpoints — a window that only clips through curfew midway still
// fails.
export function violatesCurfew(
  windowStart: Date,
  windowEnd: Date,
  curfewStart: string | null,
  curfewEnd: string | null,
  timeZone: string = ZONE_TIMEZONE
): boolean {
  if (!curfewStart || !curfewEnd) return false

  const startMin = timeToMinutes(curfewStart)
  const endMin = timeToMinutes(curfewEnd)
  const endTime = windowEnd.getTime()

  let t = windowStart.getTime()
  let reachedEnd = false
  while (t <= endTime) {
    if (isMinuteInCurfew(zoneLocalMinuteOfDay(new Date(t), timeZone), startMin, endMin)) {
      return true
    }
    reachedEnd = t === endTime
    t += MS_PER_MIN
  }
  if (!reachedEnd) {
    return isMinuteInCurfew(zoneLocalMinuteOfDay(windowEnd, timeZone), startMin, endMin)
  }
  return false
}
