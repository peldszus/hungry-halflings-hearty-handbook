import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

config.global.plugins = [
  createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi },
    },
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
