import { ref } from 'vue'

export function useTask() {
  const busy = ref(false)
  const error = ref('')
  const success = ref('')
  async function run(action, message = '') {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    success.value = ''
    try {
      await action()
      success.value = message
      return true
    } catch (failure) {
      error.value = failure.message || 'Something went wrong. Please try again.'
      return false
    } finally { busy.value = false }
  }
  return { busy, error, success, run }
}
