<script setup>
import { ref } from 'vue'
defineProps({ label: { type: String, required: true }, busy: Boolean })
defineEmits(['confirm'])
const confirming = ref(false)
</script>

<template>
  <div class="delete-control">
    <button v-if="!confirming" type="button" class="danger" :disabled="busy" :aria-label="`Delete ${label}`" @click="confirming = true">Delete</button>
    <div v-else class="confirm-box" role="group" :aria-label="`Confirm deletion of ${label}`">
      <p>Delete {{ label }} and all related enrollments?</p>
      <button type="button" class="danger" :disabled="busy" @click="$emit('confirm')">{{ busy ? 'Deleting…' : 'Confirm delete' }}</button>
      <button type="button" :disabled="busy" @click="confirming = false">Cancel</button>
    </div>
  </div>
</template>
