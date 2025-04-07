import { defineEventHandler, sendRedirect, setCookie, parseCookies } from "h3";
import { AsgardeoNodeClient } from "@asgardeo/auth-node";
import { useRuntimeConfig } from "#imports";

// Use the same cookie name as defined in your login handler
const SESSION_ID_COOKIE_NAME = "ASGARDEO_SESSION_ID";

export default defineEventHandler(async (event) => {
  // 1. Load Configuration (similar to login)
  const config = useRuntimeConfig(event);
  const asgardeoConfig = {
    // Spread public and private configs
    ...config.public.asgardeo,
    ...config.asgardeo,
    // Ensure essential properties are set
    storage: config.asgardeo.storage || "memory",
    clientID: config.public.asgardeo.clientID,
    // Include clientSecret if needed by SDK for session management/revocation,
    // but typically signOut URL generation primarily needs clientID and serverOrigin/logoutRedirectURL
    // clientSecret: config.asgardeo.clientSecret // Uncomment if required by your setup
  };

  // Basic configuration check
  if (!asgardeoConfig.clientID) {
    console.error("Asgardeo clientID is missing in configuration.");
    // Redirecting without clientID might be problematic, but attempt generic error
    return sendRedirect(event, "/?error=config_missing", 302);
  }

  // 2. Initialize Asgardeo Client
  const authClient = new AsgardeoNodeClient(asgardeoConfig);

  // 3. Parse Cookies
  const cookies = parseCookies(event);
  const sessionId = cookies[SESSION_ID_COOKIE_NAME];

  // 4. Check if the Session ID Cookie Exists
  if (!sessionId) {
    return sendRedirect(event, "/?error=logout_failed_no_session", 302);
  }

  try {
    const logoutUrl = await authClient.signOut(sessionId);

    // 6. Clear the Session Cookie
    // IMPORTANT: Use options that match how the cookie was set, especially path, secure, httpOnly, sameSite.
    const cookieOpts = {
      httpOnly: true,
      maxAge: -1, // Set maxAge to 0 or negative value to expire immediately
      sameSite: "lax" as const, // Use the same SameSite policy
      path: "/", // Use the same path
      secure: process.env.NODE_ENV === "production", // Use the same secure flag condition
    };
    // Set the cookie value to empty and expire it
    setCookie(event, SESSION_ID_COOKIE_NAME, "", cookieOpts);

    // 7. Redirect the user to the Asgardeo Logout URL
    // Asgardeo will handle its session termination and then redirect
    // back to the application's configured post-logout redirect URI.
    return sendRedirect(event, logoutUrl, 302);
  } catch (error) {
    // 8. Handle Errors during sign out
    console.error("Asgardeo sign-out failed:", error);
    // Clear the local cookie even if Asgardeo logout fails,
    // as the local session reference is likely invalid anyway.
    const cookieOpts = {
      httpOnly: true,
      maxAge: -1,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    };
    setCookie(event, SESSION_ID_COOKIE_NAME, "", cookieOpts);

    // Redirect to a generic error page or home
    return sendRedirect(event, "/?error=logout_failed", 302);
  }
});
