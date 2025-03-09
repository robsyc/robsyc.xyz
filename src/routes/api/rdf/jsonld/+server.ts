import type { RequestHandler } from './$types';
import { buildRdfResponse, buildNotFoundResponse } from '$lib/content-negotiation';
import { base } from '$app/paths';

/**
 * Handle GET requests for JSON-LD data
 */
export const GET: RequestHandler = async ({ fetch }) => {
    try {
        // Fetch the JSON-LD file from the static directory using fetch API
        // This works both locally and on Vercel
        const response = await fetch(`${base}/rdf/me.jsonld`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch JSON-LD file: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Return the JSON-LD content with appropriate headers
        return buildRdfResponse('application/ld+json', content);
    } catch (error) {
        console.error('Error fetching JSON-LD file:', error);
        return buildNotFoundResponse('JSON-LD file not found');
    }
};

/**
 * Handle HEAD requests for JSON-LD data
 */
export const HEAD: RequestHandler = async ({ fetch }) => {
    try {
        // Fetch the JSON-LD file from the static directory using fetch API
        const response = await fetch(`${base}/rdf/me.jsonld`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch JSON-LD file: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Return just the headers for the JSON-LD content
        const rdfResponse = buildRdfResponse('application/ld+json', content);
        return new Response(null, {
            status: rdfResponse.status,
            headers: rdfResponse.headers
        });
    } catch (error) {
        console.error('Error fetching JSON-LD file:', error);
        const notFoundResponse = buildNotFoundResponse('JSON-LD file not found');
        return new Response(null, {
            status: notFoundResponse.status,
            headers: notFoundResponse.headers
        });
    }
}; 