<template>
  <nav>
    <div class="nav-brand">Hungry Halflings</div>
    <div class="nav-links">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/recipes">Recipes</RouterLink>
      <RouterLink to="/meal-plan">Meal Plan</RouterLink>
      <RouterLink to="/shopping-list">Shopping List</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #4a9c6f;
  color: white;
  gap: 1rem;
}

.nav-brand {
  font-size: 1.2rem;
  font-weight: 700;
  white-space: nowrap;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  background: rgba(255, 255, 255, 0.2);
}
</style>
