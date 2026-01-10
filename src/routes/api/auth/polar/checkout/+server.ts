
import { auth } from '$lib/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';

const handler = toSvelteKitHandler(auth);

export const POST = async (event: any) => {
    console.log('DEBUG: Proxying Checkout Request');
    console.log('DEBUG: Original URL:', event.url.toString());

    // Rewrite URL to match what better-auth server expects (/api/auth/checkout)
    // The client sends /api/auth/polar/checkout
    const newUrl = new URL(event.url);
    newUrl.pathname = newUrl.pathname.replace('/polar/checkout', '/checkout');
    
    console.log('DEBUG: Rewritten URL:', newUrl.toString());

    // We need to create a new Request object because better-auth likely reads request.url
    // and SvelteKit's event.request is immutable regarding the URL usually.
    const newRequest = new Request(newUrl.toString(), event.request);

    // toSvelteKitHandler might rely on the event object structure, 
    // but usually it extracts the request. 
    // Let's call the auth.handler directly if possible, or patch the event.request.
    
    // Patching the event to have the new request
    Object.defineProperty(event, 'request', {
        value: newRequest
    });

    const res = await handler(event);
    console.log('DEBUG: Response Status:', res.status);
    return res;
};

export const GET = handler;
