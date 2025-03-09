import type { RequestHandler } from './$types';
import { buildRdfResponse, buildNotFoundResponse } from '$lib/content-negotiation';
import { base } from '$app/paths';

/**
 * Handle GET requests for Turtle data
 */
export const GET: RequestHandler = async ({ fetch }) => {
    try {
        // Fetch the Turtle file from the static directory using fetch API
        const response = await fetch(`${base}/rdf/me.ttl`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Turtle file: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Return the Turtle content with appropriate headers
        return buildRdfResponse('text/turtle', content);
    } catch (error) {
        console.error('Error fetching Turtle file:', error);
        return buildNotFoundResponse('Turtle file not found');
    }
};

/**
 * Handle HEAD requests for Turtle data
 */
export const HEAD: RequestHandler = async ({ fetch }) => {
    try {
        // Fetch the Turtle file from the static directory using fetch API
        const response = await fetch(`${base}/rdf/me.ttl`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Turtle file: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Return just the headers for the Turtle content
        const rdfResponse = buildRdfResponse('text/turtle', content);
        return new Response(null, {
            status: rdfResponse.status,
            headers: rdfResponse.headers
        });
    } catch (error) {
        console.error('Error fetching Turtle file:', error);
        const notFoundResponse = buildNotFoundResponse('Turtle file not found');
        return new Response(null, {
            status: notFoundResponse.status,
            headers: notFoundResponse.headers
        });
    }
}; 