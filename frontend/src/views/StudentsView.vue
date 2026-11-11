<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRecordsStore } from '../stores/records.js'
import { useTask } from '../composables/useTask.js'
import { studentFields, studentColumns } from '../fields.js'
import RecordForm from '../components/RecordForm.vue'
import RecordTable from '../components/RecordTable.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'
import FeedbackMessage from '../components/FeedbackMessage.vue'
import LoadingState from '../components/LoadingState.vue'

const store = useRecordsStore()
const { busy, error, success, run } = useTask()
const search = ref('')
const matches = ref(null)
const searchedName = ref('')
const form = ref(null)
const loaded = ref(false)
const records = computed(() => (matches.value === null ? store.students
  : store.students.filter(student => matches.value.includes(student.id)))
  .toSorted((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)))
async function refresh() {
  await run(async () => {
    await store.loadStudents()
    loaded.value = true
    matches.value = null
    searchedName.value = ''
    search.value = ''
  })
}
async function findStudents() {
  if (!search.value.trim()) { error.value = 'Enter a student name to search.'; return }
  await run(async () => {
    const name = search.value.trim()
    const results = await store.searchStudents(name)
    // Search responses are current backend records, including external additions.
    for (const student of results) {
      const index = store.students.findIndex(item => item.id === student.id)
      if (index === -1) store.students.push(student)
      else store.students[index] = student
    }
    matches.value = results.map(student => student.id)
    searchedName.value = name
    loaded.value = true
  })
}
async function addStudent(values) {
  const saved = await run(() => store.addStudent(values), 'Student added successfully.')
  if (saved) { form.value.reset(); matches.value = null; searchedName.value = ''; search.value = '' }
}
async function removeStudent(student) {
  await run(() => store.deleteStudent(student.id), `${student.name} was deleted, including their enrollments.`)
}
onMounted(refresh)
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">Student records</p><h1>Students</h1><p class="intro">Find a student, review their details, or add someone new.</p></div><span class="count">{{ store.studentCount }} students</span></div>
  <FeedbackMessage :error="error" :success="success" />
  <LoadingState v-if="busy" label="Updating student records…" />
  <div class="workspace">
    <section class="panel" aria-labelledby="add-student-title"><h2 id="add-student-title">Add a student</h2>
      <p class="muted">Use a unique student ID. All fields are required.</p>
      <RecordForm ref="form" :fields="studentFields" prefix="student" :busy="busy" submit-label="Add student" @submit="addStudent" />
    </section>
    <section class="panel records-panel" aria-labelledby="students-title" :aria-busy="busy">
      <div class="section-heading"><h2 id="students-title">Student directory</h2><button type="button" :disabled="busy" @click="refresh">Refresh all</button></div>
      <form class="search-form" @submit.prevent="findStudents">
        <div class="field"><label for="student-search">Search by name</label><input id="student-search" v-model="search" type="search" required maxlength="200" :disabled="busy" aria-describedby="search-help"></div>
        <button type="submit" :disabled="busy">Search</button>
      </form>
      <p id="search-help" class="muted">Enter the full name. Search is case-sensitive.</p>
      <p v-if="searchedName" class="search-summary">Results for “{{ searchedName }}” <button type="button" :disabled="busy" @click="refresh">Clear search</button></p>
      <RecordTable v-if="loaded" :records="records" :columns="studentColumns" caption="Student directory" :empty="searchedName ? 'No students match that name.' : 'No students yet. Add a student to get started.'" actions>
        <template #actions="{ record }"><div class="row-actions"><RouterLink :to="{ path: `/students/${encodeURIComponent(record.id)}` }" :aria-label="`View ${record.name}, ID ${record.id}`">View details</RouterLink><DeleteConfirm :label="`${record.name} (${record.id})`" :busy="busy" @confirm="removeStudent(record)" /></div></template>
      </RecordTable>
      <p v-else-if="!busy" class="empty">Student records could not be loaded. Use Refresh all to retry.</p>
    </section>
  </div>
</template>
