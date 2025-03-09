import type { RequestHandler } from './$types';
import {
    CONTENT_TYPES,
    isRdfConfig,
    negotiateContentType,
    buildHtmlResponse,
    buildOptionsResponse,
    getCorsHeaders,
    getLinkHeaders
} from '$lib/content-negotiation';

/**
 * Handle GET requests with content negotiation
 * Using a more robust approach for Vercel CDN compatibility
 */
export const GET: RequestHandler = async ({ request, url }) => {
    // Only apply content negotiation for the root URL
    if (url.pathname !== '/') {
        console.log('Not root URL, returning HTML response');
        return buildHtmlResponse();
    }

    const acceptHeader = request.headers.get('Accept') || '';
    console.log('Accept header:', acceptHeader);
    
    const bestType = negotiateContentType(acceptHeader);
    console.log('Negotiated content type:', bestType);
    
    // If the negotiated type is not HTML, redirect to the appropriate URL
    const config = CONTENT_TYPES[bestType];
    console.log('Content type config:', config);
    
    if (bestType !== 'text/html' && isRdfConfig(config)) {
        console.log('Redirecting to:', config.path);
        
        // Use a 307 redirect with cache-control: no-store to prevent caching the redirect
        return new Response(null, {
            status: 307, // Temporary redirect that preserves the request method
            headers: {
                'Location': config.path,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                ...getCorsHeaders(), // Add CORS headers to the redirect
                ...getLinkHeaders()  // Add Link headers for content type discovery
            }
        });
    }
    
    // For HTML requests, let SvelteKit handle the normal page rendering
    console.log('Returning HTML response');
    return buildHtmlResponse();
};

/**
 * Handle HEAD requests with content negotiation
 * This should mirror the GET handler's behavior but without a response body
 */
export const HEAD: RequestHandler = async ({ request, url }) => {
    console.log('HEAD request received');
    
    // Only apply content negotiation for the root URL
    if (url.pathname !== '/') {
        console.log('Not root URL (HEAD), returning HTML headers');
        const response = buildHtmlResponse();
        return new Response(null, {
            status: response.status,
            headers: response.headers
        });
    }

    const acceptHeader = request.headers.get('Accept') || '';
    console.log('HEAD Accept header:', acceptHeader);
    
    const bestType = negotiateContentType(acceptHeader);
    console.log('HEAD Negotiated content type:', bestType);
    
    // If the negotiated type is not HTML, redirect to the appropriate URL
    const config = CONTENT_TYPES[bestType];
    console.log('HEAD Content type config:', config);
    
    if (bestType !== 'text/html' && isRdfConfig(config)) {
        console.log('HEAD Redirecting to:', config.path);
        return new Response(null, {
            status: 302, // Temporary redirect
            headers: {
                'Location': config.path,
                'Cache-Control': 'no-store',
                ...getCorsHeaders(), // Add CORS headers to the redirect
                ...getLinkHeaders()  // Add Link headers for content type discovery
            }
        });
    }
    
    // For HTML requests, return headers only
    console.log('HEAD Returning HTML headers');
    const response = buildHtmlResponse();
    return new Response(null, {
        status: response.status,
        headers: response.headers
    });
};

/**
 * Handle OPTIONS requests
 * Informs clients about available content types
 */
export const OPTIONS: RequestHandler = async () => {
    return buildOptionsResponse();
}; 