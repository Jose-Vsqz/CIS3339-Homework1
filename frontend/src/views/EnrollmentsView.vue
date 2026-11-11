<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRecordsStore } from '../stores/records.js'
import { useTask } from '../composables/useTask.js'
import { studentColumns } from '../fields.js'
import RecordTable from '../components/RecordTable.vue'
import FeedbackMessage from '../components/FeedbackMessage.vue'
import LoadingState from '../components/LoadingState.vue'

const store = useRecordsStore()
const { busy, error, success, run } = useTask()
const studentId = ref('')
const courseId = ref('')
const rosterCourseId = ref('')
const roster = ref(null)
const rosterError = ref('')
const rosterBusy = ref(false)
const ready = ref(false)
let rosterRequest = 0
const students = computed(() => store.students.toSorted((a, b) => a.name.localeCompare(b.name)))
const courses = computed(() => store.courses.toSorted((a, b) => a.id.localeCompare(b.id)))
const canEnroll = computed(() => ready.value && students.value.length > 0 && courses.value.length > 0)
async function refresh() {
  await run(async () => {
    ready.value = false
    await store.loadAll()
    ready.value = true
    if (!store.students.some(student => student.id === studentId.value)) studentId.value = ''
    if (!store.courses.some(course => course.id === courseId.value)) courseId.value = ''
    if (!store.courses.some(course => course.id === rosterCourseId.value)) rosterCourseId.value = ''
    else if (rosterCourseId.value) await loadRoster()
  })
}
async function loadRoster() {
  const requestId = ++rosterRequest
  const id = rosterCourseId.value
  roster.value = null
  rosterError.value = ''
  rosterBusy.value = Boolean(id)
  if (!id) return
  try {
    const result = await store.getRoster(id)
    if (requestId === rosterRequest) roster.value = result
  } catch (failure) {
    if (requestId === rosterRequest) rosterError.value = failure.message
  } finally { if (requestId === rosterRequest) rosterBusy.value = false }
}
async function enroll() {
  if (!studentId.value || !courseId.value) { error.value = 'Select an existing student and course.'; return }
  const selectedCourse = courseId.value
  if (await run(() => store.enroll({ studentId: studentId.value, courseId: selectedCourse }), 'Student enrolled successfully.')) {
    if (rosterCourseId.value === selectedCourse) await loadRoster()
    else rosterCourseId.value = selectedCourse
  }
}
watch(rosterCourseId, loadRoster)
onBeforeUnmount(() => { rosterRequest++ })
onMounted(refresh)
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">Students & courses</p><h1>Enrollments</h1><p class="intro">Connect students with courses and review each course roster.</p></div><button type="button" :disabled="busy" @click="refresh">Refresh records</button></div>
  <FeedbackMessage :error="error" :success="success" />
  <LoadingState v-if="busy" label="Updating enrollment records…" />
  <div class="workspace">
    <section class="panel" aria-labelledby="enroll-title"><h2 id="enroll-title">Enroll a student</h2>
      <p v-if="ready && !canEnroll" class="empty">Add at least one <RouterLink to="/students">student</RouterLink> and one <RouterLink to="/courses">course</RouterLink> before enrolling.</p>
      <form @submit.prevent="enroll" :aria-busy="busy"><fieldset :disabled="busy || !canEnroll">
        <div class="field"><label for="enroll-student">Student <span class="required">(required)</span></label><select id="enroll-student" v-model="studentId" required><option disabled value="">Select a student</option><option v-for="student in students" :key="student.id" :value="student.id">{{ student.name }} ({{ student.id }})</option></select></div>
        <div class="field"><label for="enroll-course">Course <span class="required">(required)</span></label><select id="enroll-course" v-model="courseId" required><option disabled value="">Select a course</option><option v-for="course in courses" :key="course.id" :value="course.id">{{ course.id }} — {{ course.name }}</option></select></div>
        <button type="submit" class="primary">{{ busy ? 'Saving…' : 'Enroll student' }}</button>
      </fieldset></form>
    </section>
    <section class="panel records-panel" aria-labelledby="roster-title" :aria-busy="rosterBusy">
      <h2 id="roster-title">Course roster</h2>
      <div class="field"><label for="roster-course">Select a course to view its students</label><select id="roster-course" v-model="rosterCourseId" :disabled="busy || !ready || !courses.length"><option value="">Select a course</option><option v-for="course in courses" :key="course.id" :value="course.id">{{ course.id }} — {{ course.name }}</option></select></div>
      <FeedbackMessage :error="rosterError" />
      <LoadingState v-if="rosterBusy" label="Loading course roster…" />
      <button v-if="rosterError" type="button" :disabled="rosterBusy" @click="loadRoster">Retry roster</button>
      <template v-if="roster"><h3>{{ roster.course.name }}</h3><RecordTable :records="roster.students" :columns="studentColumns" :caption="`Students enrolled in ${roster.course.id}`" empty="No students enrolled in this course yet." /></template>
      <p v-else-if="!rosterBusy && !rosterError" class="empty">Choose a course to see its enrolled students.</p>
    </section>
  </div>
</template>
