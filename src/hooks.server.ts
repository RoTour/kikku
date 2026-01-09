import { auth } from '$lib/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;
	
    // 1. Let better-auth handle its own routes (/api/auth/*)
    // Actually svelteKitHandler/toSvelteKitHandler handles the API routes via +server.ts, 
    // but we might need to populate locals for using session in other routes.
    
    // Check session
    const session = await auth.api.getSession({
        headers: request.headers
    });

    event.locals.session = session?.session || null;
    event.locals.user = session?.user || null;

    // 2. Protect routes
    if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/project')) {
        if (!event.locals.session) {
            return new Response('Redirect', {
                status: 303,
                headers: { Location: '/login' }
            });
        }
    }

	return resolve(event);
};
