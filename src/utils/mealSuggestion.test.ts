import { describe, it, expect } from 'vitest'
import { suggestMeals, mainIngredientNames } from './mealSuggestion'
import type { SuggestMealsInput, SuggestionFilters } from './mealSuggestion'
import type { Recipe, Ingredient } from '@/stores/recipes'
import type { MealPlanEntry } from '@/stores/mealPlan'

function main(name: string): Ingredient {
  return { ingredient: name, isMain: true, addToShoppingList: true }
}

function side(name: string): Ingredient {
  return { ingredient: name, isMain: false, addToShoppingList: true }
}

function recipe(id: string, overrides: Partial<Recipe> = {}): Recipe {
  return {
    id,
    name: `Recipe ${id}`,
    ingredients: [],
    servings: 2,
    lastEditedAt: '2026-06-01T00:00:00.000Z',
    archived: false,
    favourite: false,
    ...overrides,
  }
}

const noFilters: SuggestionFilters = {
  recentlyUsed: false,
  favourites: false,
  mostOften: false,
  labels: [],
  distinctMainIngredient: false,
}

// The visible week the tests operate on: Mon 2026-06-15 … Sun 2026-06-21, "today" mid-week.
const WEEK = [
  '2026-06-15',
  '2026-06-16',
  '2026-06-17',
  '2026-06-18',
  '2026-06-19',
  '2026-06-20',
  '2026-06-21',
]
const TODAY = '2026-06-17'

function makeInput(overrides: Partial<SuggestMealsInput> = {}): SuggestMealsInput {
  return {
    recipes: [],
    entries: [],
    selectedDates: WEEK,
    weekDates: WEEK,
    referenceDate: TODAY,
    filters: { ...noFilters, ...(overrides.filters ?? {}) },
    rng: () => 0,
    ...overrides,
  }
}

/** Returns each queued value in turn, then keeps returning the last one. */
function rngFrom(values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

function assignedIds(result: ReturnType<typeof suggestMeals>): string[] {
  return result.assignments.map((a) => a.recipeId)
}

describe('suggestMeals basics', () => {
  it('fills every selected day when the pool is large enough', () => {
    const recipes = WEEK.map((_, i) => recipe(`r${i}`))
    const result = suggestMeals(makeInput({ recipes }))
    expect(result.assignments).toHaveLength(7)
    expect(result.unmatchedDates).toEqual([])
    expect(result.assignments.map((a) => a.date)).toEqual(WEEK)
  })

  it('returns assignments in ascending date order for unsorted input', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a'), recipe('b'), recipe('c')],
        selectedDates: ['2026-06-19', '2026-06-15', '2026-06-17'],
      })
    )
    expect(result.assignments.map((a) => a.date)).toEqual([
      '2026-06-15',
      '2026-06-17',
      '2026-06-19',
    ])
  })

  it('never suggests archived recipes', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a', { archived: true }), recipe('b')],
        selectedDates: ['2026-06-15', '2026-06-16'],
      })
    )
    expect(assignedIds(result)).toEqual(['b'])
    expect(result.unmatchedDates).toEqual(['2026-06-16'])
  })

  it('never repeats a recipe within one pass', () => {
    const recipes = [recipe('a'), recipe('b'), recipe('c')]
    const result = suggestMeals(makeInput({ recipes, rng: () => 0 }))
    const ids = assignedIds(result)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(result.unmatchedDates).toHaveLength(4)
  })

  it('excludes recipes already planned on unselected days of the week', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a'), recipe('b')],
        entries: [{ date: '2026-06-20', recipeId: 'a' }],
        selectedDates: ['2026-06-15'],
      })
    )
    expect(assignedIds(result)).toEqual(['b'])
  })

  it('ignores the current recipe of a selected day, so re-rolls can pick it again', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a')],
        entries: [{ date: '2026-06-15', recipeId: 'a' }],
        selectedDates: ['2026-06-15'],
      })
    )
    expect(assignedIds(result)).toEqual(['a'])
  })

  it('does not exclude recipes planned outside the visible week', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a')],
        entries: [{ date: '2026-06-10', recipeId: 'a' }],
        selectedDates: ['2026-06-17'],
      })
    )
    expect(assignedIds(result)).toEqual(['a'])
  })

  it('reports days left over once the pool is exhausted', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a')],
        selectedDates: ['2026-06-15', '2026-06-16', '2026-06-17'],
        rng: () => 0,
      })
    )
    expect(result.assignments).toEqual([{ date: '2026-06-15', recipeId: 'a' }])
    expect(result.unmatchedDates).toEqual(['2026-06-16', '2026-06-17'])
  })

  it('picks according to the injected rng', () => {
    const recipes = [recipe('a'), recipe('b'), recipe('c')]
    const result = suggestMeals(
      makeInput({
        recipes,
        selectedDates: ['2026-06-15', '2026-06-16'],
        rng: rngFrom([0.99, 0]),
      })
    )
    // First day picks the last of three candidates, second the first of the remaining two.
    expect(assignedIds(result)).toEqual(['c', 'a'])
  })

  it('uses Math.random when no rng is given', () => {
    const result = suggestMeals(
      makeInput({ recipes: [recipe('a')], selectedDates: ['2026-06-15'], rng: undefined })
    )
    expect(assignedIds(result)).toEqual(['a'])
  })
})

