<script setup>
defineProps({ error: String, success: String })
</script>

<template>
  <div class="feedback" aria-live="polite" aria-atomic="true">
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <p v-if="success" class="notice success" role="status">{{ success }}</p>
  </div>
</template>
