import { promises as fs } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import { buildRdfResponse, buildNotFoundResponse } from '$lib/content-negotiation';

/**
 * Handle GET requests for JSON-LD data
 */
export const GET: RequestHandler = async () => {
    try {
        // Read the JSON-LD file from the static directory
        const filePath = join(process.cwd(), 'static', 'rdf', 'me.jsonld');
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Return the JSON-LD content with appropriate headers
        return buildRdfResponse('application/ld+json', content);
    } catch (error) {
        console.error('Error reading JSON-LD file:', error);
        return buildNotFoundResponse('JSON-LD file not found');
    }
};

/**
 * Handle HEAD requests for JSON-LD data
 */
export const HEAD: RequestHandler = async () => {
    try {
        // Read the JSON-LD file from the static directory
        const filePath = join(process.cwd(), 'static', 'rdf', 'me.jsonld');
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Return just the headers for the JSON-LD content
        const response = buildRdfResponse('application/ld+json', content);
        return new Response(null, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error reading JSON-LD file:', error);
        const response = buildNotFoundResponse('JSON-LD file not found');
        return new Response(null, {
            status: response.status,
            headers: response.headers
        });
    }
}; 