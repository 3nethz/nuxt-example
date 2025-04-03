<template>
    <div>
      <h1>Protected Page</h1>
      <p>You should see a log in the console from the middleware.</p>
      <NuxtLink to="/">Go Home</NuxtLink>
    </div>
  </template>
  
  <script setup lang="ts">
  definePageMeta({
    middleware: ['logger'] // Apply the named middleware
    // You can also write inline middleware here:
    // middleware: defineNuxtRouteMiddleware((to, from) => { ... })
  });
  </script>