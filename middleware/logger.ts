export default defineNuxtRouteMiddleware((to, from) => {
    console.log(`Logger Middleware: Navigating from ${from.path} to ${to.path}`);
    // You could add checks here, e.g.,
    // if (to.path === '/secret' && !isLoggedIn()) {
    //   return navigateTo('/login')
    // }
  })