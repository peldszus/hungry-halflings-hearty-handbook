import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSnackbar } from './useSnackbar'

describe('useSnackbar', () => {
  beforeEach(() => {
    useSnackbar().dismiss()
  })

  it('shows a message', () => {
    const { show, visible, current } = useSnackbar()
    show({ text: 'Saved' })

    expect(visible.value).toBe(true)
    expect(current.value?.text).toBe('Saved')
  })

  it('dismisses a message', () => {
    const { show, dismiss, visible } = useSnackbar()
    show({ text: 'Saved' })
    dismiss()

    expect(visible.value).toBe(false)
  })

  it('shares state across call sites so one host renders every message', () => {
    const raiser = useSnackbar()
    const host = useSnackbar()

    raiser.show({ text: 'From elsewhere' })

    expect(host.visible.value).toBe(true)
    expect(host.current.value?.text).toBe('From elsewhere')
  })

  describe('showUndo', () => {
    it('offers an Undo action alongside the message', () => {
      const { showUndo, current } = useSnackbar()
      showUndo('Deleted Pasta', () => {})

      expect(current.value?.text).toBe('Deleted Pasta')
      expect(current.value?.action?.label).toBe('Undo')
    })

    it('runs the undo handler and dismisses when the action fires', () => {
      const { showUndo, current, visible } = useSnackbar()
      const undo = vi.fn()
      showUndo('Deleted Pasta', undo)

      current.value?.action?.handler()

      expect(undo).toHaveBeenCalledOnce()
      expect(visible.value).toBe(false)
    })
  })
})
