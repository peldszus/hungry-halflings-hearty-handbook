export interface HighlightSegment {
  text: string
  matched: boolean
}

export function highlightInfixMatches(text: string, query: string): HighlightSegment[] {
  if (!query) {
    return [{ text, matched: false }]
  }

  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) {
    return [{ text, matched: false }]
  }

  const segments: HighlightSegment[] = []
  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  if (before) segments.push({ text: before, matched: false })
  segments.push({ text: match, matched: true })
  if (after) segments.push({ text: after, matched: false })

  return segments
}
