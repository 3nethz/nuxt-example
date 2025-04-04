export default defineNuxtConfig({
  runtimeConfig: {
    asgardeo: {
      clientSecret: process.env.ASGARDEO_CLIENT_SECRET,
    },
    public: {
      asgardeo: {
        clientID: process.env.ASGARDEO_CLIENT_ID,
        signInRedirectURL: "http://localhost:3000/api/auth/login",
        baseUrl: process.env.ASGARDEO_BASE_URL,
        scope: ["openid", "profile"]
      }
    }
  },

  devtools: { enabled: true },
  compatibilityDate: "2025-04-04"
})