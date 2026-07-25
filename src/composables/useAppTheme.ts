import { computed, ref, watch } from 'vue'
import { useTheme } from 'vuetify'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'themePreference'

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/**
 * Read the persisted preference. Exported so `main.ts` can seed Vuetify's `defaultTheme`
 * directly, which avoids a flash of the wrong theme on load.
 */
export function readStoredThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

const preference = ref<ThemePreference>(readStoredThemePreference())

/**
 * Vuetify 4 resolves `'system'` from `prefers-color-scheme` on its own, so this only owns the
 * persisted user override and keeps the browser chrome colour in step with the active theme.
 */
export function useAppTheme() {
  const theme = useTheme()

  const isDark = computed(() => theme.current.value.dark)

  function setPreference(next: ThemePreference) {
    preference.value = next
    localStorage.setItem(STORAGE_KEY, next)
    theme.change(next)
  }

  watch(
    () => theme.current.value.colors.surface,
    (surface) => {
      // Vuetify's Color type allows objects and numbers; our themes are always hex strings.
      if (typeof surface !== 'string') return
      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', surface)
    },
    { immediate: true }
  )

  return { preference, isDark, setPreference }
}
