<script setup lang="ts">
import { useShoppingListStore } from '@/stores/shoppingList'

const store = useShoppingListStore()
</script>

<template>
  <div class="shopping-list">
    <h1>Shopping List</h1>

    <section class="date-picker">
      <h2>Select Date Range</h2>
      <div class="date-inputs">
        <div class="form-group">
          <label for="start">From</label>
          <input id="start" v-model="store.startDate" type="date" />
        </div>
        <div class="form-group">
          <label for="end">To</label>
          <input id="end" v-model="store.endDate" type="date" />
        </div>
      </div>
    </section>

    <section v-if="store.startDate && store.endDate" class="list-section">
      <h2>Ingredients</h2>
      <p v-if="store.items.length === 0" class="empty">No ingredients found for this period.</p>
      <ul v-else>
        <li v-for="item in store.items" :key="item">{{ item }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.shopping-list {
  padding: 1rem 0;
}

h1 {
  font-size: 2rem;
  color: #4a9c6f;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
}

section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.date-inputs {
  display: flex;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
}

input[type='date'] {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

input[type='date']:focus {
  outline: none;
  border-color: #4a9c6f;
}

.empty {
  color: #999;
  font-style: italic;
}

ul {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
}

li {
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9rem;
}
</style>
