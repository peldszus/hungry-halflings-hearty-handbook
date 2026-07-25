# Hungry Halflings Hearty Handbook

A Vue 3 PWA meal planning application. Manage recipes, assign them to calendar dates, and derive
shopping lists for any date range.

## Tech Stack

- **Vue 3** with Composition API + `<script setup>`
- **TypeScript** — strict mode
- **Vuetify 4** — Material Design 3 component library (auto-imported via `vite-plugin-vuetify`)
- **@mdi/js** — Material Design icons as tree-shaken SVG paths (never the icon font)
- **Vite** — build tool and dev server
- **Pinia** — state management (recipes, meal plan, shopping list)
- **Vue Router** — hash history (required for GitHub Pages)
- **vite-plugin-pwa** — service worker + web app manifest
- **Vitest** — unit tests with V8 coverage
- **ESLint 9** (flat config) + **Prettier** — linting and formatting
- **Husky** — pre-commit hooks

## Commands

| Command                 | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Start dev server at http://localhost:5173 |
| `npm run build`         | Type-check then build for production      |
| `npm run preview`       | Preview production build                  |
| `npm run format`        | Rewrite all files with Prettier           |
| `npm run format:check`  | Check formatting without rewriting        |
| `npm run lint`          | Run ESLint on all files                   |
| `npm run type-check`    | Run vue-tsc on all source files           |
| `npm run test`          | Run all tests                             |
| `npm run test:coverage` | Run all tests with V8 coverage            |

## Project Structure

```
src/
  main.ts              # App entry point — Vuetify, Pinia and router wiring
  App.vue              # Root component (v-app > NavBar + RouterView)
  router/index.ts      # Route definitions (hash history)
  stores/
    recipes.ts         # Pinia store: recipe CRUD (localStorage key 'recipes')
    mealPlan.ts        # Pinia store: date → recipe assignments (key 'mealPlan')
    shoppingList.ts    # Pinia store: derived ingredient list (not persisted)
  views/
    HomeView.vue       # Dashboard with summary counts
    RecipesView.vue    # Recipe list, search and add
    RecipeDetailView.vue  # Single recipe: actions, metadata, ingredients
    RecipeEditView.vue    # Add/edit recipe form (also used for /recipes/new)
    MealPlanView.vue      # Week calendar with recipe assignment and notes
    ShoppingListView.vue  # Date range + ingredient list
  components/
    NavBar.vue         # Top app bar + bottom navigation
    AppMenu.vue        # App bar overflow menu: theme options, export/import
    ThemeMenuItems.vue # Theme preference list items, rendered inside AppMenu
  utils/
    dataTransfer.ts    # Export/import serialisation and validation
    highlight.ts       # Search-term highlighting
    relativeTime.ts    # "3 days ago" style formatting
```

Tests are colocated next to their source as `*.test.ts`.

## Design System

The app follows Material Design 3 via Vuetify 4. See
[`docs/material-design-review.md`](docs/material-design-review.md) for the full design review and
the reasoning behind the token choices.

- **`src/theme.ts` is the single source of truth** for colours, theme variables and component
  defaults. Do not add inline `variant`/`density`/`rounded` props that duplicate a global default,
  and do not hard-code colours in component styles — use theme tokens.
- **Vuetify's `surface-variant` is M3's `inverse-surface`**, not M3's neutral surface variant.
  Vuetify uses it for snackbar, slider track and `solo-inverted` field backgrounds, so it holds a
  _dark_ value in the light theme. M3's neutral surfaces are exposed as `surface-container-*`.
- Icons come from `@mdi/js` as individual path imports (`import { mdiPlus } from '@mdi/js'`).
  Never switch to `@mdi/font` or Material Symbols — the SVG paths are tree-shaken and the font
  is not.
- Colour is semantic. Headings use `on-surface`, not `text-primary`.
- `public/icon.svg` is the source for every app icon; the PNGs beside it are rendered from it.
  See the design review for sizes and the maskable safe-zone requirement.
- The brand colour lives in three places that must stay in sync: `src/theme.ts` (the source of
  truth), `index.html`'s `theme-color` meta, and the PWA manifest in `vite.config.ts`. The meta
  tag is updated at runtime by `useAppTheme` so it follows dark mode.

## Quality Gates

Every commit runs via the Husky pre-commit hook:

1. `npm run format:check` — Prettier on all files
2. `npm run lint` — ESLint on all files
3. `npm run type-check` — vue-tsc on all source files
4. `npm run test:coverage` — all Vitest tests with coverage

CI runs the same steps on every push, plus a final `npm run build`.

## Deployment

Two environments are deployed to the same `gh-pages` branch:

- **Production** — pushes to `main` deploy via the `deploy` workflow to the branch root.
  URL: https://peldszus.github.io/hungry-halflings-hearty-handbook/
- **Staging** — pushes to any branch _except_ `main` deploy via the `deploy-staging`
  workflow to the `staging/` subdirectory.
  URL: https://peldszus.github.io/hungry-halflings-hearty-handbook/staging/

Staging is a single shared slot (last push to any non-`main` branch wins). The staging
deploy uses `destination_dir: staging`, which scopes its cleanup to the `staging/` folder
and leaves production untouched. The production deploy uses `keep_files: true` so it
preserves the `staging/` folder rather than wiping the branch root. Both deploy workflows
share a `github-pages` concurrency group so they never push to `gh-pages` at the same time.

GitHub Pages must be configured once in repo Settings → Pages → Source → `gh-pages` branch.

Hash-based routing (`#/recipes`) is used for full GitHub Pages compatibility.

## Environment Variables

| Variable        | Default | Description                                                                                                                     |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_BASE_URL` | `/`     | Asset base path — `/hungry-halflings-hearty-handbook/` for production, `/hungry-halflings-hearty-handbook/staging/` for staging |

## Pull Requests

After opening a pull request, always subscribe to its activity and monitor it until it is
merged or closed: watch CI and push fixes for failures, and respond to review comments
(asking for clarification when a request is ambiguous).

Note the limitation: subscriptions reliably deliver CI **failures** and review comments,
but webhooks do not emit CI **success**, new pushes, or merge-conflict transitions. Without
a self-scheduling mechanism, a passing or mergeable state may need a manual re-check.
