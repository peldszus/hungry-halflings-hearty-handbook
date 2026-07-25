import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * Which navigation destination this route belongs to. Detail and edit routes map back to
     * their section so the navigation highlights correctly on e.g. /recipes/:id — matching on
     * the path alone left no destination selected.
     */
    nav?: 'home' | 'recipes' | 'meal-plan' | 'shopping-list'
    /** Screen title, shown in the top app bar. */
    title?: string
  }
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { nav: 'home', title: 'Meal Planner' },
    },
    {
      path: '/recipes',
      name: 'recipes',
      component: () => import('@/views/RecipesView.vue'),
      meta: { nav: 'recipes', title: 'Recipes' },
    },
    {
      path: '/meal-plan',
      name: 'meal-plan',
      component: () => import('@/views/MealPlanView.vue'),
      meta: { nav: 'meal-plan', title: 'Meal Plan' },
    },
    {
      path: '/shopping-list',
      name: 'shopping-list',
      component: () => import('@/views/ShoppingListView.vue'),
      meta: { nav: 'shopping-list', title: 'Shopping List' },
    },
    {
      path: '/recipes/new',
      name: 'recipe-new',
      component: () => import('@/views/RecipeEditView.vue'),
      meta: { nav: 'recipes', title: 'Add Recipe' },
    },
    {
      path: '/recipes/:id',
      name: 'recipe-detail',
      component: () => import('@/views/RecipeDetailView.vue'),
      meta: { nav: 'recipes', title: 'Recipe' },
    },
    {
      path: '/recipes/:id/edit',
      name: 'recipe-edit',
      component: () => import('@/views/RecipeEditView.vue'),
      meta: { nav: 'recipes', title: 'Edit Recipe' },
    },
  ],
})

const APP_NAME = 'Hungry Halflings Hearty Handbook'

// Gives each screen its own entry in the browser history menu and the PWA task switcher.
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
})

export default router
