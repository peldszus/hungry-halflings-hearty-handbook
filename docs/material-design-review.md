# Material Design 3 — UX and Visual Review

A design review of the Hungry Halflings Hearty Handbook, and the plan for bringing it in line with
Material Design 3. This document is the rationale of record: it explains _why_ each change is being
made, so the decisions can be revisited without re-deriving them.

## Summary

The app is already built on Vuetify 4 — every screen is composed from `v-card`, `v-list`, `v-btn`
and `v-dialog`, there is no hand-rolled CSS framework, and there are no stylesheets of our own
beyond ~70 lines of scoped CSS in two views. So this is not a Material _adoption_. It is a Material
_application_: the components are Material, but they are being used at their defaults, and the
defaults are not Material 3.

Three things account for most of the gap:

1. **The design-token surface is two hex values.** Material 3's visual identity is its tonal colour
   system. The app defines `primary` and `secondary` and inherits everything else from Vuetify's
   stock palette.
2. **Roboto is never loaded.** There is no font link anywhere, so type renders in whatever
   sans-serif the operating system supplies. Material's type scale is doing nothing.
3. **Material 2 habits.** A saturated primary top app bar, decorative coloured headings, and small
   corner radii are all Material 2; M3 moved to surface-coloured bars, semantic colour, and larger
   radii.

Fixing those three is most of the visual work. The rest of this document covers the per-screen UX
problems, which are independent of theming and in places more serious.

---

## 1. Colour — a real tonal system

### Current state

The entire theme is `src/main.ts`:

```ts
theme: {
  defaultTheme: 'light',
  themes: {
    light: { colors: { primary: '#4a9c6f', secondary: '#1a1a2e' } },
  },
},
```

No container roles, no surface roles, no outline, no dark theme, no `variables` block.

### What M3 expects

M3 derives a full scheme from a single seed colour: primary/secondary/tertiary each with an
`on-` pair and a `-container` pair, a neutral family of surface containers at five elevations,
error roles, and outline roles. Colour is used _semantically_ — a container role means "this is a
tinted region", not "this is decorated".

We keep `#4a9c6f` as the seed. Note that M3 places `primary` at tone 40, so the light theme's
primary comes out darker than today's green; the original value survives in the container roles and
in the dark theme, where primary sits at tone 80. The app stays recognisable and gains AA contrast
on white, which the current `#4a9c6f` on white does not reliably have for small text.

### An important Vuetify/M3 naming conflict

**Vuetify's `surface-variant` is not M3's `surface-variant`.** Vuetify's light theme ships
`surface-variant: #424242` with `on-surface-variant: #EEEEEE` — a _dark_ pair on a light theme.
Every Vuetify component that consumes it treats it as an inverted surface:

| Consumer                           | Usage                               |
| ---------------------------------- | ----------------------------------- |
| `VSnackbar`                        | background + text colour            |
| `VSlider` (track, thumb)           | inactive track background           |
| `VField` `variant="solo-inverted"` | focused overlay background and text |
| `VTimePickerClock`                 | clock face background               |

That is M3's **`inverse-surface` / `inverse-on-surface`**, not M3's neutral `surface-variant`.
Dropping M3's light neutral into that slot would render snackbars light-text-on-light-background —
a real regression, and one that would only show up once snackbars land.

**Decision:** map Vuetify's `surface-variant` pair to M3's _inverse_ surface roles, and expose M3's
neutral surfaces as additional `surface-container-*` tokens. Vuetify's `Colors` interface has an
index signature (`[key: string]: Color`), so custom role names are fully supported and Vuetify emits
`--v-theme-<name>` custom properties plus `bg-`/`text-` utility classes for each.

### Proposed scheme

Seeded from `#4a9c6f` (hue ≈ 152). Validate against the official Material Theme Builder and adjust;
the structure matters more than the exact hexes.

