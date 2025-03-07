import type { RequestHandler } from './$types';

// Define types for our content type configurations
type RdfContentTypeConfig = {
    path: string;
    extension: string;
};

type HtmlContentTypeConfig = {
    isDefault: boolean;
};

type ContentTypeConfig = RdfContentTypeConfig | HtmlContentTypeConfig;

// Define supported content types and their file paths
const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
    'text/turtle': {
        path: '/rdf/me.ttl',
        extension: 'ttl'
    },
    'application/ld+json': {
        path: '/rdf/me.jsonld',
        extension: 'jsonld'
    },
    'text/html': {
        isDefault: true
    }
};

// Type guard to check if a config is an RDF config
function isRdfConfig(config: ContentTypeConfig): config is RdfContentTypeConfig {
    return 'path' in config;
}

// Generate common CORS headers for all responses
function getCorsHeaders(): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // Allow GET and OPTIONS methods
        'Access-Control-Allow-Headers': 'Accept, Content-Type', // Allow these headers in requests
        'Access-Control-Expose-Headers': 'Link, Content-Type, Vary', // Expose these headers to clients
        'Access-Control-Max-Age': '86400' // Cache preflight requests for 24 hours
    };
}

// Parse Accept header and determine the best content type to serve
function negotiateContentType(acceptHeader: string): string {
    if (!acceptHeader) {
        return 'text/html';
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

    // Find the first accepted type that we support
    for (const { type } of acceptedTypes) {
        // Check for exact match
        if (type in CONTENT_TYPES) {
            return type;
        }
        
        // Check for wildcard matches
        if (type === '*/*') {
            return 'text/html';
        }
        
        if (type === 'text/*' && 'text/turtle' in CONTENT_TYPES) {
            return 'text/turtle';
        }
        
        if (type === 'application/*' && 'application/ld+json' in CONTENT_TYPES) {
            return 'application/ld+json';
        }
    }

    // Default to HTML if no matches
    return 'text/html';
}

// Generate Link headers for content type alternatives
function generateLinkHeaders(excludeType?: string): string {
    return Object.entries(CONTENT_TYPES)
        .filter(([type, config]) => isRdfConfig(config) && type !== excludeType)
        .map(([type, config]) => {
            // We've already checked that this is an RDF config with the isRdfConfig guard
            const { path } = config as RdfContentTypeConfig;
            return `<${path}>; rel="alternate"; type="${type}"`;
        })
        .join(', ');
}

export const GET: RequestHandler = async ({ request, fetch }) => {
    const acceptHeader = request.headers.get('Accept') || '';
    const bestType = negotiateContentType(acceptHeader);
    
    // Common headers for all responses
    const commonHeaders = {
        'Vary': 'Accept',
        ...getCorsHeaders() // Add CORS headers to all responses
    };
    
    // If the negotiated type is not HTML, serve the appropriate RDF format
    const config = CONTENT_TYPES[bestType];
    if (bestType !== 'text/html' && isRdfConfig(config)) {
        const response = await fetch(config.path);
        
        if (!response.ok) {
            return new Response(`${bestType} data not found`, { 
                status: 404,
                headers: commonHeaders
            });
        }
        
        const content = await response.text();
        
        // Return the content with appropriate headers
        return new Response(content, {
            headers: {
                'Content-Type': `${bestType}; charset=utf-8`,
                'Link': generateLinkHeaders(bestType),
                ...commonHeaders
            }
        });
    }
    
    // For HTML requests, let SvelteKit handle the normal page rendering
    // but include Link headers to help HTML clients discover the alternative representations
    return new Response(null, {
        status: 200,
        headers: {
            'Link': generateLinkHeaders(),
            ...commonHeaders
        }
    });
};

// Add OPTIONS method to inform clients about available content types
export const OPTIONS: RequestHandler = async () => {
    const supportedTypes = Object.keys(CONTENT_TYPES).join(', ');
    
    return new Response(null, {
        headers: {
            'Allow': 'GET, OPTIONS',
            'Accept': supportedTypes,
            'Vary': 'Accept',
            'Link': generateLinkHeaders(),
            ...getCorsHeaders() // Add CORS headers to OPTIONS response
        }
    });
}; 