import { ref } from 'vue'

// Module-level so MealPlanView can enter/exit the mode and NavBar — mounted in a different
// subtree — can yield the bottom navigation slot to the suggestion toolbar while it is active.
const active = ref(false)

export function useSuggestionMode() {
  function enter() {
    active.value = true
  }

  function exit() {
    active.value = false
  }

  return { active, enter, exit }
}
