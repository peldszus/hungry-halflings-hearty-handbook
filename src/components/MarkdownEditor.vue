<script setup lang="ts">
import { ref } from 'vue'
import {
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatHeader1,
  mdiFormatHeader2,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiLink,
  mdiCodeTags,
} from '@mdi/js'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function wrapSelection(prefix: string, suffix: string = prefix) {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = textarea.value.substring(start, end)
  const newText =
    textarea.value.substring(0, start) +
    prefix +
    selectedText +
    suffix +
    textarea.value.substring(end)

  emit('update:modelValue', newText)

  // Restore cursor position after Vue updates the DOM
  requestAnimationFrame(() => {
    textarea.focus()
    const newCursorPos = selectedText
      ? start + prefix.length + selectedText.length + suffix.length
      : start + prefix.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  })
}

function insertAtLineStart(prefix: string) {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1
  const newText =
    textarea.value.substring(0, lineStart) + prefix + textarea.value.substring(lineStart)

  emit('update:modelValue', newText)

  requestAnimationFrame(() => {
    textarea.focus()
    const newCursorPos = start + prefix.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  })
}

function insertLink() {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = textarea.value.substring(start, end) || 'link text'
  const newText =
    textarea.value.substring(0, start) + `[${selectedText}](url)` + textarea.value.substring(end)

  emit('update:modelValue', newText)

  requestAnimationFrame(() => {
    textarea.focus()
    // Select 'url' for easy replacement
    const urlStart = start + selectedText.length + 3
    textarea.setSelectionRange(urlStart, urlStart + 3)
  })
}

const tools = [
  {
    icon: mdiFormatBold,
    action: () => wrapSelection('**'),
    title: 'Bold (Ctrl+B)',
    shortcut: 'bold',
  },
  {
    icon: mdiFormatItalic,
    action: () => wrapSelection('*'),
    title: 'Italic (Ctrl+I)',
    shortcut: 'italic',
  },
  {
    icon: mdiFormatHeader1,
    action: () => insertAtLineStart('# '),
    title: 'Heading 1',
    shortcut: 'h1',
  },
  {
    icon: mdiFormatHeader2,
    action: () => insertAtLineStart('## '),
    title: 'Heading 2',
    shortcut: 'h2',
  },
  {
    icon: mdiFormatListBulleted,
    action: () => insertAtLineStart('- '),
    title: 'Bullet list',
    shortcut: 'ul',
  },
  {
    icon: mdiFormatListNumbered,
    action: () => insertAtLineStart('1. '),
    title: 'Numbered list',
    shortcut: 'ol',
  },
  { icon: mdiLink, action: () => insertLink(), title: 'Link', shortcut: 'link' },
  { icon: mdiCodeTags, action: () => wrapSelection('`'), title: 'Inline code', shortcut: 'code' },
] as const
</script>

<template>
  <div class="markdown-editor">
    <div class="toolbar">
      <v-btn
        v-for="tool in tools"
        :key="tool.shortcut"
        icon
        size="small"
        variant="text"
        :aria-label="tool.title"
        :title="tool.title"
        @click="tool.action"
      >
        <v-icon :icon="tool.icon" size="18" />
      </v-btn>
    </div>
    <v-textarea
      ref="textareaRef"
      :model-value="modelValue"
      rows="5"
      auto-grow
      placeholder="Add notes with markdown formatting..."
      hide-details="auto"
      data-testid="notes-editor"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.markdown-editor {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.23);
  border-radius: 4px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: rgba(var(--v-theme-surface-variant));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  flex-wrap: wrap;
}

.markdown-editor :deep(.v-textarea textarea) {
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
