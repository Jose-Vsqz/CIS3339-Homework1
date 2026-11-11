import { createRouter, createWebHistory } from 'vue-router'
import StudentsView from './views/StudentsView.vue'
import StudentDetailsView from './views/StudentDetailsView.vue'
import CoursesView from './views/CoursesView.vue'
import EnrollmentsView from './views/EnrollmentsView.vue'
import NotFoundView from './views/NotFoundView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/students' },
    { path: '/index.html', redirect: '/students' },
    { path: '/courses.html', redirect: '/courses' },
    { path: '/students', component: StudentsView },
    { path: '/students/:id', component: StudentDetailsView, props: true },
    { path: '/courses', component: CoursesView },
    { path: '/enrollments', component: EnrollmentsView },
    { path: '/:pathMatch(.*)*', component: NotFoundView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