| Role                        | Light     | Dark      | Notes                                            |
| --------------------------- | --------- | --------- | ------------------------------------------------ |
| `primary`                   | `#2C6B4F` | `#94D5AC` | tone 40 / tone 80                                |
| `on-primary`                | `#FFFFFF` | `#00391F` |                                                  |
| `primary-container`         | `#AFF0C9` | `#0F512F` |                                                  |
| `on-primary-container`      | `#00210F` | `#AFF0C9` |                                                  |
| `secondary`                 | `#4F6354` | `#B6CCB9` | desaturated neighbour of the seed                |
| `on-secondary`              | `#FFFFFF` | `#223527` |                                                  |
| `secondary-container`       | `#D1E8D5` | `#384B3C` |                                                  |
| `on-secondary-container`    | `#0D1F13` | `#D1E8D5` |                                                  |
| `tertiary`                  | `#3A656F` | `#A2CEDA` | analogous accent, for contrast against the green |
| `on-tertiary`               | `#FFFFFF` | `#013640` |                                                  |
| `tertiary-container`        | `#BDEAF6` | `#204D57` |                                                  |
| `on-tertiary-container`     | `#001F26` | `#BDEAF6` |                                                  |
| `error`                     | `#BA1A1A` | `#FFB4AB` | M3 standard error family                         |
| `on-error`                  | `#FFFFFF` | `#690005` |                                                  |
| `error-container`           | `#FFDAD6` | `#93000A` |                                                  |
| `on-error-container`        | `#410002` | `#FFDAD6` |                                                  |
| `background`                | `#F6FBF4` | `#0F1511` |                                                  |
| `on-background`             | `#171D19` | `#DFE4DE` |                                                  |
| `surface`                   | `#F6FBF4` | `#0F1511` |                                                  |
| `on-surface`                | `#171D19` | `#DFE4DE` |                                                  |
| `surface-bright`            | `#F6FBF4` | `#353B36` |                                                  |
| `surface-light`             | `#F0F5EE` | `#343B36` |                                                  |
| `surface-container-lowest`  | `#FFFFFF` | `#0A0F0C` | M3 neutral elevations                            |
| `surface-container-low`     | `#F0F5EE` | `#171D19` |                                                  |
| `surface-container`         | `#EAF0E8` | `#1B211D` | default card surface                             |
| `surface-container-high`    | `#E5EBE3` | `#262B27` |                                                  |
| `surface-container-highest` | `#DFE4DE` | `#303631` |                                                  |
| `surface-variant`           | `#2C322E` | `#DFE4DE` | **inverse surface** — see above                  |
| `on-surface-variant`        | `#EDF2EB` | `#2C322E` | **inverse on-surface**                           |
| `outline`                   | `#717972` | `#8B938C` |                                                  |
| `outline-variant`           | `#C0C9C0` | `#414942` |                                                  |

Also set `theme.variables` (`medium-emphasis-opacity`, `high-emphasis-opacity`, `border-opacity`,
`border-color`) — `MealPlanView.vue` already reads `--v-medium-emphasis-opacity`, and Vuetify only
emits those custom properties per theme.

### Dark mode

Vuetify 4 supports `defaultTheme: 'system'` natively and resolves it from
`prefers-color-scheme: dark` internally, exposing `isSystem`, `toggle()` and `cycle()` on the theme
instance. There is no need for a hand-rolled `matchMedia` composable — the only things we add are:

- persisting an explicit user override (`'system' | 'light' | 'dark'`) to localStorage, following
  the same hydrate-at-init pattern the recipe and meal-plan stores already use;
- keeping `<meta name="theme-color">` in sync with the resolved theme's surface colour.

The brand colour currently appears in three places that must not drift — `index.html`,
`vite.config.ts` (PWA manifest), and `src/main.ts`. Driving the meta tag at runtime removes one of
them and makes dark mode colour the browser chrome correctly.

---

## 2. Typography

Roboto is never loaded, so the whole M3 type scale is being rendered in a substitute face. This is
probably the single most-noticeable reason the app doesn't _feel_ Material.

