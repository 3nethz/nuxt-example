// server/api/auth/status.ts
import { defineEventHandler, parseCookies } from 'h3';
import { AsgardeoNodeClient } from '@asgardeo/auth-node';
import { useRuntimeConfig } from '#imports';

// Use the same cookie name as in login.ts
const SESSION_ID_COOKIE_NAME = "ASGARDEO_SESSION_ID";

console.log('[AUTH_STATUS] Initializing status endpoint handler.'); // Log 1: Handler initialization

export default defineEventHandler(async (event) => {
  console.log(`[AUTH_STATUS] Request received for: ${event.node.req.url}`); // Log 2: Request URL

  const config = useRuntimeConfig(event);
  // --- Configuration Logging ---
  // Be cautious logging config in production, especially secrets.
  // For debugging, log non-sensitive parts.
  console.log('[AUTH_STATUS] Loading Runtime Config.'); // Log 3: Config loading step
  const asgardeoConfig = {
    ...config.public.asgardeo,
    ...config.asgardeo,
    storage: config.asgardeo.storage || "memory",
    clientID: config.public.asgardeo.clientID,
   };
  console.log(`[AUTH_STATUS] Config Loaded - ClientID: ${asgardeoConfig.clientID}, BaseURL: ${asgardeoConfig.baseUrl}, Storage: ${asgardeoConfig.storage}`); // Log 4: Key config values (NO clientSecret)

  // --- Basic config validation ---
  if (!asgardeoConfig.clientID || !asgardeoConfig.signInRedirectURL || !asgardeoConfig.baseUrl) {
    console.error("[AUTH_STATUS] ERROR: Essential Asgardeo config missing (clientID, signInRedirectURL, or baseUrl)."); // Log 5: Config validation failed
    // Return an unauthenticated status
    return { isAuthenticated: false, error: 'config_missing' };
  }

  // --- Cookie Parsing ---
  console.log('[AUTH_STATUS] Parsing cookies from request.'); // Log 6: Cookie parsing step
  const cookies = parseCookies(event);
  console.log('[AUTH_STATUS] Raw Cookies Parsed:', cookies); // Log 7: Show all cookies found
  const userId = cookies[SESSION_ID_COOKIE_NAME];
  console.log(`[AUTH_STATUS] Retrieved User ID (Session ID) from cookie '${SESSION_ID_COOKIE_NAME}':`, userId); // Log 8: Show the extracted userId

  if (!userId) {
    console.log('[AUTH_STATUS] No User ID found in cookies. Assuming logged out.'); // Log 9: No userId path
    // No session cookie, definitely not logged in
    return { isAuthenticated: false };
  }

  // --- Asgardeo SDK Interaction ---
  try {
    console.log(`[AUTH_STATUS] Initializing AsgardeoNodeClient for userId: ${userId}`); // Log 10: SDK init step
    // Re-initialize the client - ensure storage strategy allows retrieving session
    const authClient = new AsgardeoNodeClient(asgardeoConfig);

    // Let's try using getBasicUserInfo as it requires a valid session.
    console.log(`[AUTH_STATUS] Attempting to call authClient.getBasicUserInfo for userId: ${userId}`); // Log 11: Before SDK call
    const userInfo = await authClient.getBasicUserInfo(userId);
    console.log('[AUTH_STATUS] Result from getBasicUserInfo:', userInfo); // Log 12: Show raw result from SDK

    // Check if userInfo is truthy and maybe contains expected fields
    // Adjust condition based on what a valid userInfo object looks like from the SDK
    if (userInfo && userInfo.sub) { // Check for 'sub' (subject) claim, common in user info
        console.log(`[AUTH_STATUS] User info found for userId ${userId}. Assuming authenticated.`); // Log 13: Authentication success path
        const userData = {
             username: userInfo.username || userInfo.sub, // Prefer username, fallback to sub
             // Add other fields you need like 'name', 'email' if available and desired
             // Example: name: userInfo.name, email: userInfo.email
             sub: userInfo.sub // Include sub for uniqueness if needed
         };
        console.log('[AUTH_STATUS] Returning authenticated status with user data:', userData); // Log 14: Final return value (authenticated)
        return {
            isAuthenticated: true,
            user: userData
        };
    } else {
        console.log(`[AUTH_STATUS] No valid user info returned for userId ${userId}. Assuming session invalid or expired.`); // Log 15: Authentication failed path (no user info)
        return { isAuthenticated: false };
    }

  } catch (error: any) {
    // Log specific errors from the SDK if possible
    console.error(`[AUTH_STATUS] ERROR during Asgardeo SDK interaction for userId ${userId}:`, error?.message || error); // Log 16: Catch block error
    // Check if the error indicates an invalid session explicitly (depends on SDK error types)
    // Example: if (error.code === 'SESSION_NOT_FOUND') { ... }
    console.log('[AUTH_STATUS] Returning unauthenticated status due to error.'); // Log 17: Final return value (error path)
    // If there's an error checking status, assume not authenticated
    return { isAuthenticated: false, error: 'status_check_failed', details: error?.message };
  }
});