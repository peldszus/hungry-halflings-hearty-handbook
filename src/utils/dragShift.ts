/**
 * Meal plan rows are pinned to calendar dates and never move in the DOM - only the recipe/meal
 * note content assigned to each date changes. These functions compute, purely from row indices,
 * how many rows each affected date's new content travelled from (positive = from a row below,
 * negative = from above), mirroring the mealPlan store's own swap/move cascade direction. The
 * result is used to animate a "slide into place" effect without needing to measure DOM positions
 * before and after (classic FLIP) - a static row height is all that turns this into pixels.
 */
export function computeSwapShifts(indexA: number, indexB: number): Map<number, number> {
  return new Map([
    [indexA, indexB - indexA],
    [indexB, indexA - indexB],
  ])
}

export function computeMoveShifts(fromIndex: number, toIndex: number): Map<number, number> {
  const shifts = new Map<number, number>()
  if (fromIndex < toIndex) {
    for (let i = fromIndex; i < toIndex; i++) shifts.set(i, 1) // content came from i + 1
    shifts.set(toIndex, fromIndex - toIndex) // the moved item, travelling the full distance
  } else {
    for (let i = toIndex + 1; i <= fromIndex; i++) shifts.set(i, -1) // content came from i - 1
    shifts.set(toIndex, fromIndex - toIndex)
  }
  return shifts
}
