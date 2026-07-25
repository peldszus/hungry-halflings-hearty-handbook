import { ref } from 'vue'

export interface SnackbarAction {
  label: string
  handler: () => void
}

export interface SnackbarMessage {
  text: string
  action?: SnackbarAction
  timeout?: number
}

// Module-level so any component can raise a message and the single host in App.vue shows it.
const visible = ref(false)
const current = ref<SnackbarMessage | null>(null)

export function useSnackbar() {
  function show(message: SnackbarMessage) {
    current.value = message
    visible.value = true
  }

  /**
   * Confirms a reversible action and offers to undo it — Material's answer to destructive
   * actions. Running the undo handler dismisses the snackbar.
   */
  function showUndo(text: string, undo: () => void) {
    show({
      text,
      action: {
        label: 'Undo',
        handler: () => {
          undo()
          dismiss()
        },
      },
    })
  }

  function dismiss() {
    visible.value = false
  }

  return { visible, current, show, showUndo, dismiss }
}
