import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { request } from '../api.js'

export const useRecordsStore = defineStore('records', () => {
  const students = ref([])
  const courses = ref([])
  const studentCount = computed(() => students.value.length)
  const courseCount = computed(() => courses.value.length)
  async function loadStudents() { students.value = await request('/students') }
  async function loadCourses() { courses.value = await request('/courses') }
  async function loadAll() { await Promise.all([loadStudents(), loadCourses()]) }
  async function searchStudents(name) { return request(`/students?name=${encodeURIComponent(name)}`) }
  async function getStudent(id) { return request(`/students/${encodeURIComponent(id)}`) }
  async function addStudent(body) {
    const { student } = await request('/students', {
      method: 'POST', body, duplicateMessage: 'That student ID already exists. Use a different ID.',
    })
    students.value = [...students.value, student]
    return student
  }
  async function deleteStudent(id) {
    await request(`/students/${encodeURIComponent(id)}`, { method: 'DELETE' })
    students.value = students.value.filter(student => student.id !== id)
  }
  async function addCourse(body) {
    const { course } = await request('/courses', {
      method: 'POST', body, duplicateMessage: 'That course ID already exists. Use a different ID.',
    })
    courses.value = [...courses.value, course]
    return course
  }
  async function deleteCourse(id) {
    await request(`/courses/${encodeURIComponent(id)}`, { method: 'DELETE' })
    courses.value = courses.value.filter(course => course.id !== id)
  }
  async function enroll(body) {
    return request('/enrollments', {
      method: 'POST', body, duplicateMessage: 'This student is already enrolled in that course.',
    })
  }
  async function getRoster(id) { return request(`/courses/${encodeURIComponent(id)}/students`) }
  return { students, courses, studentCount, courseCount, loadStudents, loadCourses, loadAll,
    searchStudents, getStudent, addStudent, deleteStudent, addCourse, deleteCourse, enroll, getRoster }
})
