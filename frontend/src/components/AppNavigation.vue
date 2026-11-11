<script setup>
const links = [
  { to: '/students', label: 'Students' },
  { to: '/courses', label: 'Courses' },
  { to: '/enrollments', label: 'Enrollments' },
]
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/students" class="brand" aria-label="Student Management home">
        <span class="brand-mark" aria-hidden="true">UH</span>
        <span>Student Management<small>CIS 3339</small></span>
      </RouterLink>
      <nav aria-label="Main navigation">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</RouterLink>
      </nav>
    </div>
  </header>
</template>
