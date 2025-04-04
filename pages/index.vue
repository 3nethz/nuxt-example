<template>
    <div>
      <h1>My Nuxt App</h1>
  
      <p v-if="pending">Loading user status...</p>
  
      <p v-else-if="error || (authStatus && authStatus.error)">Error checking login status.</p>
  
      <div v-else-if="authStatus?.isAuthenticated && authStatus.user">
        <p>Welcome, {{ authStatus.user.username }}!</p>
        <a href="/api/auth/logout">Logout</a>
      </div>
  
      <div v-else>
        <a href="/api/auth/login">Login with Asgardeo (SSR)</a>
        <p v-if="route.query.error" style="color: red;">
          Login attempt failed. Please try again. (Code: {{ route.query.error }})
        </p>
      </div>
  
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router'; // Import useRoute if needed for query params
  import { useAsyncData } from '#app'; // Import useAsyncData
  
  const route = useRoute();
  
  // Fetch authentication status on server-side (and client-side navigation)
  // The key 'authStatus' should be unique
  const { data: authStatus, pending, error } = await useAsyncData(
    'authStatus', // Unique key for this data
    () => $fetch('/api/auth/status'), // Call your new API endpoint
    { server: true } // Ensure it runs on the server first
  );
  
  // `authStatus.value` will contain { isAuthenticated: true/false, user?: {...}, error?: '...' }
  // `pending.value` will be true while fetching
  // `error.value` will contain fetch errors
  </script>