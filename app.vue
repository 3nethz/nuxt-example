<script setup lang="ts">
console.log("window:", typeof window !== "undefined" ? window : "undefined");
</script>

<template>
  <header>
    <SignedOut>
      <SignInButton />
    </SignedOut>
    <SignedIn>
      <UserButton />
    </SignedIn>
  </header>

  <main>
    <NuxtPage />
  </main>
</template>
