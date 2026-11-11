<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRecordsStore } from '../stores/records.js'
import { useTask } from '../composables/useTask.js'
import FeedbackMessage from '../components/FeedbackMessage.vue'
import LoadingState from '../components/LoadingState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const props = defineProps({ id: { type: String, required: true } })
const store = useRecordsStore()
const router = useRouter()
const student = ref(null)
const { busy, error, success, run } = useTask()
async function load() { await run(async () => { student.value = await store.getStudent(props.id) }) }
async function remove() {
  if (await run(() => store.deleteStudent(props.id), 'Student and related enrollments deleted.')) student.value = null
}
onMounted(load)
</script>

<template>
  <RouterLink class="back-link" to="/students">← Back to students</RouterLink>
  <div class="page-heading"><div><p class="eyebrow">Student record</p><h1>Student details</h1><p class="intro">Contact information and student identification.</p></div></div>
  <FeedbackMessage :error="error" :success="success" />
  <LoadingState v-if="busy" label="Loading student details…" />
  <section v-if="student" class="panel detail-panel" aria-label="Student details" :aria-busy="busy">
    <h2>{{ student.name }}</h2>
    <dl><dt>Student ID</dt><dd>{{ student.id }}</dd><dt>Phone</dt><dd>{{ student.phone }}</dd><dt>ZIP code</dt><dd>{{ student.zip }}</dd></dl>
    <DeleteConfirm :label="`${student.name} (${student.id})`" :busy="busy" @confirm="remove" />
  </section>
  <div v-else-if="!busy && !success" class="panel"><p>Student details are unavailable.</p><button type="button" @click="load">Retry</button></div>
  <button v-if="success" type="button" @click="router.push('/students')">Return to student directory</button>
</template>