**Self-host Roboto** rather than linking Google Fonts. This is an offline-first PWA; a CDN font is a
blocking third-party request that fails in airplane mode, and it causes a flash of unstyled text on
every cold start. Self-hosting also requires adding `woff2` to the workbox `globPatterns` in
`vite.config.ts` — currently `['**/*.{js,css,html,ico,png,svg}']` — or the font is not precached and
the offline experience gets _worse_, not better.

**The heading scale is inconsistent:** `text-h4` on Home, Recipes and Shopping List, `text-h5` on
Recipe Detail and Edit, `text-h6` on Meal Plan. Proposed mapping:

| Context                                                      | Class                             | M3 role        |
| ------------------------------------------------------------ | --------------------------------- | -------------- |
| Top-level screen titles                                      | `text-h5`                         | headline-small |
| Detail / edit titles (subordinate, behind a back affordance) | `text-h6`                         | title-large    |
| Section headers ("Ingredients")                              | `text-subtitle-1` + medium weight | title-medium   |
| Body copy                                                    | `text-body-2`                     | body-medium    |
| Metadata / captions                                          | `text-caption`                    | label-small    |

`text-h4` is oversized for a phone-first layout, and it is what makes Meal Plan's `text-h6` look
wrong by comparison.

**Drop `text-primary` from screen headings.** Coloured headings are not an M3 pattern — headings use
`on-surface`. Colour should carry meaning (state, action, severity), not decorate. Every screen title
in the app is currently green for no semantic reason.

---

## 3. Component defaults

`variant="tonal"`, `density="compact"` and `variant="outlined"` are retyped inline across nine files
and have already drifted. A `defaults` block in `createVuetify` makes one place responsible:

- `VCard: { rounded: 'lg' }` — M3 corner radii are noticeably larger than Vuetify's default. This
  single change does a surprising amount of the "feels like Material 3" work.
- `VBtn: { rounded: 'xl' }` — M3's pill buttons.
- `VTextField` / `VCombobox` / `VAutocomplete` / `VTextarea` / `VFileInput`:
  `{ variant: 'outlined' }`.
- `VChip`, `VList`, `VDialog`, `VAlert` — size, rounding and variant defaults.

Then strip the now-redundant inline props.

Related cleanups in the same area:

- `.search-match` and `.last-used` are byte-identical in `RecipesView.vue` and `MealPlanView.vue`.
- `class="gap-2"` in `MealPlanView.vue` is a dead class — Vuetify's gap utility is `ga-`, not `gap-`.
  It has never had any effect.
- `.ingredient-row` in `RecipeEditView.vue` has no CSS at all; it exists purely as a test selector
  and should be a `data-testid`.

---

## 4. Navigation

M3 selects a navigation pattern by window size class: a **navigation bar** at compact widths, a
**navigation rail** at medium, and a **navigation drawer** at expanded. This app shows a bottom
navigation bar at every width, which is correct on a phone and wrong on a desktop browser.

Other issues in `NavBar.vue`:

- The top app bar is `color="primary"` with elevation — the Material 2 look. M3 uses a
  surface-coloured bar, flat at rest, that picks up a tonal tint on scroll.
- Active state is computed from `route.path`, so `/recipes/:id` does not highlight the Recipes tab.
  Driving it from route _name_ (with a `meta.nav` field mapping detail and edit routes back to their
  section) fixes this.
- One label is truncated to `"Shop"` while the other three are unabbreviated.

### Layout magic numbers

Two places hard-code knowledge of the navigation chrome:

- `RecipesView.vue` — `.fab { bottom: 80px }`.
- `RecipeEditView.vue` — imperatively reads `.v-bottom-navigation`'s height from the DOM at runtime
  to compute a scroll offset.

Both break the moment the navigation changes height or is replaced by a rail. The fix is to expose
the bottom inset once as a CSS custom property (folding in `env(safe-area-inset-bottom)` for notched
devices) and consume it in both places; the imperative DOM read then deletes entirely.

---

## 5. Per-screen review

### Home

