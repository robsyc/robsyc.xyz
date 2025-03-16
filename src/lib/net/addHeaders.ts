import { CONTENT_TYPES } from './negotiation';

/**
 * Generate Link headers for content alternatives
 * @param currentType The current content type being served
 * @param baseUrl The base URL of the request
 * @returns A string containing the Link header value
 */
export function generateLinkHeaders(currentType: string, baseUrl: string): string {
    return Object.entries(CONTENT_TYPES)
        .filter(([type]) => type !== currentType) // Don't include the current type
        .map(([type, info]) => {
            return `<${baseUrl}${info.path}>; rel="${info.rel}"; type="${type}"`;
        })
        .join(', ');
}

/**
 * Add CORS headers to a response
 * @param response The response to add headers to
 * @returns The response with CORS headers
 */
export function addCorsHeaders(response: Response): Response {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    return response;
}

/**
 * Add standard headers to a response
 * @param response The response to add headers to
 * @param contentType The content type of the response
 * @returns The response with standard headers
 */
export function addStandardHeaders(response: Response, contentType: string): Response {
    response.headers.set('Content-Type', contentType);
    response.headers.set('Vary', 'Accept');
    return response;
}

/**
 * Add Link headers to a response
 * @param response The response to add headers to
 * @param contentType The content type of the response
 * @param baseUrl The base URL of the request
 * @returns The response with Link headers
 */
export function addLinkHeaders(response: Response, contentType: string, baseUrl: string): Response {
    const linkHeader = generateLinkHeaders(contentType, baseUrl);
    if (linkHeader) {
        response.headers.set('Link', linkHeader);
    }
    return response;
}

/**
 * Add all necessary headers to a response
 * @param response The response to add headers to
 * @param contentType The content type of the response
 * @param baseUrl The base URL of the request
 * @returns The response with all headers
 */
export function addAllHeaders(response: Response, contentType: string, baseUrl: string): Response {
    return addCorsHeaders(
        addLinkHeaders(
            addStandardHeaders(response, contentType),
            contentType,
            baseUrl
        )
    );
}
