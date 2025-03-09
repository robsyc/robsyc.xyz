import { promises as fs } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import { buildRdfResponse, buildNotFoundResponse } from '$lib/content-negotiation';

/**
 * Handle GET requests for Turtle data
 */
export const GET: RequestHandler = async () => {
    try {
        // Read the Turtle file from the static directory
        const filePath = join(process.cwd(), 'static', 'rdf', 'me.ttl');
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Return the Turtle content with appropriate headers
        return buildRdfResponse('text/turtle', content);
    } catch (error) {
        console.error('Error reading Turtle file:', error);
        return buildNotFoundResponse('Turtle file not found');
    }
};

/**
 * Handle HEAD requests for Turtle data
 */
export const HEAD: RequestHandler = async () => {
    try {
        // Read the Turtle file from the static directory
        const filePath = join(process.cwd(), 'static', 'rdf', 'me.ttl');
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Return just the headers for the Turtle content
        const response = buildRdfResponse('text/turtle', content);
        return new Response(null, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error reading Turtle file:', error);
        const response = buildNotFoundResponse('Turtle file not found');
        return new Response(null, {
            status: response.status,
            headers: response.headers
        });
    }
}; 