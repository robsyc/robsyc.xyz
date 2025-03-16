/**
 * Content types supported by the application with their file paths and link relations
 */
export const CONTENT_TYPES: Record<string, {path: string, rel: string}> = {
    'text/turtle': {path: '/rdf/me.ttl', rel: 'alternate'},
    'application/ld+json': {path: '/rdf/me.jsonld', rel: 'alternate'},
    'text/html': {path: '/', rel: 'canonical'} // Default
};

/**
 * Negotiate the content type based on the Accept header
 * @param acceptHeader The Accept header from the request
 * @returns The negotiated content type
 */
export function negotiateContentType(acceptHeader: string): string {
    // Default to text/html if no Accept header is provided
    if (!acceptHeader) {
        return 'text/html';
    }
    
    // Parse the Accept header
    const acceptedTypes = parseAcceptHeader(acceptHeader);
    
    // Find the best match
    for (const type of acceptedTypes) {
        // Check for exact matches
        if (CONTENT_TYPES[type.mimeType]) {
            return type.mimeType;
        }
        
        // Handle type/* wildcards (e.g., text/*)
        const mainType = type.mimeType.split('/')[0];
        if (type.mimeType.endsWith('/*')) {
            // Find all matching content types that start with the main type
            const matches = Object.keys(CONTENT_TYPES).filter(ct => 
                ct.startsWith(`${mainType}/`));
            
            if (matches.length > 0) {
                return matches[0]; // Return the first match
            }
        }
        
        // Check for wildcard matches
        if (type.mimeType === '*/*') {
            return 'text/html'; // Default to HTML for wildcard
        }
    }
    
    // Default to HTML if no match is found
    return 'text/html';
}

/**
 * Parse the Accept header into a sorted array of accepted types
 * @param acceptHeader The Accept header from the request
 * @returns An array of accepted types sorted by quality
 */
export function parseAcceptHeader(acceptHeader: string): Array<{ mimeType: string, quality: number }> {
    return acceptHeader
        .split(',')
        .map(part => {
            const [mimeType, ...params] = part.trim().split(';');
            let quality = 1.0;
            
            // Extract quality factor if present
            const qParam = params.find(p => p.trim().startsWith('q='));
            if (qParam) {
                const qValue = parseFloat(qParam.split('=')[1]);
                if (!isNaN(qValue)) {
                    quality = qValue;
                }
            }
            
            return { mimeType: mimeType.trim(), quality };
        })
        .sort((a, b) => b.quality - a.quality); // Sort by quality (highest first)
}
