import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { readStoredThemePreference, useAppTheme } from './useAppTheme'

const Harness = defineComponent({
  setup() {
    return useAppTheme()
  },
  template: '<div />',
})

function mountHarness() {
  return mount(Harness)
}

describe('useAppTheme', () => {
  beforeEach(async () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />'

    // The Vuetify plugin instance and the preference ref are both module-level and shared
    // across this file, so reset them to a known state rather than inheriting the last test's.
    const reset = mountHarness()
    reset.vm.setPreference('light')
    await reset.vm.$nextTick()
    reset.unmount()

    localStorage.clear()
  })

  describe('readStoredThemePreference', () => {
    it('defaults to system when nothing is stored', () => {
      expect(readStoredThemePreference()).toBe('system')
    })

    it('returns a valid stored preference', () => {
      localStorage.setItem('themePreference', 'dark')
      expect(readStoredThemePreference()).toBe('dark')
    })

    it('falls back to system for an unrecognised stored value', () => {
      localStorage.setItem('themePreference', 'solarized')
      expect(readStoredThemePreference()).toBe('system')
    })
  })

  it('persists the preference when it changes', () => {
    const wrapper = mountHarness()
    wrapper.vm.setPreference('dark')

    expect(localStorage.getItem('themePreference')).toBe('dark')
    expect(wrapper.vm.preference).toBe('dark')
  })

  it('switches the active Vuetify theme', async () => {
    const wrapper = mountHarness()
    expect(wrapper.vm.isDark).toBe(false)

    wrapper.vm.setPreference('dark')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isDark).toBe(true)
  })

  it('keeps the theme-color meta tag in step with the active theme', async () => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const wrapper = mountHarness()

    // The light surface is applied immediately on mount.
    expect(meta?.getAttribute('content')).toBe('#F6FBF4')

    wrapper.vm.setPreference('dark')
    await wrapper.vm.$nextTick()

    expect(meta?.getAttribute('content')).toBe('#0F1511')
  })
})
