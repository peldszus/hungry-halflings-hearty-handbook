<script setup lang="ts">
import { useShoppingListStore } from '@/stores/shoppingList'

const store = useShoppingListStore()
</script>

<template>
  <v-container>
    <h1 class="text-h4 text-primary mb-4">Shopping List</h1>

    <v-card class="mb-4">
      <v-card-title>Select Date Range</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field v-model="store.startDate" label="From" type="date" hide-details />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="store.endDate" label="To" type="date" hide-details />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card v-if="store.startDate && store.endDate">
      <v-card-title>Ingredients</v-card-title>
      <v-card-text v-if="store.items.length === 0" class="text-medium-emphasis font-italic">
        No ingredients found for this period.
      </v-card-text>
      <v-list v-else>
        <v-list-item
          v-for="item in store.items"
          :key="`${item.ingredient}::${item.unit ?? ''}`"
          prepend-icon="mdi-checkbox-blank-circle-outline"
        >
          <v-list-item-title>
            <span v-if="item.quantity != null">{{ item.quantity }}</span>
            <span v-if="item.unit">{{ item.unit }}</span>
            {{ item.ingredient }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>