A reasonable M3 dashboard already. The two stat cards read as tappable because they are visually
similar to the three navigation cards below them — making the stats tonal (`primary-container`) and
giving the navigation cards leading icons that match the nav bar separates the two roles. The most
useful thing to surface on open is the next planned meal, and `mealPlan.getNextPlannedDate` already
exists to provide it.

### Recipes

The search field is a standard outlined text field with a floating label; M3's **search bar** is a
distinct component — rounded, filled with a container colour, no floating label. Archived recipes
are mixed into the same list, distinguished only by a chip; filter chips (labels are already
available via `knownLabels`, plus favourites-only and archived toggles) are the M3 answer.

The FAB should be an **extended FAB** with a visible "New recipe" label while the list is empty,
collapsing to icon-only once there are recipes — the standard M3 treatment for a primary action that
needs explaining on first run. Note the empty-state copy currently reads "Tap + to add one", which
stops being accurate as soon as the FAB changes.

### Recipe detail — the priority fix

This screen has the worst UX in the app. Five icon-only buttons sit in a row with:

- no visible labels,
- no tooltips,
- no `aria-label` — they are unusable with a screen reader,
- and **a destructive delete rendered at the same visual weight as a benign archive, directly
  adjacent to it**.

That last point is the serious one: adjacent equal-weight controls where one is irreversible is a
misclick waiting to happen. The M3-correct treatment:

| Action                       | Treatment                                                             | Why                                       |
| ---------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| Edit                         | Promoted to the primary action (FAB or filled button, with a label)   | It is the main thing you do here          |
| Favourite                    | Toggle in the app bar                                                 | It is a _state_, not an action            |
| Duplicate / Archive / Delete | Overflow menu in the app bar, with text labels; delete tinted `error` | Infrequent; separates the destructive one |

The app-bar overflow menu (`AppMenu.vue`) already implements exactly this pattern and is the
right shape to copy.
Anything that stays an icon button gets an `aria-label` and a tooltip.

Separately, the four stacked grey `text-body-2` paragraphs of metadata are not a Material metadata
treatment — a compact chip or definition row reads far better. The recipe URL is a bare `<a>` and
should be a button with an open-in-new icon.

### Recipe edit

Ingredient rows pack a 3/3/6 column grid, two compact checkboxes and a delete button into one line,
separated by dividers. On a phone this is cramped and the touch targets are below the 48dp minimum.
Making each ingredient a tonal card, and converting the "Main"/"Shop" checkboxes to M3 filter chips,
solves both the density and the target-size problem. The `block` Save button at the bottom of a long
form requires scrolling to reach; a bottom app bar action keeps it always available.

### Meal plan

Conceptually the strongest screen, visually the weakest — it is largely custom-built markup inside a
Material app. Expressing the day rows as M3 list items with a leading date element, and highlighting
today with `primary-container`, brings it back into the system. Empty days currently render as a
disabled-looking button; they need a clear "Add meal" affordance.

The separate whole-week edit-mode toggle has been removed. A filled day still navigates straight to
the recipe's detail view on tap (the most frequent action on this screen); a trailing kebab on the
chip opens a menu leading to a per-day "Edit meal" dialog, and tapping an empty day opens that same
dialog directly. This frees the FAB, previously spent on the edit-mode toggle, for the planned
automatic meal-recommendation feature.

### Shopping list — noted, deferred

This screen is being reworked separately and is **out of scope**. For the record, the issues are:
the list renders circle icons that look checkable but are inert; there is no tick-off state; and the
date range is not persisted, unlike the recipes and meal-plan stores, so it is lost on every reload.
The screen still inherits the new theme, type scale and component defaults automatically.

---

## 6. Cross-cutting

**Snackbars.** There is no transient feedback anywhere. Destructive and semi-destructive actions —
delete, archive and unarchive — confirm via a snackbar with an **Undo** action, the M3 pattern.

Undo replaces the delete confirmation dialog rather than sitting alongside it. The dialog existed
only because deletion was irreversible; once `restoreRecipe` can put a recipe back with its original
id, the dialog interrupts every delete to warn about a consequence that no longer applies, and its
"This can't be undone" copy is simply wrong. Material's model is to confirm a reversible action
after the fact, not to block it beforehand.

