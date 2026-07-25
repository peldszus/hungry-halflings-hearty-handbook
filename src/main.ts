import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import './styles/fonts.css'
import 'vuetify/styles'
import './styles/shared.css'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import App from './App.vue'
import router from './router'
import { defaults, themes } from './theme'
import { readStoredThemePreference } from './composables/useAppTheme'

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    // Seeded from the persisted preference so there is no flash of the wrong theme.
    // 'system' is resolved from prefers-color-scheme by Vuetify itself.
    defaultTheme: readStoredThemePreference(),
    themes,
  },
  defaults,
})

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.location.reload()
  })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
