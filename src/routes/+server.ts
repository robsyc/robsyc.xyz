import type { RequestHandler } from './$types';
import meData from '$lib/data/me.ttl?raw';

export const GET: RequestHandler = async ({ request }) => {
    const acceptHeader = request.headers.get('Accept') || '';
    
    // Check if the client accepts Turtle format
    if (acceptHeader.includes('text/turtle')) {
        // Return the Turtle content with the appropriate content type
        return new Response(meData, {
            headers: {
                'Content-Type': 'text/turtle; charset=utf-8'
            }
        });
    }
    
    // For other requests, let SvelteKit handle the normal page rendering
    // This will effectively pass control to +page.svelte
    return new Response(null, {
        status: 200
    });
}; 