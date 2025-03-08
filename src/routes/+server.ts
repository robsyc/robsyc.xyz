import type { RequestHandler } from './$types';
import {
    CONTENT_TYPES,
    isRdfConfig,
    negotiateContentType,
    buildHtmlResponse,
    buildOptionsResponse
} from '$lib/content-negotiation';

/**
 * Handle GET requests with content negotiation
 * Due to Vercel CDN limitations with the Vary header, we redirect to specific URLs
 * instead of serving different content types based on the Accept header.
 */
export const GET: RequestHandler = async ({ request, url }) => {
    // Only apply content negotiation for the root URL
    if (url.pathname !== '/') {
        return buildHtmlResponse();
    }

    const acceptHeader = request.headers.get('Accept') || '';
    const bestType = negotiateContentType(acceptHeader);
    
    // If the negotiated type is not HTML, redirect to the appropriate URL
    const config = CONTENT_TYPES[bestType];
    if (bestType !== 'text/html' && isRdfConfig(config)) {
        return new Response(null, {
            status: 302, // Temporary redirect
            headers: {
                'Location': config.path,
                'Cache-Control': 'no-store'
            }
        });
    }
    
    // For HTML requests, let SvelteKit handle the normal page rendering
    return buildHtmlResponse();
};

/**
 * Handle OPTIONS requests
 * Informs clients about available content types
 */
export const OPTIONS: RequestHandler = async () => {
    return buildOptionsResponse();
}; 