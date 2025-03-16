import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { 
    negotiateContentType, 
    buildHtmlResponse,
    buildContentResponse,
    buildHeadResponse,
    buildOptionsResponse,
    fetchContent
} from '$lib/net';

/**
 * Handle GET requests with content negotiation
 */
export const GET: RequestHandler = async ({ request, url, fetch }) => {
    // Get the accept header
    const acceptHeader = request.headers.get('Accept') || 'text/html';

    // Negotiate the content type
    const contentType = negotiateContentType(acceptHeader);
    
    // Get the base URL for link headers
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // For HTML requests, let SvelteKit handle it through the +page route
    if (contentType === 'text/html') {
        return buildHtmlResponse(baseUrl);
    }
    
    // For non-HTML content types, fetch and serve the appropriate file
    try {
        const { content } = await fetchContent(contentType, fetch);
        return buildContentResponse(contentType, content, baseUrl);
    } catch (err) {
        console.error('Error serving file:', err);
        throw error(500, 'Internal Server Error');
    }
};

/**
 * Handle HEAD requests with content negotiation
 * This should mirror the GET handler's behavior but without a response body
 */
export const HEAD: RequestHandler = async ({ request, url, fetch }) => {
    // Get the accept header
    const acceptHeader = request.headers.get('Accept') || 'text/html';

    // Negotiate the content type
    const contentType = negotiateContentType(acceptHeader);
    
    // Get the base URL for link headers
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // For HTML requests, create a simple response
    if (contentType === 'text/html') {
        return buildHtmlResponse(baseUrl);
    }
    
    // For non-HTML content types, fetch metadata and serve headers only
    try {
        const { length } = await fetchContent(contentType, fetch);
        return buildHeadResponse(contentType, length, baseUrl);
    } catch (err) {
        console.error('Error serving file:', err);
        throw error(500, 'Internal Server Error');
    }
};

/**
 * Handle OPTIONS requests
 * Informs clients about available content types
 */
export const OPTIONS: RequestHandler = async ({ url }) => {
    return buildOptionsResponse(url);
}; 