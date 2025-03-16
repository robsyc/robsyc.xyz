import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { 
    negotiateContentType, 
    addCorsHeaders, 
    buildOptionsResponse, 
    CONTENT_TYPES,
    generateLinkHeaders,
} from '$lib/negotiation';

/**
 * Handle GET requests with content negotiation
 */
export const GET: RequestHandler = async ({ request, url, fetch }) => {
    // Only apply content negotiation for the root URL
    if (url.pathname !== '/') {
        throw error(404, 'Not Found');
    }

    // Get the accept header
    const acceptHeader = request.headers.get('Accept') || 'text/html';

    // Negotiate the content type
    const contentType = negotiateContentType(acceptHeader);
    
    // For HTML requests, let SvelteKit handle it through the +page route
    if (contentType === 'text/html') {
        // Let the normal SvelteKit routing handle HTML requests
        const response = new Response(null, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                'Vary': 'Accept',
            }
        });
        return addCorsHeaders(response);
    }
    
    // Get the file path for the requested content type
    const filePath = CONTENT_TYPES[contentType].path;
    const baseUrl = `${url.protocol}//${url.host}`;
    
    try {
        // Fetch the file from the static directory using SvelteKit's fetch
        const fileResponse = await fetch(filePath);
        
        if (!fileResponse.ok) {
            throw error(404, 'Resource not found');
        }
        
        // Get the file content
        const fileContent = await fileResponse.text();
        
        // Generate Link headers for alternative formats
        const linkHeader = generateLinkHeaders(contentType, baseUrl);
        
        // Create response with the file content and appropriate headers
        const response = new Response(fileContent, {
            headers: {
                'Content-Type': contentType,
                'Vary': 'Accept',
                'Content-Length': fileContent.length.toString(),
                'Link': linkHeader
            }
        });
        
        // Add CORS headers and return
        return addCorsHeaders(response);
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
    // Only apply content negotiation for the root URL
    if (url.pathname !== '/') {
        throw error(404, 'Not Found');
    }

    // Get the accept header
    const acceptHeader = request.headers.get('Accept') || 'text/html';

    // Negotiate the content type
    const contentType = negotiateContentType(acceptHeader);
    
    // For HTML requests, create a simple response
    if (contentType === 'text/html') {
        const response = new Response(null, {
            headers: {
                'Content-Type': 'text/html',
                'Vary': 'Accept',
            }
        });
        return addCorsHeaders(response);
    }
    
    // Get the file path for the requested content type
    const filePath = CONTENT_TYPES[contentType].path;
    const baseUrl = `${url.protocol}//${url.host}`;
    
    try {
        // Fetch the file from the static directory using SvelteKit's fetch
        const fileResponse = await fetch(filePath);
        
        if (!fileResponse.ok) {
            throw error(404, 'Resource not found');
        }
        
        // Get the file content to determine its length
        const fileContent = await fileResponse.text();
        
        // Generate Link headers for alternative formats
        const linkHeader = generateLinkHeaders(contentType, baseUrl);
        
        // Create response with appropriate headers but no body
        const response = new Response(null, {
            headers: {
                'Content-Type': contentType,
                'Vary': 'Accept',
                'Content-Length': fileContent.length.toString(),
                'Link': linkHeader
            }
        });
        
        // Add CORS headers and return
        return addCorsHeaders(response);
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