Two consequences of that are worth stating plainly, because the snackbar is now the only guard:

- Undo is a _compensating write_, not a deferred commit. `removeRecipe` writes to localStorage
  immediately and `restoreRecipe` writes again; nothing is held in a pending state. So a reload
  inside the undo window loses the chance to undo, because the snapshot is in memory while the
  deletion is already on disk.
- Raising a second snackbar within the window replaces the first and discards its undo. That is
  Material's own one-at-a-time model, and in practice deleting navigates you away from the recipe,
  so reaching another destructive action inside the window takes deliberate effort. A message
  queue in `useSnackbar` would close it if that ever proves wrong.

Undo-bearing messages get a longer timeout (10s) than plain notifications (6s) for this reason.

Import-overwrite is _not_ covered by a snackbar — `AppMenu.vue` does not raise one. It
still guards itself with an explicit warning and a confirm step in its dialog, which is the right
treatment since that action is genuinely irreversible.

**Empty states.** Four bare italic strings stand in for empty states. A shared component with an
icon, headline, supporting text and a primary action is both better UX and less duplication.

**Skeleton loaders — deliberately not doing.** All data is read synchronously from localStorage.
Adding artificial loading states to an instant app makes it feel slower.

**Motion.** M3's shared-axis transitions between sibling routes and a container transform into
detail views would give the app a sense of hierarchy. Keep them short (~200ms) and respect
`prefers-reduced-motion`.

**Accessibility.** The only `aria-label`s in the codebase are on the data menu button and the two
meal-plan note fields. Every icon-only button needs one. Touch targets under `density="compact"`
should be checked against the 48dp minimum, and `text-medium-emphasis` needs a contrast check
against the new surface colours in both themes.

---

## 7. PWA and brand

The icons are placeholders — 547 bytes at 192px, 1881 bytes at 512px, and a 101-byte 16×16 favicon.
There is no maskable variant, so Android crops the icon inside its adaptive-icon mask. The manifest
is missing `start_url`, `scope`, `orientation`, `categories`, `shortcuts` and `screenshots`; the last
of these is what unlocks the richer install prompt.

`theme_color` should track the new M3 surface colour and follow dark mode at runtime.

### Regenerating the icons

`public/icon.svg` is the source artwork — a cooking pot in the M3
`primary-container` / `on-primary-container` pair. Every PNG in `public/` is rendered from it:

| File                   | Size | Notes                                                                                                         |
| ---------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `pwa-192.png`          | 192  | manifest                                                                                                      |
| `pwa-512.png`          | 512  | manifest                                                                                                      |
| `pwa-maskable-512.png` | 512  | `purpose: maskable`; full-bleed background, artwork scaled to 72% so it survives Android's adaptive-icon crop |
| `apple-touch-icon.png` | 180  | iOS home screen                                                                                               |
| `favicon-96.png`       | 96   | PNG fallback for the SVG favicon                                                                              |

To regenerate after editing the SVG, rasterise it at each size against a transparent
background. Any renderer works; there is deliberately no build-time dependency for this, since
it runs once per artwork change rather than per build.

`favicon.ico` was dropped in favour of an SVG favicon with a PNG fallback — the old file was a
101-byte 16×16 placeholder.

---

## Implementation order

Each stage leaves the app working and the quality gate green, so they can land independently.

| Stage | Scope                                            |
| ----- | ------------------------------------------------ |
| 1     | M3 token foundation + dark mode                  |
| 2     | Typography — self-hosted Roboto, heading scale   |
| 3     | Global component defaults + style de-duplication |
| 4     | Navigation and layout                            |
| 5     | Per-screen UX                                    |
| 6     | Snackbars, empty states, motion, accessibility   |
| 7     | PWA and brand assets                             |

Stage 3 carries the highest test-breakage risk: changing global `variant`/`density` alters rendered
markup, and a number of component tests assert on Vuetify's internal class names. Those assertions
should migrate to `data-testid` hooks as each file is touched.
