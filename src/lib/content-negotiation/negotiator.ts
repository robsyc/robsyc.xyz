/**
 * Content negotiation utilities
 * Provides functions for negotiating content types based on Accept headers
 */

import { CONTENT_TYPES, getDefaultContentType } from './config';

/**
 * Parse Accept header and determine the best content type to serve
 * @param acceptHeader - The Accept header from the request
 * @returns The best matching content type
 */
export function negotiateContentType(acceptHeader: string): string {
    console.log('Negotiating content type for Accept header:', acceptHeader);
    
    if (!acceptHeader) {
        console.log('Empty Accept header, returning default type');
        return getDefaultContentType();
    }

    // Parse the Accept header into content types with their q-values
    const acceptedTypes = acceptHeader.split(',')
        .map(item => {
            const [type, ...params] = item.trim().split(';');
            // Default q-value is 1.0 if not specified
            const qParam = params.find(p => p.trim().startsWith('q='));
            const q = qParam ? parseFloat(qParam.split('=')[1]) : 1.0;
            return { type: type.trim(), q };
        })
        .sort((a, b) => b.q - a.q); // Sort by q-value, highest first
    
    console.log('Parsed accepted types:', acceptedTypes);

    // Find the first accepted type that we support
    for (const { type } of acceptedTypes) {
        console.log('Checking type:', type);
        
        // Check for exact match
        if (type in CONTENT_TYPES) {
            console.log('Found exact match:', type);
            return type;
        }
        
        // Check for wildcard matches
        if (type === '*/*') {
            console.log('Found wildcard match */*');
            return getDefaultContentType();
        }
        
        if (type === 'text/*' && 'text/turtle' in CONTENT_TYPES) {
            console.log('Found text/* wildcard match for text/turtle');
            return 'text/turtle';
        }
        
        if (type === 'application/*' && 'application/ld+json' in CONTENT_TYPES) {
            console.log('Found application/* wildcard match for application/ld+json');
            return 'application/ld+json';
        }
    }

    // Default to HTML if no matches
    console.log('No matches found, returning default type');
    return getDefaultContentType();
} 