/**
 * Content negotiation configuration
 * Defines supported content types and their configurations
 */

// Define types for our content type configurations
export type RdfContentTypeConfig = {
    path: string;
    extension: string;
    maxAge?: number;
};

export type HtmlContentTypeConfig = {
    isDefault: boolean;
    maxAge?: number;
};

export type ContentTypeConfig = RdfContentTypeConfig | HtmlContentTypeConfig;

// Cache durations in seconds
export const CACHE_DURATIONS = {
    RDF: 3600,        // 1 hour for RDF content
    HTML: 0,          // No caching for HTML content
    OPTIONS: 86400,   // 24 hours for OPTIONS responses
    ERROR: 0          // No caching for error responses
};

// Define supported content types and their file paths
export const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
    'text/turtle': {
        path: '/rdf/me.ttl',
        extension: 'ttl',
        maxAge: CACHE_DURATIONS.RDF
    },
    'application/ld+json': {
        path: '/rdf/me.jsonld',
        extension: 'jsonld',
        maxAge: CACHE_DURATIONS.RDF
    },
    'text/html': {
        isDefault: true,
        maxAge: CACHE_DURATIONS.HTML
    }
};

// Type guard to check if a config is an RDF config
export function isRdfConfig(config: ContentTypeConfig): config is RdfContentTypeConfig {
    return 'path' in config;
}

// Get the default content type
export function getDefaultContentType(): string {
    for (const [type, config] of Object.entries(CONTENT_TYPES)) {
        if ('isDefault' in config && config.isDefault) {
            return type;
        }
    }
    return 'text/html'; // Fallback default
}

// Get all supported content types as a comma-separated string
export function getSupportedContentTypes(): string {
    return Object.keys(CONTENT_TYPES).join(', ');
}

// Get cache control header value based on max age
export function getCacheControlHeader(maxAge: number = 0): string {
    if (maxAge <= 0) {
        return 'public, max-age=0, must-revalidate';
    }
    return `public, max-age=${maxAge}`;
} 