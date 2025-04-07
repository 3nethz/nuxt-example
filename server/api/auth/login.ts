import { defineEventHandler, getQuery, sendRedirect, setCookie, parseCookies } from 'h3';
import { AsgardeoNodeClient } from '@asgardeo/auth-node';
import { v4 as uuidv4 } from 'uuid';
import { useRuntimeConfig } from '#imports';

const SESSION_ID_COOKIE_NAME = "ASGARDEO_SESSION_ID";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);
    const asgardeoConfig = {
        ...config.public.asgardeo,
        ...config.asgardeo,
        storage: config.asgardeo.storage || "memory",
        clientID: config.public.asgardeo.clientID,
    };

    if (!asgardeoConfig.clientID) {
        return sendRedirect(event, '/?error=config_missing', 302);
    }

    const authClient = new AsgardeoNodeClient(asgardeoConfig);
    const query = getQuery(event);
    const cookies = parseCookies(event);

    if (query.code && query.state) {
        // Handle callback from Asgardeo
        const userId = cookies[SESSION_ID_COOKIE_NAME];
        if (!userId) {
            return sendRedirect(event, '/?error=session_missing', 302);
        }

        try {
            const noOpCallback = () => {};
            const response = await authClient.signIn(
                noOpCallback,
                userId,
                query.code as string,
                query.session_state as string | undefined,
                query.state as string
            );

            if (response.accessToken || response.idToken) {
                return sendRedirect(event, '/', 302);
            } else {
                return sendRedirect(event, '/?error=signin_incomplete', 302);
            }
        } catch (error) {
            return sendRedirect(event, '/?error=callback_failed', 302);
        }
    } else {
        // Initiate login flow
        const newUserId = uuidv4();
        let redirectInitiated = false;

        const redirectCallback = (url?: string) => {
            if (url) {
                const cookieOpts = {
                    httpOnly: true, 
                    maxAge: 900000, 
                    sameSite: 'lax' as const, 
                    path: '/',
                    secure: process.env.NODE_ENV === 'production'
                };
                
                setCookie(event, SESSION_ID_COOKIE_NAME, newUserId, cookieOpts);
                redirectInitiated = true;
                return sendRedirect(event, url, 302);
            } else {
                return sendRedirect(event, '/?error=initiation_failed', 302);
            }
        };

        try {
            await authClient.signIn(redirectCallback, newUserId);
            
            if (!redirectInitiated) {
                return sendRedirect(event, '/?error=initiation_failed', 302);
            }
            
            return;
        } catch (error) {
            return sendRedirect(event, '/?error=initiation_failed', 302);
        }
    }
});