/**
 * Content negotiation configuration
 * Defines supported content types and their configurations
 */

// Define types for our content type configurations
export type RdfContentTypeConfig = {
    path: string;
    extension: string;
};

export type HtmlContentTypeConfig = {
    isDefault: boolean;
};

export type ContentTypeConfig = RdfContentTypeConfig | HtmlContentTypeConfig;

// Define supported content types and their file paths
export const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
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