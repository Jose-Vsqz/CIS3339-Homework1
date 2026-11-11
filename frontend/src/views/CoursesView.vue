<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRecordsStore } from '../stores/records.js'
import { useTask } from '../composables/useTask.js'
import { courseFields, courseColumns } from '../fields.js'
import RecordForm from '../components/RecordForm.vue'
import RecordTable from '../components/RecordTable.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'
import FeedbackMessage from '../components/FeedbackMessage.vue'
import LoadingState from '../components/LoadingState.vue'

const store = useRecordsStore()
const { busy, error, success, run } = useTask()
const form = ref(null)
const loaded = ref(false)
const records = computed(() => store.courses.toSorted((a, b) => a.id.localeCompare(b.id)))
async function refresh() { await run(async () => { await store.loadCourses(); loaded.value = true }) }
async function addCourse(values) {
  if (await run(() => store.addCourse(values), 'Course added successfully.')) form.value.reset()
}
async function removeCourse(course) {
  await run(() => store.deleteCourse(course.id), `${course.id} was deleted, including its enrollments.`)
}
onMounted(refresh)
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">Course catalog</p><h1>Courses</h1><p class="intro">Keep your course list organized and ready for enrollment.</p></div><span class="count">{{ store.courseCount }} courses</span></div>
  <FeedbackMessage :error="error" :success="success" />
  <LoadingState v-if="busy" label="Updating course records…" />
  <div class="workspace">
    <section class="panel" aria-labelledby="add-course-title"><h2 id="add-course-title">Add a course</h2><p class="muted">Enter a unique course ID and its full name.</p>
      <RecordForm ref="form" :fields="courseFields" prefix="course" :busy="busy" submit-label="Add course" @submit="addCourse" />
    </section>
    <section class="panel records-panel" aria-labelledby="courses-title" :aria-busy="busy">
      <div class="section-heading"><h2 id="courses-title">All courses</h2><button type="button" :disabled="busy" @click="refresh">Refresh courses</button></div>
      <RecordTable v-if="loaded" :records="records" :columns="courseColumns" caption="Course catalog" empty="No courses yet. Add a course to get started." actions>
        <template #actions="{ record }"><DeleteConfirm :label="`${record.id}: ${record.name}`" :busy="busy" @confirm="removeCourse(record)" /></template>
      </RecordTable>
      <p v-else-if="!busy" class="empty">Courses could not be loaded. Refresh courses to retry.</p>
    </section>
  </div>
</template>
