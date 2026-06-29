<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import {
  buildBackup,
  downloadBackup,
  parseBackup,
  summarize,
  type BackupData,
  type DatabaseStats,
} from '@/utils/dataTransfer'

const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const importDialog = ref(false)
const selectedFile = ref<File | null>(null)
const parsedBackup = ref<BackupData | null>(null)
const importError = ref('')

const fileStats = computed<DatabaseStats | null>(() =>
  parsedBackup.value ? summarize(parsedBackup.value.recipes, parsedBackup.value.mealPlan) : null
)

const currentStats = computed<DatabaseStats>(() =>
  summarize(recipesStore.recipes, mealPlanStore.entries)
)

function formatDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function exportData() {
  downloadBackup(buildBackup(recipesStore.recipes, mealPlanStore.entries))
}

function resetImport() {
  selectedFile.value = null
  parsedBackup.value = null
  importError.value = ''
}

function openImportDialog() {
  resetImport()
  importDialog.value = true
}

function closeImportDialog() {
  importDialog.value = false
  resetImport()
}

async function onFileSelected(file: File | null) {
  parsedBackup.value = null
  importError.value = ''
  if (!file) return
  const text = await file.text()
  const result = parseBackup(text)
  if ('error' in result) {
    importError.value = result.error
  } else {
    parsedBackup.value = result.data
  }
}

function confirmImport() {
  if (!parsedBackup.value) return
  recipesStore.replaceAll(parsedBackup.value.recipes)
  mealPlanStore.replaceAll(parsedBackup.value.mealPlan)
  closeImportDialog()
}

defineExpose({
  importDialog,
  parsedBackup,
  importError,
  fileStats,
  exportData,
  openImportDialog,
  onFileSelected,
  confirmImport,
  closeImportDialog,
})
</script>

<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn icon="mdi-dots-vertical" v-bind="props" aria-label="Data menu" />
    </template>
    <v-list>
      <v-list-item
        prepend-icon="mdi-download"
        title="Export data"
        data-testid="export-data"
        @click="exportData"
      />
      <v-list-item
        prepend-icon="mdi-upload"
        title="Import data"
        data-testid="import-data"
        @click="openImportDialog"
      />
    </v-list>
  </v-menu>

  <v-dialog v-model="importDialog" max-width="520" @update:model-value="(v) => !v && resetImport()">
    <v-card>
      <v-card-title>Import data</v-card-title>
      <v-card-text>
        <v-file-input
          label="Select backup file"
          accept=".json,application/json"
          prepend-icon="mdi-paperclip"
          density="compact"
          variant="outlined"
          :model-value="selectedFile"
          @update:model-value="
            (f) => {
              selectedFile = Array.isArray(f) ? (f[0] ?? null) : f
              onFileSelected(selectedFile)
            }
          "
        />

        <v-alert v-if="importError" type="error" variant="tonal" data-testid="import-error">
          {{ importError }}
        </v-alert>

        <template v-if="fileStats">
          <v-alert type="warning" variant="tonal" class="mb-4">
            Importing replaces your entire database. This cannot be undone.
          </v-alert>

          <v-table density="compact" data-testid="import-preview">
            <thead>
              <tr>
                <th></th>
                <th class="text-right">In file</th>
                <th class="text-right">Current</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Recipes</td>
                <td class="text-right">{{ fileStats.recipeCount }}</td>
                <td class="text-right">{{ currentStats.recipeCount }}</td>
              </tr>
              <tr>
                <td>Planned meals</td>
                <td class="text-right">{{ fileStats.plannedMealCount }}</td>
                <td class="text-right">{{ currentStats.plannedMealCount }}</td>
              </tr>
              <tr>
                <td>Last planned meal</td>
                <td class="text-right">{{ formatDate(fileStats.lastMealDate) }}</td>
                <td class="text-right">{{ formatDate(currentStats.lastMealDate) }}</td>
              </tr>
              <tr>
                <td>Exported</td>
                <td class="text-right">{{ formatDate(parsedBackup?.exportedAt) }}</td>
                <td class="text-right">—</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeImportDialog">Cancel</v-btn>
        <v-btn
          v-if="fileStats"
          color="error"
          variant="text"
          data-testid="confirm-import"
          @click="confirmImport"
        >
          Overwrite
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
