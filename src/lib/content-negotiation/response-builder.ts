/**
 * Response builder utilities for content negotiation
 * Provides functions for building responses with appropriate headers
 */

import { getCorsHeaders } from './cors';
import { getSupportedContentTypes } from './config';

// Common headers for all responses
const getCommonHeaders = () => ({
    'Vary': 'Accept',
    ...getCorsHeaders()
});

/**
 * Build a response for HTML content
 * @returns A Response object with appropriate headers
 */
export function buildHtmlResponse(): Response {
    return new Response(null, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...getCommonHeaders()
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
            ...getCommonHeaders()
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
            'Allow': 'GET, OPTIONS',
            'Accept': getSupportedContentTypes(),
            'Vary': 'Accept',
            ...getCorsHeaders()
        }
    });
} 