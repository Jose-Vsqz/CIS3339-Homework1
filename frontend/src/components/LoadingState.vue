<script setup>
defineProps({ label: { type: String, default: 'Loading records…' } })
</script>

<template><p class="loading" role="status"><span class="spinner" aria-hidden="true"></span>{{ label }}</p></template>
