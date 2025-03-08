import type { RequestHandler } from './$types';
import {
    CONTENT_TYPES,
    isRdfConfig,
    negotiateContentType,
    buildRdfResponse,
    buildHtmlResponse,
    buildNotFoundResponse,
    buildOptionsResponse
} from '$lib/content-negotiation';

/**
 * Handle GET requests with content negotiation
 * Serves different content types based on the Accept header
 */
export const GET: RequestHandler = async ({ request, fetch }) => {
    const acceptHeader = request.headers.get('Accept') || '';
    const bestType = negotiateContentType(acceptHeader);
    
    // If the negotiated type is not HTML, serve the appropriate RDF format
    const config = CONTENT_TYPES[bestType];
    if (bestType !== 'text/html' && isRdfConfig(config)) {
        const response = await fetch(config.path);
        
        if (!response.ok) {
            return buildNotFoundResponse(`${bestType} data not found`);
        }
        
        const content = await response.text();
        return buildRdfResponse(content, bestType);
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