describe('suggestMeals filters', () => {
  it('restricts to favourites', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a'), recipe('b', { favourite: true })],
        selectedDates: ['2026-06-15', '2026-06-16'],
        filters: { ...noFilters, favourites: true },
      })
    )
    expect(assignedIds(result)).toEqual(['b'])
    expect(result.unmatchedDates).toEqual(['2026-06-16'])
  })

  it('restricts to recipes carrying one of the selected labels', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('a', { labels: ['veggie'] }),
          recipe('b', { labels: ['fish'] }),
          recipe('c'),
        ],
        selectedDates: ['2026-06-15', '2026-06-16', '2026-06-17'],
        filters: { ...noFilters, labels: ['veggie', 'pasta'] },
      })
    )
    expect(assignedIds(result)).toEqual(['a'])
  })

  describe('recently used', () => {
    const filters = { ...noFilters, recentlyUsed: true }

    it('keeps recipes assigned within the last month, inclusive boundary', () => {
      const result = suggestMeals(
        makeInput({
          recipes: [recipe('a'), recipe('b')],
          entries: [
            { date: '2026-05-17', recipeId: 'a' }, // exactly one month before today
            { date: '2026-05-16', recipeId: 'b' }, // one day too old
          ],
          selectedDates: ['2026-06-19', '2026-06-20'],
          filters,
        })
      )
      expect(assignedIds(result)).toEqual(['a'])
      expect(result.unmatchedDates).toEqual(['2026-06-20'])
    })

    it('does not count future assignments as recent use', () => {
      const result = suggestMeals(
        makeInput({
          recipes: [recipe('a')],
          entries: [{ date: '2026-06-25', recipeId: 'a' }],
          selectedDates: ['2026-06-15'],
          filters,
        })
      )
      expect(result.unmatchedDates).toEqual(['2026-06-15'])
    })

    it('does not count assignments on selected days as recent use', () => {
      const result = suggestMeals(
        makeInput({
          recipes: [recipe('a')],
          entries: [{ date: '2026-06-16', recipeId: 'a' }],
          selectedDates: ['2026-06-16', '2026-06-18'],
          filters,
        })
      )
      expect(result.assignments).toEqual([])
      expect(result.unmatchedDates).toEqual(['2026-06-16', '2026-06-18'])
    })
  })

  describe('most often', () => {
    const filters = { ...noFilters, mostOften: true }

    function history(recipeId: string, count: number, startDate: string): MealPlanEntry[] {
      return Array.from({ length: count }, (_, i) => ({
        date: `${startDate.slice(0, 8)}${String(Number(startDate.slice(8)) + i).padStart(2, '0')}`,
        recipeId,
      }))
    }

    it('keeps only the top quarter by past assignment count', () => {
      const entries = [
        ...history('a', 5, '2026-05-01'),
        ...history('b', 3, '2026-05-10'),
        ...history('c', 2, '2026-05-20'),
        ...history('d', 1, '2026-04-01'),
      ]
      const result = suggestMeals(
        makeInput({
          recipes: [recipe('a'), recipe('b'), recipe('c'), recipe('d')],
          entries,
          selectedDates: WEEK,
          filters,
        })
      )
      expect(assignedIds(result)).toEqual(['a'])
      expect(result.unmatchedDates).toHaveLength(6)
    })

    it('includes every recipe tied at the threshold count', () => {
      const entries = [
        ...history('a', 3, '2026-05-01'),
        ...history('b', 3, '2026-05-10'),
        ...history('c', 1, '2026-05-20'),
        ...history('d', 1, '2026-04-01'),
      ]
      const result = suggestMeals(
        makeInput({
          recipes: [recipe('a'), recipe('b'), recipe('c'), recipe('d')],
          entries,
          selectedDates: WEEK,
          filters,
        })
      )
      expect(assignedIds(result).sort()).toEqual(['a', 'b'])
    })

    it('ignores future assignments when counting', () => {
      const entries = [...history('a', 2, '2026-05-01'), ...history('b', 5, '2026-07-01')]
      const result = suggestMeals(
        makeInput({
          recipes: [recipe('a'), recipe('b')],
          entries,
          selectedDates: ['2026-06-15'],
          filters,
        })
      )
      expect(assignedIds(result)).toEqual(['a'])
    })

    it('matches nothing when there is no assignment history', () => {
      const result = suggestMeals(
        makeInput({ recipes: [recipe('a')], selectedDates: ['2026-06-15'], filters })
      )
      expect(result.assignments).toEqual([])
      expect(result.unmatchedDates).toEqual(['2026-06-15'])
    })
  })

  it('intersects multiple active filters', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('a', { favourite: true, labels: ['veggie'] }),
          recipe('b', { favourite: true }),
          recipe('c', { labels: ['veggie'] }),
        ],
        selectedDates: ['2026-06-15', '2026-06-16', '2026-06-17'],
        filters: { ...noFilters, favourites: true, labels: ['veggie'] },
      })
    )
    expect(assignedIds(result)).toEqual(['a'])
  })
})

