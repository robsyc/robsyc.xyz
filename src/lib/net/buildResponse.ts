import { error } from '@sveltejs/kit';
import { CONTENT_TYPES } from './negotiation';
import { addAllHeaders, generateLinkHeaders } from './addHeaders';

/**
 * Build a response for HTML content
 * @param baseUrl The base URL of the request
 * @returns A response for HTML content
 */
export function buildHtmlResponse(baseUrl: string): Response {
    const response = new Response(null, {
        status: 200,
    });
    return addAllHeaders(response, 'text/html', baseUrl);
}

/**
 * Build a response for non-HTML content
 * @param contentType The content type of the response
 * @param fileContent The content of the file
 * @param baseUrl The base URL of the request
 * @returns A response for non-HTML content
 */
export function buildContentResponse(contentType: string, fileContent: string, baseUrl: string): Response {
    const response = new Response(fileContent, {
        headers: {
            'Content-Length': fileContent.length.toString(),
        }
    });
    
    return addAllHeaders(response, contentType, baseUrl);
}

/**
 * Build a response for HEAD requests
 * @param contentType The content type of the response
 * @param contentLength The length of the content
 * @param baseUrl The base URL of the request
 * @returns A response for HEAD requests
 */
export function buildHeadResponse(contentType: string, contentLength: number, baseUrl: string): Response {
    const response = new Response(null, {
        headers: {
            'Content-Length': contentLength.toString(),
        }
    });
    
    return addAllHeaders(response, contentType, baseUrl);
}

/**
 * Build a response for OPTIONS requests
 * @param url The URL of the request
 * @returns A response with appropriate headers for OPTIONS requests
 */
export function buildOptionsResponse(url: URL): Response {
    const baseUrl = `${url.protocol}//${url.host}`;
    const linkHeader = generateLinkHeaders('', baseUrl);
    
    const response = new Response(null, {
        status: 204, // No Content
        headers: {
            'Allow': 'GET, HEAD, OPTIONS',
            'Vary': 'Accept',
            'Link': linkHeader,
            'Cache-Control': 'max-age=86400, public', // Cache OPTIONS responses for 24 hours
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
            'Access-Control-Max-Age': '86400' // 24 hours
        }
    });
    
    return response;
}

/**
 * Fetch content for a specific content type
 * @param contentType The content type to fetch
 * @param fetch The fetch function from SvelteKit
 * @returns The content and its length
 */
export async function fetchContent(contentType: string, fetch: Function): Promise<{ content: string, length: number }> {
    const filePath = CONTENT_TYPES[contentType].path;
    
    try {
        // Fetch the file from the static directory using SvelteKit's fetch
        const fileResponse = await fetch(filePath);
        
        if (!fileResponse.ok) {
            throw error(404, 'Resource not found');
        }
        
        // Get the file content
        const fileContent = await fileResponse.text();
        
        return {
            content: fileContent,
            length: fileContent.length
        };
    } catch (err) {
        console.error('Error serving file:', err);
        throw error(500, 'Internal Server Error');
    }
}
