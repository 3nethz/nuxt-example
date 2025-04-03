<template>
    <div>
      <h1>Post Details</h1>
      <p>You are viewing the post with slug: <strong>{{ slug }}</strong></p>
      <NuxtLink to="/">Go Home</NuxtLink>
    </div>
  </template>
  
  <script setup lang="ts">
  const route = useRoute(); // Auto-imported hook to access route info
  const slug = computed(() => route.params.slug); // Access the dynamic 'slug' parameter
  
  console.log('Route params:', route.params);
  </script>