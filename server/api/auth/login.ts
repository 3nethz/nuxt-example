// server/api/auth/login.ts
import { defineEventHandler, getQuery, sendRedirect, setCookie, parseCookies } from 'h3';
import { AsgardeoNodeClient } from '@asgardeo/auth-node';
import { v4 as uuidv4 } from 'uuid';
import { useRuntimeConfig } from '#imports';

const SESSION_ID_COOKIE_NAME = "ASGARDEO_SESSION_ID";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);
    const asgardeoConfig = { /* ... load config ... */
        ...config.public.asgardeo,
        ...config.asgardeo,
        storage: config.asgardeo.storage || "memory",
        clientID: config.public.asgardeo.clientID,
    };

    if (!asgardeoConfig.clientID /* || other checks */) {
        console.error("Asgardeo configuration missing...");
        return sendRedirect(event, '/?error=config_missing', 302);
    }

    const authClient = new AsgardeoNodeClient(asgardeoConfig);
    const query = getQuery(event);
    const cookies = parseCookies(event);

    // --- MODIFIED LOGIC ---
    if (query.code && query.state) {
        // ----- HANDLE CALLBACK from Asgardeo -----
        console.log("[AUTH_LOGIN] Handling callback from Asgardeo.");
        const userId = cookies[SESSION_ID_COOKIE_NAME];

        if (!userId) {
            console.error("[AUTH_LOGIN] Callback received but session cookie missing!");
            return sendRedirect(event, '/?error=session_missing', 302);
        }
        console.log(`[AUTH_LOGIN] Found session cookie for callback. User ID: ${userId}`);

        try {
            // Pass a no-op function as the first argument if required by the signature.
            // This function will not be called during code exchange.
            const noOpCallback = () => { console.log("[AUTH_LOGIN] No-op callback executed (should not happen during code exchange)"); };

            const response = await authClient.signIn(
                noOpCallback, // <--- Pass the no-op function here
                userId,
                query.code as string,
                query.session_state as string | undefined,
                query.state as string
            );

            if (response.accessToken || response.idToken) {
                console.log("[AUTH_LOGIN] Callback success: Tokens obtained. Redirecting to /");
                // Optional: Refresh cookie expiry after successful login
                // const cookieOpts = { httpOnly: true, maxAge: 900000, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' };
                // setCookie(event, SESSION_ID_COOKIE_NAME, userId, cookieOpts);
                return sendRedirect(event, '/', 302); // Or redirect to '/dashboard' etc.
            } else {
                console.warn("[AUTH_LOGIN] Callback handling: authClient.signIn resolved without tokens.");
                return sendRedirect(event, '/?error=signin_incomplete', 302);
            }
        } catch (error: any) {
            console.error("[AUTH_LOGIN] Callback handling error:", error?.message || error);
            return sendRedirect(event, '/?error=callback_failed', 302);
        }
        // ... rest of the initiation logic ('else' block) ...

    } else {
        // ----- INITIATE LOGIN FLOW -----
        console.log("[AUTH_LOGIN] Initiating login flow. Generating new session ID.");
        // Always generate a new session ID for initiation to avoid conflicts
        const newUserId = uuidv4();
        let redirectInitiated = false;

        const redirectCallback = (url?: string) => {
            if (url) {
                console.log("[AUTH_LOGIN] Redirecting user to Asgardeo:", url.substring(0, 100) + "...");
                const cookieOpts = {
                    httpOnly: true, maxAge: 900000, sameSite: 'lax' as const, path: '/',
                    secure: process.env.NODE_ENV === 'production'
                };
                // Set the cookie with the NEW userId
                setCookie(event, SESSION_ID_COOKIE_NAME, newUserId, cookieOpts);
                console.log(`[AUTH_LOGIN] Set cookie ${SESSION_ID_COOKIE_NAME} for NEW userId: ${newUserId}. Options: ${JSON.stringify(cookieOpts)}. NODE_ENV: ${process.env.NODE_ENV}`);
                redirectInitiated = true;
                return sendRedirect(event, url, 302);
            } else {
                console.error("[AUTH_LOGIN] Initiation: Asgardeo SDK did not provide a redirect URL.");
                // Handle error appropriately - maybe redirect with error
                return sendRedirect(event, '/?error=initiation_failed', 302);
            }
        };

        try {
            // Call signIn with only the callback and the NEW userId
            // The SDK should generate the necessary state (PKCE, nonce) and call the callback
            console.log(`[AUTH_LOGIN] Calling signIn for initiation with new userId: ${newUserId}`);
            await authClient.signIn(redirectCallback, newUserId);

            // If the code reaches here, the redirectCallback likely wasn't called (error).
            if (!redirectInitiated) {
                console.error("[AUTH_LOGIN] Initiation: signIn completed without calling redirectCallback.");
                return sendRedirect(event, '/?error=initiation_failed', 302);
            }
            // If redirectCallback was called, it already sent the response.
            return;

        } catch (error: any) {
            console.error("[AUTH_LOGIN] Initiation error:", error?.message || error);
            return sendRedirect(event, '/?error=initiation_failed', 302);
        }
    }
});