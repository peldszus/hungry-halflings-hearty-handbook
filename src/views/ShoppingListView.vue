<script setup lang="ts">
import { mdiCheckboxBlankCircleOutline } from '@mdi/js'
import { useShoppingListStore, type ShoppingListItem } from '@/stores/shoppingList'

const store = useShoppingListStore()

function itemLabel(item: ShoppingListItem) {
  const parts: string[] = []
  if (item.quantity != null) parts.push(String(item.quantity))
  if (item.unit) parts.push(item.unit)
  parts.push(item.ingredient)
  return parts.join(' ')
}
</script>

<template>
  <v-container>
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
          :prepend-icon="mdiCheckboxBlankCircleOutline"
        >
          <v-list-item-title>{{ itemLabel(item) }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>
