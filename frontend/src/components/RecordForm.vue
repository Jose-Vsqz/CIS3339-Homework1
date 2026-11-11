<script setup>
import { reactive, ref } from 'vue'
const props = defineProps({
  fields: { type: Array, required: true },
  prefix: { type: String, required: true },
  busy: Boolean,
  submitLabel: { type: String, default: 'Save' },
})
const emit = defineEmits(['submit'])
const values = reactive(Object.fromEntries(props.fields.map(field => [field.name, ''])))
const validation = ref('')
function submit() {
  if (props.busy) return
  const missing = props.fields.find(field => !values[field.name].trim())
  if (missing) { validation.value = `${missing.label} is required.`; return }
  validation.value = ''
  emit('submit', Object.fromEntries(props.fields.map(field => [field.name, values[field.name].trim()])))
}
function reset() {
  for (const field of props.fields) values[field.name] = ''
  validation.value = ''
}
defineExpose({ reset })
</script>

<template>
  <form @submit.prevent="submit" :aria-busy="busy">
    <fieldset :disabled="busy">
      <div v-for="field in fields" :key="field.name" class="field">
        <label :for="`${prefix}-${field.name}`">{{ field.label }} <span class="required">(required)</span></label>
        <input :id="`${prefix}-${field.name}`" v-model="values[field.name]" :name="field.name"
          :type="field.type || 'text'" :maxlength="field.maxlength" :autocomplete="field.autocomplete || 'off'" required>
      </div>
      <p v-if="validation" class="notice error" role="alert">{{ validation }}</p>
      <button class="primary" type="submit">{{ busy ? 'Saving…' : submitLabel }}</button>
    </fieldset>
  </form>
</template>
