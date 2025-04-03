export default defineEventHandler(async (event) => {
    // You can access request details via 'event'
    // const query = getQuery(event) // Example: get query params
  
    // Return data (will be automatically stringified as JSON)
    return {
      message: 'Hello from the Nuxt API!',
      timestamp: new Date().toISOString()
    }
  })