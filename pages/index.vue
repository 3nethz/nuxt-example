<template>
  <div>
    <h1>My Nuxt App</h1>

    <p v-if="pending">Loading user status...</p>

    <p v-else-if="error">
      Error checking login status:
      {{ error.message || "Please try refreshing." }}
    </p>

    <div v-else-if="authStatus?.isAuthenticated && authStatus.user">
      <p>Welcome, {{ authStatus.user.username }}!</p>
      <a href="/api/auth/logout">Logout</a>
    </div>

    <div v-else>
      <a href="/api/auth/login">Login with Asgardeo</a>
      <p v-if="route.query.error" style="color: red; margin-top: 10px">
        Operation failed. (Code: {{ route.query.error }})
      </p>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router"; // Correctly imported
import { useAsyncData, useRequestHeaders, createError } from "#app"; // Correctly imported

const route = useRoute();
// Fetch only the 'cookie' header needed for the backend status check
const headers = useRequestHeaders(["cookie"]);

// Fetch authentication status
const {
  data: authStatus, // Will contain { isAuthenticated: boolean, user?: BasicUserInfo } or null
  pending, // Boolean indicating if fetch is in progress
  error, // Contains H3Error object if $fetch fails (e.g., network error, 5xx response)
} = await useAsyncData(
  "authStatus", // Unique key for the data
  () =>
    $fetch("/api/auth/status", {
      // Call the API endpoint we created
      headers, // Pass browser cookies to the API route
      // Tip: Add basic validation on the client, though server is authoritative
      // initialCache: false, // Consider if caching is desired or not
    }),
  { server: true } // Run on server-side initially, and client-side on navigation
);

// Optional: Log status for debugging (client-side only)
// if (process.client) {
//   console.log("Auth Status:", authStatus.value);
//   console.log("Pending:", pending.value);
//   console.log("Error:", error.value);
// }
</script>
