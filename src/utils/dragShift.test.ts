import { describe, it, expect } from 'vitest'
import { computeSwapShifts, computeMoveShifts } from './dragShift'

describe('computeSwapShifts', () => {
  it('gives each side the row distance the other travelled, in opposite directions', () => {
    expect(computeSwapShifts(1, 4)).toEqual(
      new Map([
        [1, 3],
        [4, -3],
      ])
    )
  })

  it('is symmetric regardless of argument order', () => {
    expect(computeSwapShifts(4, 1)).toEqual(
      new Map([
        [4, -3],
        [1, 3],
      ])
    )
  })

  it('handles adjacent indices', () => {
    expect(computeSwapShifts(1, 2)).toEqual(
      new Map([
        [1, 1],
        [2, -1],
      ])
    )
  })
})

describe('computeMoveShifts', () => {
  it('shifts intervening rows by one and the moved item by the full distance, moving forward', () => {
    expect(computeMoveShifts(1, 4)).toEqual(
      new Map([
        [1, 1],
        [2, 1],
        [3, 1],
        [4, -3],
      ])
    )
  })

  it('shifts intervening rows by one and the moved item by the full distance, moving backward', () => {
    expect(computeMoveShifts(4, 1)).toEqual(
      new Map([
        [2, -1],
        [3, -1],
        [4, -1],
        [1, 3],
      ])
    )
  })

  it('handles moving forward to the last row (boundary)', () => {
    expect(computeMoveShifts(1, 6)).toEqual(
      new Map([
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 1],
        [6, -5],
      ])
    )
  })

  it('handles moving backward to the first row (boundary)', () => {
    expect(computeMoveShifts(4, 0)).toEqual(
      new Map([
        [1, -1],
        [2, -1],
        [3, -1],
        [4, -1],
        [0, 4],
      ])
    )
  })

  it('produces the same shifts as a swap when moving between two adjacent rows', () => {
    expect(computeMoveShifts(1, 2)).toEqual(computeSwapShifts(1, 2))
  })
})
