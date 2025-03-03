import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, fetch }) => {
    const acceptHeader = request.headers.get('Accept') || '';
    
    // Check if the client accepts Turtle format
    if (acceptHeader.includes('text/turtle')) {
        // Fetch the Turtle file using SvelteKit's fetch
        const response = await fetch('/src/lib/data/me.ttl');
        const turtleContent = await response.text();
        
        // Return the Turtle content with the appropriate content type
        return new Response(turtleContent, {
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