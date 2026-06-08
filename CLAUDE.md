# Hungry Halflings Hearty Handbook

A Vue 3 PWA meal planning application. Manage recipes, assign them to calendar dates, and derive
shopping lists for any date range.

## Tech Stack

- **Vue 3** with Composition API + `<script setup>`
- **TypeScript** — strict mode
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
  main.ts              # App entry point
  App.vue              # Root component (NavBar + RouterView)
  router/index.ts      # Route definitions (hash history)
  stores/
    recipes.ts         # Pinia store: recipe CRUD
    mealPlan.ts        # Pinia store: date → recipe assignments
    shoppingList.ts    # Pinia store: derived ingredient list
  views/
    HomeView.vue       # Dashboard with summary counts
    RecipesView.vue    # Recipe list and add/remove
    MealPlanView.vue   # Week calendar with recipe assignment
    ShoppingListView.vue  # Date range + ingredient list
  components/
    NavBar.vue         # Top navigation
```

## Quality Gates

Every commit runs via the Husky pre-commit hook:

1. `npm run format:check` — Prettier on all files
2. `npm run lint` — ESLint on all files
3. `npm run type-check` — vue-tsc on all source files
4. `npm run test:coverage` — all Vitest tests with coverage

CI runs the same steps on every push, plus a final `npm run build`.

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the `deploy` workflow.
App URL: https://peldszus.github.io/hungry-halflings-hearty-handbook/

GitHub Pages must be configured once in repo Settings → Pages → Source → `gh-pages` branch.

Hash-based routing (`#/recipes`) is used for full GitHub Pages compatibility.

## Environment Variables

| Variable        | Default | Description                                                         |
| --------------- | ------- | ------------------------------------------------------------------- |
| `VITE_BASE_URL` | `/`     | Asset base path — set to `/hungry-halflings-hearty-handbook/` in CI |
