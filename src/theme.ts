import type { ThemeDefinition } from 'vuetify'

/**
 * Material Design 3 tonal scheme, seeded from the brand green #4a9c6f (hue ~152).
 *
 * M3 places `primary` at tone 40, so the light theme's primary is darker than the raw seed;
 * the seed itself lives on in the container roles and in the dark theme's tone-80 primary.
 *
 * One naming caveat, documented in docs/material-design-review.md: Vuetify's `surface-variant`
 * is not M3's neutral surface variant. Vuetify uses it for the snackbar background, the slider
 * track and `solo-inverted` fields, so it behaves as M3's *inverse-surface* and carries a dark
 * value in the light theme. M3's neutral surfaces are exposed as `surface-container-*` instead.
 */

export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#2C6B4F',
    'on-primary': '#FFFFFF',
    'primary-container': '#AFF0C9',
    'on-primary-container': '#00210F',

    secondary: '#4F6354',
    'on-secondary': '#FFFFFF',
    'secondary-container': '#D1E8D5',
    'on-secondary-container': '#0D1F13',

    tertiary: '#3A656F',
    'on-tertiary': '#FFFFFF',
    'tertiary-container': '#BDEAF6',
    'on-tertiary-container': '#001F26',

    error: '#BA1A1A',
    'on-error': '#FFFFFF',
    'error-container': '#FFDAD6',
    'on-error-container': '#410002',

    success: '#2C6B4F',
    warning: '#7D5700',
    info: '#3A656F',

    background: '#F6FBF4',
    'on-background': '#171D19',
    surface: '#F6FBF4',
    'on-surface': '#171D19',
    'surface-bright': '#F6FBF4',
    'surface-light': '#F0F5EE',

    'surface-container-lowest': '#FFFFFF',
    'surface-container-low': '#F0F5EE',
    'surface-container': '#EAF0E8',
    'surface-container-high': '#E5EBE3',
    'surface-container-highest': '#DFE4DE',

    // Vuetify's inverse-surface pair (snackbar, slider track, solo-inverted fields).
    'surface-variant': '#2C322E',
    'on-surface-variant': '#EDF2EB',

    outline: '#717972',
    'outline-variant': '#C0C9C0',
  },
  variables: {
    'border-color': '#C0C9C0',
    'border-opacity': 1,
    'medium-emphasis-opacity': 0.68,
  },
}

export const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    primary: '#94D5AC',
    'on-primary': '#00391F',
    'primary-container': '#0F512F',
    'on-primary-container': '#AFF0C9',

    secondary: '#B6CCB9',
    'on-secondary': '#223527',
    'secondary-container': '#384B3C',
    'on-secondary-container': '#D1E8D5',

    tertiary: '#A2CEDA',
    'on-tertiary': '#013640',
    'tertiary-container': '#204D57',
    'on-tertiary-container': '#BDEAF6',

    error: '#FFB4AB',
    'on-error': '#690005',
    'error-container': '#93000A',
    'on-error-container': '#FFDAD6',

    success: '#94D5AC',
    warning: '#EFC048',
    info: '#A2CEDA',

    background: '#0F1511',
    'on-background': '#DFE4DE',
    surface: '#0F1511',
    'on-surface': '#DFE4DE',
    'surface-bright': '#353B36',
    'surface-light': '#343B36',

    'surface-container-lowest': '#0A0F0C',
    'surface-container-low': '#171D19',
    'surface-container': '#1B211D',
    'surface-container-high': '#262B27',
    'surface-container-highest': '#303631',

    // Vuetify's inverse-surface pair — light in the dark theme.
    'surface-variant': '#DFE4DE',
    'on-surface-variant': '#2C322E',

    outline: '#8B938C',
    'outline-variant': '#414942',
  },
  variables: {
    'border-color': '#414942',
    'border-opacity': 1,
    'medium-emphasis-opacity': 0.72,
  },
}

export const themes = {
  light: lightTheme,
  dark: darkTheme,
}
