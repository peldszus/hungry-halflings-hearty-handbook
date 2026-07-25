import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { defaults, themes } from './theme'

// jsdom doesn't implement matchMedia, which Vuetify's theme uses to resolve
// defaultTheme: 'system' from prefers-color-scheme. Must be defined before
// createVuetify() runs.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

config.global.plugins = [
  createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi },
    },
    // Use the real themes and defaults so tests render what the app renders.
    theme: { defaultTheme: 'light', themes },
    defaults,
  }),
]

// jsdom doesn't implement visualViewport or ResizeObserver, which Vuetify's
// overlay positioning (menus, autocompletes) relies on.
if (!window.visualViewport) {
  window.visualViewport = new EventTarget() as VisualViewport
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