describe('suggestMeals distinct main ingredient', () => {
  const filters = { ...noFilters, distinctMainIngredient: true }

  it('blocks a candidate sharing a main ingredient with the previous fixed day', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('a', { ingredients: [main('rice')] }),
          recipe('c', { ingredients: [main('rice'), side('peas')] }),
          recipe('b', { ingredients: [main('potato')] }),
        ],
        entries: [{ date: '2026-06-15', recipeId: 'a' }],
        selectedDates: ['2026-06-16'],
        filters,
        rng: () => 0,
      })
    )
    // 'c' shares rice with the fixed Monday; 'b' is the first admissible candidate.
    expect(assignedIds(result)).toEqual(['b'])
  })

  it('respects in-pass picks as the previous day', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('a', { ingredients: [main('rice')] }),
          recipe('b', { ingredients: [main('rice')] }),
          recipe('c', { ingredients: [main('potato')] }),
        ],
        selectedDates: ['2026-06-15', '2026-06-16'],
        filters,
        rng: () => 0,
      })
    )
    // Monday takes 'a' (rice); Tuesday must skip 'b' (rice again) and take 'c'.
    expect(assignedIds(result)).toEqual(['a', 'c'])
  })

  it('blocks a candidate sharing a main ingredient with the next already-planned day', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('b', { ingredients: [main('rice')] }),
          recipe('c', { ingredients: [main('potato')] }),
          recipe('a', { ingredients: [main('rice')] }),
        ],
        entries: [{ date: '2026-06-17', recipeId: 'a' }],
        selectedDates: ['2026-06-16'],
        filters,
        rng: () => 0,
      })
    )
    // Wednesday is fixed with 'a' (rice), so 'b' (rice) cannot land on Tuesday.
    expect(assignedIds(result)).toEqual(['c'])
  })

  it('consults neighbours outside the visible week', () => {
    const sunday = '2026-06-14' // day before the visible Monday
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('b', { ingredients: [main('rice')] }),
          recipe('c', { ingredients: [main('potato')] }),
          recipe('a', { ingredients: [main('rice')] }),
        ],
        entries: [{ date: sunday, recipeId: 'a' }],
        selectedDates: ['2026-06-15'],
        filters,
        rng: () => 0,
      })
    )
    expect(assignedIds(result)).toEqual(['c'])
  })

  it('matches main ingredients case- and whitespace-insensitively', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('b', { ingredients: [main(' Rice ')] }),
          recipe('c', { ingredients: [main('potato')] }),
          recipe('a', { ingredients: [main('rice')] }),
        ],
        entries: [{ date: '2026-06-15', recipeId: 'a' }],
        selectedDates: ['2026-06-16'],
        filters,
        rng: () => 0,
      })
    )
    expect(assignedIds(result)).toEqual(['c'])
  })

  it('does not conflict on shared non-main ingredients', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('a', { ingredients: [main('rice'), side('onion')] }),
          recipe('b', { ingredients: [main('lentils'), side('onion')] }),
        ],
        selectedDates: ['2026-06-15', '2026-06-16'],
        filters,
        rng: () => 0,
      })
    )
    expect(assignedIds(result)).toEqual(['a', 'b'])
  })

  it('never blocks recipes without main ingredients', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a', { ingredients: [side('salt')] }), recipe('b')],
        selectedDates: ['2026-06-15', '2026-06-16'],
        filters,
        rng: () => 0,
      })
    )
    expect(result.assignments).toHaveLength(2)
  })

  it('imposes no constraint across an unmatched day', () => {
    const rice = { ingredients: [main('rice')] }
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a', rice), recipe('b', { ...rice, favourite: true })],
        selectedDates: ['2026-06-15', '2026-06-16', '2026-06-17'],
        filters,
        rng: () => 0,
      })
    )
    // Mon takes 'a'; Tue fails (both remaining rice recipes conflict with Mon — only 'b' is
    // left and shares rice); Wed is then only constrained by Tue (empty) so it takes 'b'.
    expect(result.assignments).toEqual([
      { date: '2026-06-15', recipeId: 'a' },
      { date: '2026-06-17', recipeId: 'b' },
    ])
    expect(result.unmatchedDates).toEqual(['2026-06-16'])
  })

  it('ignores unresolvable recipe ids on neighbouring days', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [recipe('a', { ingredients: [main('rice')] })],
        entries: [{ date: '2026-06-15', recipeId: 'deleted' }],
        selectedDates: ['2026-06-16'],
        filters,
      })
    )
    expect(assignedIds(result)).toEqual(['a'])
  })

  it('chains the constraint over consecutive selected days', () => {
    const result = suggestMeals(
      makeInput({
        recipes: [
          recipe('a', { ingredients: [main('rice')] }),
          recipe('b', { ingredients: [main('potato')] }),
          recipe('c', { ingredients: [main('rice')] }),
          recipe('d', { ingredients: [main('lentils')] }),
        ],
        selectedDates: ['2026-06-15', '2026-06-16', '2026-06-17'],
        filters,
        rng: () => 0,
      })
    )
    // Mon 'a' (rice) → Tue skips 'c' (rice), takes 'b' (potato) → Wed takes 'c' (rice is fine
    // again after a potato day).
    expect(assignedIds(result)).toEqual(['a', 'b', 'c'])
  })
})

describe('mainIngredientNames', () => {
  it('collects trimmed lowercase names of main ingredients only', () => {
    const r = recipe('a', { ingredients: [main(' Rice '), side('onion'), main('')] })
    expect(mainIngredientNames(r)).toEqual(new Set(['rice']))
  })
})
