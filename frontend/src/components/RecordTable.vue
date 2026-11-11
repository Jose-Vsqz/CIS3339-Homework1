<script setup>
defineProps({
  records: { type: Array, required: true },
  columns: { type: Array, required: true },
  caption: { type: String, required: true },
  empty: { type: String, default: 'No records yet.' },
  actions: Boolean,
})
</script>

<template>
  <p v-if="!records.length" class="empty" role="status">{{ empty }}</p>
  <div v-else class="table-scroll" role="region" :aria-label="caption" tabindex="0">
    <table>
      <caption class="sr-only">{{ caption }}</caption>
      <thead><tr><th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th><th v-if="actions" scope="col">Actions</th></tr></thead>
      <tbody>
        <tr v-for="record in records" :key="record.id">
          <td v-for="column in columns" :key="column.key">{{ record[column.key] }}</td>
          <td v-if="actions"><slot name="actions" :record="record" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
