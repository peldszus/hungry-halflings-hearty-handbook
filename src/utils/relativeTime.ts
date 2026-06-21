function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const date = new Date(`${isoDate}T00:00:00`)
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000)
  )
  const past = days >= 0
  const n = Math.abs(days)

  if (n === 0) return 'today'
  if (n === 1) return past ? 'yesterday' : 'tomorrow'
  if (n < 7) return past ? `${n} days ago` : `in ${n} days`
  if (n < 30) {
    const weeks = Math.floor(n / 7)
    return past
      ? `${weeks} week${weeks > 1 ? 's' : ''} ago`
      : `in ${weeks} week${weeks > 1 ? 's' : ''}`
  }
  if (n < 365) {
    const months = Math.floor(n / 30)
    return past
      ? `${months} month${months > 1 ? 's' : ''} ago`
      : `in ${months} month${months > 1 ? 's' : ''}`
  }
  const years = Math.floor(n / 365)
  return past
    ? `${years} year${years > 1 ? 's' : ''} ago`
    : `in ${years} year${years > 1 ? 's' : ''}`
}

export function formatLastUsedLabel(
  lastUsedDate: string | undefined,
  nextPlannedDate: string | undefined,
  now: Date = new Date()
): string {
  const parts: string[] = []
  if (lastUsedDate) parts.push(`Last used ${formatRelativeTime(lastUsedDate, now)}`)
  if (nextPlannedDate) parts.push(`Next planned for ${formatRelativeTime(nextPlannedDate, now)}`)
  return parts.length ? parts.join(' · ') : 'Never used'
}

export function formatRelativeToReference(isoDate: string, referenceIso: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  const reference = new Date(`${referenceIso}T00:00:00`)
  const days = Math.round((date.getTime() - reference.getTime()) / (24 * 60 * 60 * 1000))
  const after = days > 0
  const n = Math.abs(days)
  const suffix = after ? 'after' : 'before'

  if (n < 7) return `${n} day${n === 1 ? '' : 's'} ${suffix}`
  if (n < 30) {
    const weeks = Math.floor(n / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ${suffix}`
  }
  if (n < 365) {
    const months = Math.floor(n / 30)
    return `${months} month${months > 1 ? 's' : ''} ${suffix}`
  }
  const years = Math.floor(n / 365)
  return `${years} year${years > 1 ? 's' : ''} ${suffix}`
}

export function formatAssignmentUsageLines(
  lastUsedDate: string | undefined,
  nextPlannedDate: string | undefined,
  referenceIso: string
): string[] {
  const lines: string[] = []
  if (lastUsedDate) {
    lines.push(`Last used ${formatRelativeToReference(lastUsedDate, referenceIso)}`)
  }
  if (nextPlannedDate) {
    lines.push(`Next planned ${formatRelativeToReference(nextPlannedDate, referenceIso)}`)
  }
  return lines.length ? lines : ['Never used']
}
