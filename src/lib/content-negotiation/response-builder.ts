/**
 * Response builder utilities for content negotiation
 * Provides functions for building responses with appropriate headers
 */

import { getCorsHeaders } from './cors';
import { getSupportedContentTypes, CONTENT_TYPES, isRdfConfig } from './config';

// Common headers for all responses
const getCommonHeaders = () => ({
    'Vary': 'Accept',
    ...getCorsHeaders()
});

/**
 * Generate Link headers for content type discovery
 * @returns An object containing Link headers for all available content types
 */
export function getLinkHeaders(): Record<string, string> {
    const links: string[] = [];
    
    // Add links for each content type
    for (const [contentType, config] of Object.entries(CONTENT_TYPES)) {
        let rel = 'alternate';
        let path = '/';
        
        // If this is the default HTML type, mark it as "canonical"
        if (contentType === 'text/html') {
            rel = 'canonical';
        }
        
        // For RDF content types, use their specific paths
        if (isRdfConfig(config)) {
            path = config.path;
        }
        
        links.push(`<${path}>; rel="${rel}"; type="${contentType}"`);
    }
    
    return { 'Link': links.join(', ') };
}

/**
 * Build a response for HTML content
 * @returns A Response object with appropriate headers
 */
export function buildHtmlResponse(): Response {
    return new Response(null, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...getCommonHeaders(),
            ...getLinkHeaders()
        }
    });
}

/**
 * Build a response for RDF content
 * @param contentType - The content type to serve
 * @param content - The RDF content
 * @returns A Response object with appropriate headers
 */
export function buildRdfResponse(contentType: string, content: string): Response {
    return new Response(content, {
        status: 200,
        headers: {
            'Content-Type': `${contentType}; charset=utf-8`,
            'Cache-Control': 'max-age=3600',
            ...getCommonHeaders(),
            ...getLinkHeaders()
        }
    });
}

/**
 * Build a 404 response
 * @param message - The error message
 * @returns A Response object with 404 status
 */
export function buildNotFoundResponse(message: string): Response {
    return new Response(message, {
        status: 404,
        headers: {
            'Cache-Control': 'no-store',
            ...getCommonHeaders(),
            ...getLinkHeaders()
        }
    });
}

/**
 * Build an OPTIONS response
 * @returns A Response object for OPTIONS requests
 */
export function buildOptionsResponse(): Response {
    return new Response(null, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Allow': 'GET, HEAD, OPTIONS',
            'Accept': getSupportedContentTypes(),
            'Vary': 'Accept',
            ...getCorsHeaders(),
            ...getLinkHeaders()
        }
    });
} 