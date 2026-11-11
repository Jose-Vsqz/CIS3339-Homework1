<script setup>
import AppNavigation from './components/AppNavigation.vue'
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <AppNavigation />
  <main id="main" class="container" tabindex="-1">
    <RouterView v-slot="{ Component, route }"><component :is="Component" :key="route.path" /></RouterView>
  </main>
  <footer class="container">University of Houston <span aria-hidden="true">/</span> CIS 3339 · Homework 1</footer>
</template>
